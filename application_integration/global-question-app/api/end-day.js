// /api/end-day.js (MVP-safe: no KV dependency)

export default async function handler(req, res) {
  return res.status(200).json({ ok: true })
}
