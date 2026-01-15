import Airtable from 'airtable'
import webpush from 'web-push'
import { sendPush } from '../../scripts/send-push.js' // adjust path for vercel

// Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

// VAPID
webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const WINDOWS = [
  { id: 'nightowl', start: '00:00', end: '04:30' },
  { id: 'early', start: '04:30', end: '10:00' },
  { id: 'midmorning', start: '10:00', end: '12:00' },
  { id: 'midday', start: '12:00', end: '15:00' },
  { id: 'evening', start: '15:00', end: '20:00' },
  { id: 'late', start: '20:00', end: '21:00' },
  { id: 'last', start: '21:00', end: '24:00' },
]

function getMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getCurrentLocalMinutes(tz) {
  const now = new Date().toLocaleString('en-GB', { timeZone: tz })
  const d = new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

function getNextWindow(tz) {
  const now = getCurrentLocalMinutes(tz)
  for (const w of WINDOWS) {
    if (now < getMinutes(w.start)) return w
  }
  return WINDOWS[0]
}

function isWindowOpeningNow(tz, window) {
  const now = getCurrentLocalMinutes(tz)
  const start = getMinutes(window.start)
  return now >= start && now < start + 5
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const subs = await base('PushSubscriptions').select().all()
  let pushed = 0

  for (const row of subs) {
    const sub = JSON.parse(row.get('SubscriptionJSON'))
    const tz = row.get('Timezone') || 'UTC'

    const next = getNextWindow(tz)

    if (isWindowOpeningNow(tz, next)) {
      await sendPush(sub, {
        title: 'New Check-In Window!',
        body: `Your ${next.id} window is now open.`,
      })
      pushed++
    }
  }

  res.status(200).json({ pushed })
}
