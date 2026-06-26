export const config = { runtime: 'edge' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  try {
    const incoming = await req.formData()
    const audio = incoming.get('audio')
    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: 'audio file is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY environment variable not set in Vercel project settings' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const outgoing = new FormData()
    outgoing.append('file', audio, audio.name)
    outgoing.append('model', 'whisper-1')

    const aiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outgoing,
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      throw new Error(`OpenAI API error ${aiResponse.status}: ${errText}`)
    }

    const result = (await aiResponse.json()) as { text?: string }

    return new Response(JSON.stringify({ text: result.text ?? '' }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
}
