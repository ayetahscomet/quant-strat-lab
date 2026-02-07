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
  event.waitUntil(clients.openWindow('/play'))
})
