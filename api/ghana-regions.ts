export const config = { runtime: 'edge' }

// Fetched server-side so there are no CORS restrictions.
// The Edge function caches the response for 24 hours via Vercel CDN.
const SOURCES = [
  'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/GHA/ADM1/geoBoundaries-GHA-ADM1.geojson',
  'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_GHA_1.json',
]

export default async function handler(): Promise<Response> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const body = await res.text()
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      })
    } catch {
      // try next source
    }
  }
  return new Response(JSON.stringify({ error: 'All sources failed' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  })
}
