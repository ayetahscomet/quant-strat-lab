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

  // ----------------------------
  // GDPR gate
  // ----------------------------
  if (!hasPushConsent()) {
    console.log('[PUSH] blocked — no GDPR consent')
    return false
  }

  // ----------------------------
  // Browser support
  // ----------------------------
  if (!('serviceWorker' in navigator)) {
    console.warn('[PUSH] Service workers unsupported')
    return false
  }

  if (!('PushManager' in window)) {
    console.warn('[PUSH] PushManager unsupported')
    return false
  }

  try {
    // ----------------------------
    // Register / reuse SW
    // ----------------------------
    const reg =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register('/sw.js'))

    await navigator.serviceWorker.ready

    console.log('[PUSH] service worker ready')

    // ----------------------------
    // Existing subscription?
    // ----------------------------
    const existing = await reg.pushManager.getSubscription()

    if (existing) {
      console.log('[PUSH] already subscribed')
      localStorage.setItem('akinto_push_enabled', 'true')
      return true
    }

    // ----------------------------
    // Ask permission
    // ----------------------------
    const permission = await Notification.requestPermission()

    console.log('[PUSH] permission:', permission)

    if (permission !== 'granted') {
      return false
    }

    // ----------------------------
    // Fetch VAPID key
    // ----------------------------
    const vapidRes = await fetch('/api/webpush-key')

    if (!vapidRes.ok) {
      console.error('[PUSH] vapid fetch failed', vapidRes.status)
      return false
    }

    const { publicKey } = await vapidRes.json()

    if (!publicKey) {
      console.error('[PUSH] missing VAPID key')
      return false
    }

    // ----------------------------
    // Subscribe
    // ----------------------------
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    console.log('[PUSH] subscribed:', sub.endpoint)

    // ----------------------------
    // Persist to backend
    // ----------------------------
    const saveRes = await fetch('/api/save-push-sub', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
