// Supabase Edge Function: admin-reset-password
// Only callable by a logged-in user whose app_metadata.b777_admin === true.
// Resets ANY user's password to a freshly generated temp password and returns it.
// Deploy: Dashboard -> Edge Functions -> Deploy new function -> name it exactly: admin-reset-password
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
}
function genPassword() {
  // 10 chars, avoids ambiguous look-alikes
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Not authenticated' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller and check they are an admin
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData?.user) return json({ error: 'Not authenticated' }, 401)
    if (callerData.user.app_metadata?.b777_admin !== true) return json({ error: 'Forbidden — admin only' }, 403)

    const { user_id, new_password } = await req.json()
    if (!user_id) return json({ error: 'Missing user_id' }, 400)

    const admin = createClient(url, serviceKey)
    const pw = (new_password && String(new_password).length >= 6) ? String(new_password) : genPassword()
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: pw })
    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, new_password: pw })
  } catch (_e) {
    return json({ error: 'Bad request' }, 400)
  }
})
