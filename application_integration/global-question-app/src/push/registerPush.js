// src/push/registerPush.js

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

/* ======================================
   GDPR Gate
====================================== */
function hasPushConsent() {
  const consent = localStorage.getItem('akinto_consent')
  return consent === 'true'
}

/* ======================================
   Main registration
====================================== */
export async function registerPush() {
  // ---- Consent check FIRST ----
  if (!hasPushConsent()) {
    console.log('🔕 Push skipped — no consent')
    return false
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported')
    return false
  }

  try {
    // 1) Register SW (or reuse)
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register('/sw.js'))

    // 2) Already subscribed?
    const existingSub = await reg.pushManager.getSubscription()
    if (existingSub) {
      console.log('📬 Push already registered')
      return true
    }

    // 3) Ask permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('🔕 Notification permission denied')
      return false
    }

    // 4) Fetch public VAPID key
    const vapidRes = await fetch('/api/webpush-key')
    const { publicKey } = await vapidRes.json()

    if (!publicKey) {
      console.error('❌ Missing VAPID public key.')
      return false
    }

    // 5) Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    // persist local flag
    localStorage.setItem('akinto_push_enabled', 'true')

    // 6) Save to server
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
