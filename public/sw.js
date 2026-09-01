const DEFAULT_NOTIFICATION = {
  title: 'KOVA Control',
  body: 'hola, compraron una kova',
  url: '/',
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = DEFAULT_NOTIFICATION

  if (event.data) {
    try {
      payload = { ...DEFAULT_NOTIFICATION, ...event.data.json() }
    } catch {
      payload = { ...DEFAULT_NOTIFICATION, body: event.data.text() }
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/assets/kova-pwa-192.webp',
      badge: '/assets/kova-pwa-192.webp',
      tag: 'kova-sale-notification',
      renotify: true,
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url ?? '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(self.location.origin))
      if (existingClient) {
        await existingClient.focus()
        return
      }
      await self.clients.openWindow(targetUrl)
    }),
  )
})
