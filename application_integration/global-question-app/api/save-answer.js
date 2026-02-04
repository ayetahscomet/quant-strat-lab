// /api/save-answer.js (DEPRECATED)

export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Deprecated: use /api/log-attempt and /api/log-play (UserAnswers schema)',
  })
}
