export async function registerPush() {
  // Basic browser support checks
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push notifications are not supported in this browser.')
    return false
  }

  // Register your service worker
  const reg = await navigator.serviceWorker.register('/sw.js')

  // Fetch VAPID public key from backend
  const vapidRes = await fetch('/api/webpush-key')
  const { publicKey } = await vapidRes.json()

  // Subscribe to push notifications
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  // Send subscription + timezone to backend
  const saveRes = await fetch('/api/save-push-sub', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sub, // <-- IMPORTANT: must be "sub"
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // <-- NEW
    }),
  })

  if (saveRes.ok) {
    alert('Notifications enabled!')
    return true
  } else {
    alert('Error enabling notifications.')
    return false
  }
}

// Base64 → UInt8Array helper
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
