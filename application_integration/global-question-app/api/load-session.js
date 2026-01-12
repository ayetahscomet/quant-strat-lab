// /api/load-session.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    // For v1, always return empty so UI generates fresh session
    return res.status(200).json({ state: null })
  } catch (err) {
    console.error('load-session error:', err)
    return res.status(500).json({ error: 'Failed to load session' })
  }
}
