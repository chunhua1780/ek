// Supabase Edge Function: admin-reset-password
// Only callable by a logged-in user whose app_metadata.b777_admin === true.
// Resets a user's password to 123456 (or an admin-supplied password) and
// flags the account so the user is forced to set their own password on next sign-in.
// Deploy: Dashboard -> Edge Functions -> Deploy new function -> name it exactly: admin-reset-password
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
}
const DEFAULT_TEMP_PASSWORD = '123456'

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
    const pw = (new_password && String(new_password).length >= 6) ? String(new_password) : DEFAULT_TEMP_PASSWORD
    const { error } = await admin.auth.admin.updateUserById(user_id, {
      password: pw,
      user_metadata: { must_change_password: true },
    })
    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, new_password: pw })
  } catch (_e) {
    return json({ error: 'Bad request' }, 400)
  }
})
