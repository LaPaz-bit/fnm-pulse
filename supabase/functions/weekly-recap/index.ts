import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @deno-types="npm:@types/web-push"
import webpush from 'npm:web-push'

/**
 * Weekly recap push notification.
 * Schedule via Supabase Dashboard → Edge Functions → Schedules (cron: 0 9 * * 1)
 */
serve(async () => {
  webpush.setVapidDetails(
    'mailto:' + Deno.env.get('VAPID_EMAIL'),
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Get total new posts this week
  const { count: weeklyPosts } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

  const title = 'FNM Pulse Weekly Recap 💪'
  const body = `${weeklyPosts ?? 0} posts from your community this week. Keep the momentum going!`
  const payload = JSON.stringify({ title, body, url: '/' })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  let sent = 0
  for (const sub of subs ?? []) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    ).then(() => sent++).catch(() => null)
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
