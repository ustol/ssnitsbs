import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITEMAP_URL = 'https://mrh.gov.gh/wp-sitemap-posts-portfolio-1.xml'
const BATCH_SIZE = 8
const FETCH_TIMEOUT_MS = 20_000

// ─── HTML parsing helpers ──────────────────────────────────────────────────────

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extracts a field value from the page HTML.
 * Tries table (th→td), definition list (dt→dd), and bold label patterns.
 */
function extractField(html: string, ...labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/\./g, '\\.')

    // th → td
    const table = new RegExp(
      `<th[^>]*>\\s*${escaped}\\s*:?\\s*</th>\\s*<td[^>]*>\\s*([^<]+)`,
      'is',
    )
    const tm = html.match(table)
    if (tm) return decodeHtml(tm[1])

    // dt → dd
    const dl = new RegExp(
      `<dt[^>]*>\\s*${escaped}\\s*:?\\s*</dt>\\s*<dd[^>]*>\\s*([^<]+)`,
      'is',
    )
    const dm = html.match(dl)
    if (dm) return decodeHtml(dm[1])

    // <strong>Label:</strong> value  or  <b>Label:</b> value
    const bold = new RegExp(
      `<(?:strong|b)[^>]*>\\s*${escaped}\\s*:?\\s*</(?:strong|b)>\\s*:?\\s*([^<\\n]+)`,
      'is',
    )
    const bm = html.match(bold)
    if (bm) return decodeHtml(bm[1])

    // Label: value  (plain text in a paragraph/td)
    const plain = new RegExp(`${escaped}\\s*:\\s*([^\\n<]+)`, 'i')
    const pm = html.match(plain)
    if (pm) return decodeHtml(pm[1])
  }
  return null
}

function extractTitle(html: string): string {
  // Prefer entry-title / page-title class
  const cls = html.match(/<h[12][^>]*class="[^"]*(?:entry|page)-title[^"]*"[^>]*>([^<]+)</i)
  if (cls) return decodeHtml(cls[1])

  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1) return decodeHtml(h1[1])

  const title = html.match(/<title>([^<|–-]+)/i)
  if (title) return decodeHtml(title[1])

  return 'Unknown Project'
}

// ─── Fetch with timeout ────────────────────────────────────────────────────────

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ─── Scrape one project page ───────────────────────────────────────────────────

interface ProjectRecord {
  title: string
  contractor: string | null
  contract_sum: string | null
  start_date: string | null
  exp_completion_date: string | null
  current_progress: string | null
  agency: string | null
  region: string | null
  source_url: string
}

async function scrapeProject(url: string): Promise<ProjectRecord | null> {
  const html = await fetchText(url, FETCH_TIMEOUT_MS)
  if (!html) return null

  return {
    title: extractTitle(html),
    contractor: extractField(html, 'Contractor'),
    contract_sum: extractField(html, 'Contract Sum'),
    start_date: extractField(html, 'Start Date'),
    exp_completion_date: extractField(html, 'Exp. Completion Date', 'Completion Date', 'Expected Completion'),
    current_progress: extractField(html, 'Current Progress', 'Progress'),
    agency: extractField(html, 'Agency'),
    region: extractField(html, 'Region'),
    source_url: url,
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1 — Fetch sitemap to get all Big Push project URLs
    console.log('Fetching sitemap…')
    const sitemapXml = await fetchText(SITEMAP_URL, 10_000)
    if (!sitemapXml) throw new Error('Failed to fetch sitemap from mrh.gov.gh')

    const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1].trim())
      .filter(url => url.includes('big-push-projects'))

    if (urls.length === 0) throw new Error('No Big Push project URLs found in sitemap')
    console.log(`Found ${urls.length} project URLs`)

    // 2 — Scrape all pages in batches
    const projects: ProjectRecord[] = []
    const failed: string[] = []

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(url => scrapeProject(url)))

      for (let j = 0; j < results.length; j++) {
        if (results[j]) {
          projects.push(results[j]!)
        } else {
          failed.push(batch[j])
        }
      }

      // Brief pause between batches — polite to the server
      if (i + BATCH_SIZE < urls.length) {
        await new Promise(r => setTimeout(r, 400))
      }
    }

    console.log(`Scraped ${projects.length} projects, ${failed.length} failed`)
    if (projects.length === 0) throw new Error('All project pages failed to load')

    // 3 — Replace table contents atomically
    //     Delete existing rows, then insert fresh data
    const { error: delErr } = await supabase
      .from('big_push_projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // match-all trick

    if (delErr) throw delErr

    const { error: insErr } = await supabase
      .from('big_push_projects')
      .insert(projects)

    if (insErr) throw insErr

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`Done in ${elapsed}s`)

    return new Response(
      JSON.stringify({
        success: true,
        total_urls: urls.length,
        inserted: projects.length,
        failed_count: failed.length,
        failed_urls: failed,
        elapsed_seconds: Number(elapsed),
        synced_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('sync-big-push error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
