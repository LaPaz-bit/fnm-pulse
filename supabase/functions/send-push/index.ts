import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { userId, title, body, url } = await req.json()

  webpush.setVapidDetails(
    'mailto:' + Deno.env.get('VAPID_EMAIL'),
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  const payload = JSON.stringify({ title, body, url })
  const sends = (subs ?? []).map((sub) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    ).catch(() => null)
  )

  await Promise.all(sends)
  return new Response(JSON.stringify({ sent: sends.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
