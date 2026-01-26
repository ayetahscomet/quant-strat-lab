import { kv } from '@vercel/kv'

export default async function handler(req, res) {
  const { userId, dateKey, result } = req.body

  const key = `akinto_day_${userId}_${dateKey}`

  await kv.set(key, {
    dayEnded: true,
    dayEndResult: result,
    endedAt: Date.now(),
  })

  res.status(200).json({ ok: true })
}
