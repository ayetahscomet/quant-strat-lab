// /public/sw.js

self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Akinto.io', body: 'Check-in is open!' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/push-icon.png',
      badge: data.badge || '/push-badge.png',
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
