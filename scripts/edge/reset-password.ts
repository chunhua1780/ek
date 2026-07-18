// Supabase Edge Function: reset-password
// Verifies the two security answers and sets a new password.
// Deploy: Dashboard -> Edge Functions -> Deploy new function -> name it exactly: reset-password
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
}
async function ansHash(s: string) {
  const norm = 'b777|' + s.trim().toLowerCase().replace(/\s+/g, ' ')
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm))
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email, a1, a2, new_password } = await req.json()
    if (!email || !a1 || !a2 || !new_password || String(new_password).length < 6) {
      return json({ error: 'Missing or invalid fields' })
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: prof } = await admin
      .from('b777_profiles')
      .select('user_id,q1_hash,q2_hash')
      .eq('email', String(email).trim().toLowerCase())
      .maybeSingle()
    const fail = () => json({ error: 'Details do not match our records.' })
    if (!prof || !prof.q1_hash || !prof.q2_hash) return fail()
    if ((await ansHash(a1)) !== prof.q1_hash || (await ansHash(a2)) !== prof.q2_hash) return fail()
    const { error } = await admin.auth.admin.updateUserById(prof.user_id, { password: new_password })
    if (error) return json({ error: error.message })
    return json({ ok: true })
  } catch (_e) {
    return json({ error: 'Bad request' })
  }
})
