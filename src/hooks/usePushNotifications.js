import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return
    // Check if already subscribed
    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [user])

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const { endpoint, keys } = sub.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: 'user_id,endpoint' })
      setSubscribed(true)
      setPermission(Notification.permission)
    } catch {
      // User denied or browser unsupported
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker?.ready
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
