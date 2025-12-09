self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Akinto', {
      body: data.body || 'Your attempts have refreshed!',
      icon: '/logo-800-full.svg',
    }),
  )
})
