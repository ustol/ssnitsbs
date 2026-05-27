import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITEMAP_URL = 'https://mrh.gov.gh/wp-sitemap-posts-portfolio-1.xml'
const BATCH_SIZE = 8
const FETCH_TIMEOUT_MS = 20_000

// ─── HTML decode (handles named + numeric entities) ────────────────────────────

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Page structure (confirmed from live page inspection)
//
// Title:  <h2 class="separator_off" style="...">PROJECT TITLE HERE</h2>
//
// Fields: <h5><span style="color: #ffffff;">Contractor: <strong style="color: #ff9900;"> VALUE</strong></span></h5>
//         <h6><span style="color: #ffffff;">Start Date: <strong style="color: #ff9900;">VALUE</strong></span></h6>
//
// Agency+Region share one h5:
//         <h5><span ...>Agency: <strong ...> GHA </strong></span> <span ...>Region: <strong ...> Upper West</strong></span></h5>

function extractTitle(html: string): string {
  // h2 with class "separator_off" — unique to the project hero section
  const m = html.match(/<h2[^>]*class="separator_off"[^>]*>\s*([^<]+)\s*<\/h2>/i)
  if (m) return decodeHtml(m[1])
  // Fallback: first h2
  const h2 = html.match(/<h2[^>]*>\s*([^<]+)\s*<\/h2>/i)
  if (h2) return decodeHtml(h2[1])
  return 'Unknown Project'
}

function extractField(html: string, label: string): string | null {
  // Pattern: "Label: <strong style="color: #ff9900;"> VALUE </strong>"
  // The value is always in the orange <strong> tag immediately after the label
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(
    `${escaped}[:\\s]*<strong[^>]*>#ff9900[^>]*>\\s*([^<]+?)\\s*<\\/strong>`,
    'i',
  )
  const m = html.match(regex)
  if (!m) return null

  const val = decodeHtml(m[1])
  // Treat "N/A" or empty as null
  if (!val || val.toLowerCase() === 'n/a' || val === '-') return null
  return val
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
    exp_completion_date: extractField(html, 'Exp. Completion Date'),
    current_progress: extractField(html, 'Current Progress'),
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

    // 1 — Fetch sitemap
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
        if (results[j]) projects.push(results[j]!)
        else failed.push(batch[j])
      }

      if (i + BATCH_SIZE < urls.length) {
        await new Promise(r => setTimeout(r, 400))
      }
    }

    console.log(`Scraped ${projects.length} OK, ${failed.length} failed`)
    if (projects.length === 0) throw new Error('All project pages failed to load')

    // 3 — Replace table (delete all, re-insert)
    const { error: delErr } = await supabase
      .from('big_push_projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (delErr) throw delErr

    const { error: insErr } = await supabase
      .from('big_push_projects')
      .insert(projects)

    if (insErr) throw insErr

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

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
