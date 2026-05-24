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
    const { prompt } = (await req.json()) as { prompt?: string }
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable not set in Vercel project settings' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: `You are the official memo writer for the Special Business Support (SBS) Team at SSNIT (Social Security and National Insurance Trust), Ghana. You write formal internal memorandums addressed to the DDG, Operations and Benefits. Your memos are precise, cite exact figures from the data provided, reference specific partnerships and meetings by name, and maintain a formal executive tone appropriate for SSNIT senior management. Never use filler phrases. Write in clear declarative sentences. When asked to write a memo, output ONLY the memo body — no commentary, no meta-text before or after.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      throw new Error(`Anthropic API error ${aiResponse.status}: ${errText}`)
    }

    const result = (await aiResponse.json()) as { content?: Array<{ type: string; text: string }> }
    const summary = result.content?.find(c => c.type === 'text')?.text ?? 'Unable to generate summary.'

    return new Response(JSON.stringify({ summary }), {
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
