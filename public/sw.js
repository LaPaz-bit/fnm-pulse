self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'FNM Pulse'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.url || '/' },
  }
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Update PWA app icon badge count
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge().catch(() => {})
      }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.navigate(url)
      } else {
        clients.openWindow(url)
      }
    })
  )
})

// Clear badge when app gains focus
self.addEventListener('message', (event) => {
  if (event.data === 'clear-badge' && 'clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {})
  }
})
