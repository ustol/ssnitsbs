export const config = { runtime: 'edge' }

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  const debug = new URL(req.url).searchParams.has('debug')

  // ── Strategy 1: geoBoundaries API ─────────────────────────────────────────
  // The API returns the exact current download URL for the GeoJSON.
  // Server-side fetch — no CORS restrictions.
  let s1Status = 'not tried'
  try {
    const metaRes = await fetch('https://www.geoboundaries.org/api/current/gbOpen/GHA/ADM1/')
    s1Status = `meta=${metaRes.status}`
    if (metaRes.ok) {
      const meta = await metaRes.json() as Record<string, unknown>
      const dlUrl = (meta['gjDownloadURL'] ?? meta['downloadURL'] ?? meta['simplifiedGeometryRandomSelectionDownloadURL']) as string | undefined
      s1Status += ` dlUrl=${dlUrl ?? 'not found'}`
      if (dlUrl) {
        const body = await tryFetch(dlUrl)
        if (body && body.length > 1000) {
          if (debug) return new Response(JSON.stringify({ strategy: 1, dlUrl, bodyLen: body.length }), { headers: { 'Content-Type': 'application/json' } })
          return new Response(body, { headers: CACHE_HEADERS })
        }
        s1Status += ` bodyLen=${body?.length ?? 0}`
      }
    }
  } catch (e) {
    s1Status = `error: ${String(e)}`
  }

  // ── Strategy 2: direct raw.githubusercontent.com URL ──────────────────────
  const s2url = 'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/GHA/ADM1/geoBoundaries-GHA-ADM1.geojson'
  const s2 = await tryFetch(s2url)
  if (s2 && s2.length > 1000) {
    if (debug) return new Response(JSON.stringify({ strategy: 2, bodyLen: s2.length }), { headers: { 'Content-Type': 'application/json' } })
    return new Response(s2, { headers: CACHE_HEADERS })
  }

  // ── Strategy 3: GADM v4.1 ─────────────────────────────────────────────────
  const s3url = 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_GHA_1.json'
  const s3 = await tryFetch(s3url)
  if (s3 && s3.length > 1000) {
    if (debug) return new Response(JSON.stringify({ strategy: 3, bodyLen: s3.length }), { headers: { 'Content-Type': 'application/json' } })
    return new Response(s3, { headers: CACHE_HEADERS })
  }

  // All failed — return diagnostic info
  return new Response(
    JSON.stringify({
      error: 'All sources failed',
      s1: s1Status,
      s2: `len=${s2?.length ?? 0}`,
      s3: `len=${s3?.length ?? 0}`,
    }),
    { status: 502, headers: { 'Content-Type': 'application/json' } },
  )
}
