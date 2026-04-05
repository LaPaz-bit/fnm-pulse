import { supabase } from '@/lib/supabase'

/**
 * Trigger a push notification for a user via the Supabase Edge Function.
 * Fire-and-forget — callers don't need to await this.
 */
export async function sendPushNotification(userId, title, body, url = '/') {
  try {
    await supabase.functions.invoke('send-push', {
      body: { userId, title, body, url },
    })
  } catch {
    // Non-critical — silently fail if push isn't configured
  }
}
