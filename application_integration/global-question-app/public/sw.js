self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}

  const title = data.title || 'Akinto'
  const options = {
    body: data.body || '',
    icon: '/logo-800-full.png',
    badge: '/logo-800-full.png',
    data: data.url || '/',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data || '/'
  event.waitUntil(clients.openWindow(url))
})
