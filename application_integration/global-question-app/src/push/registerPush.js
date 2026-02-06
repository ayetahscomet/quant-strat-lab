// src/push/registerPush.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function hasPushConsent() {
  return localStorage.getItem('akinto_consent') === 'true'
}

export async function registerPush() {
  console.log('[PUSH] registerPush() start')

  if (!hasPushConsent()) {
    console.log('[PUSH] blocked — no GDPR consent')
    return false
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PUSH] not supported in browser')
    return false
  }

  try {
    // ensure SW is active
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register('/sw.js'))

    await navigator.serviceWorker.ready

    console.log('[PUSH] service worker ready')

    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      console.log('[PUSH] already subscribed')
      return true
    }

    const permission = await Notification.requestPermission()
    console.log('[PUSH] permission:', permission)

    if (permission !== 'granted') return false

    const vapidRes = await fetch('/api/webpush-key')
    const { publicKey } = await vapidRes.json()

    if (!publicKey) {
      console.error('[PUSH] missing VAPID key')
      return false
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    console.log('[PUSH] subscribed:', sub.endpoint)

    const saveRes = await fetch('/api/save-push-sub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub,
        timezone: getTimezone(),
      }),
    })

    if (!saveRes.ok) {
      console.error('[PUSH] save failed', await saveRes.text())
      return false
    }

    localStorage.setItem('akinto_push_enabled', 'true')

    console.log('[PUSH] saved to backend')

    return true
  } catch (err) {
    console.error('[PUSH] fatal error', err)
    return false
  }
}
