// /api/save-subscription.js (DEPRECATED — DO NOT USE)

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Deprecated endpoint. Use /api/save-push-sub instead.',
  })
}
