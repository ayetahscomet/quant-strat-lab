// /src/push/registerPush.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push notifications are not supported in this browser.')
    return false
  }

  try {
    // 1) Register service worker
    const reg = await navigator.serviceWorker.register('/sw.js')

    // 2) Ask permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      alert('Notifications have been disabled.')
      return false
    }

    // 3) Fetch public VAPID key
    const vapidRes = await fetch('/api/webpush-key')
    const { publicKey } = await vapidRes.json()

    if (!publicKey) {
      console.error('❌ Missing VAPID public key.')
      return false
    }

    // 4) Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    // 5) Save subscription to server
    const saveRes = await fetch('/api/save-push-sub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub,
        timezone: getTimezone(),
      }),
    })

    if (!saveRes.ok) {
      console.error('❌ Failed to save push subscription')
      return false
    }

    return true
  } catch (err) {
    console.error('❌ registerPush error:', err)
    return false
  }
}
