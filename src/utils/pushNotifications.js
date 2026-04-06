import { supabase } from '@/lib/supabase'

// Track recent sends to prevent spam (keyed by userId)
const recentSends = new Map()
const RATE_LIMIT_MS = 5000 // max one push per user per 5 seconds

/**
 * Trigger a push notification for a user via the Supabase Edge Function.
 * Fire-and-forget — callers don't need to await this.
 * Rate-limited to prevent notification spam.
 */
export async function sendPushNotification(userId, title, body, url = '/') {
  const now = Date.now()
  const lastSent = recentSends.get(userId) || 0
  if (now - lastSent < RATE_LIMIT_MS) return

  recentSends.set(userId, now)

  try {
    await supabase.functions.invoke('send-push', {
      body: { userId, title, body, url },
    })
  } catch {
    // Non-critical — silently fail if push isn't configured
  }
}
