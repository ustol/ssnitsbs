export const config = { runtime: 'edge' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error: missing Supabase credentials' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { surname, first_name, other_names, phone, email, password, role } =
      (await req.json()) as {
        surname: string
        first_name: string
        other_names?: string
        phone?: string
        email: string
        password: string
        role?: string
      }

    if (!email || !password || !first_name || !surname) {
      return new Response(JSON.stringify({ error: 'surname, first_name, email and password are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const full_name = [first_name, other_names, surname].filter(Boolean).join(' ')

    // Create auth user via Supabase Admin API
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.json() as { msg?: string; message?: string }
      return new Response(JSON.stringify({ error: err.msg ?? err.message ?? 'Failed to create user' }), {
        status: createRes.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { id: userId } = (await createRes.json()) as { id: string }

    // Upsert profile with all fields (trigger may have already created a partial row)
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: userId,
        email,
        full_name,
        surname,
        first_name,
        other_names: other_names || null,
        phone: phone || null,
        role: role ?? 'viewer',
      }),
    })

    return new Response(JSON.stringify({ id: userId, email, full_name }), {
      status: 201, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
}
