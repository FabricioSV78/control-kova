export const TEST_NOTIFICATION_INTERVAL_MS = 2 * 60 * 1000
export const TEST_NOTIFICATION_BODY = 'hola, compraron una kova'

export function supportsKovaNotifications() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export async function registerKovaServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
}

export async function requestKovaNotificationPermission() {
  if (!supportsKovaNotifications()) return 'unsupported' as const
  return Notification.requestPermission()
}

export async function showKovaTestNotification() {
  if (!supportsKovaNotifications()) {
    throw new Error('Este navegador no admite notificaciones web.')
  }
  if (Notification.permission !== 'granted') {
    throw new Error('KOVA no tiene permiso para mostrar notificaciones.')
  }

  const registration = (await registerKovaServiceWorker()) ?? (await navigator.serviceWorker.ready)
  await registration.showNotification('KOVA Control', {
    body: TEST_NOTIFICATION_BODY,
    icon: '/assets/kova-pwa-192.webp',
    badge: '/assets/kova-pwa-192.webp',
    tag: 'kova-sale-notification',
    data: { url: '/' },
  })
}
