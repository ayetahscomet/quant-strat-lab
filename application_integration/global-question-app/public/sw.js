// /public/sw.js

self.addEventListener('push', function (event) {
  let payload = {}

  try {
    payload = event.data.json()
  } catch {
    payload = {}
  }

  const title = payload.title || 'Akinto.io'
  const body = payload.body || 'Check-in is open!'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon || '/push-icon.png',
      badge: payload.badge || '/push-badge.png',

      // ✅ REQUIRED so notificationclick can route correctly
      data: {
        url: payload.url || '/play',
      },
    }),
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification?.data?.url || '/play'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    }),
  )
})
