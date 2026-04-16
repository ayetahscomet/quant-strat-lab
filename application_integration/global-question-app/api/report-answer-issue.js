// /api/report-answer-issue.js

import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const picked = pickDateKey(req)
    const fallbackDateKey = picked?.dateKey || ''

    const {
      userId,
      dateKey,
      questionText,
      userCountry,
      source,
      summaryType,
      disputedAnswer,
      suggestedAnswer,
      furtherComments,
      windowId,
      correctAnswersSnapshot,
      userAnswersSnapshot,
    } = req.body || {}

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    const hasMeaningfulContent = !!(
      String(disputedAnswer || '').trim() ||
      String(suggestedAnswer || '').trim() ||
      String(furtherComments || '').trim()
    )

    if (!hasMeaningfulContent) {
      return res.status(400).json({ error: 'No report content provided' })
    }

    await base('UserReportedErrors').create([
      {
        fields: {
          UserID: String(userId),
          DateKey: String(dateKey || fallbackDateKey || ''),
          QuestionText: String(questionText || '').slice(0, 500),
          UserCountry: String(userCountry || 'xx'),
          Source: String(source || ''),
          SummaryType: String(summaryType || 'unknown'),
          DisputedAnswer: String(disputedAnswer || '').slice(0, 500),
          SuggestedAnswer: String(suggestedAnswer || '').slice(0, 500),
          FurtherComments: String(furtherComments || ''),
          CreatedAt: new Date().toISOString(),
          Status: 'new',
          WindowID: String(windowId || ''),
          CorrectAnswersSnapshot: JSON.stringify(
            Array.isArray(correctAnswersSnapshot) ? correctAnswersSnapshot : [],
          ),
          UserAnswersSnapshot: JSON.stringify(
            Array.isArray(userAnswersSnapshot) ? userAnswersSnapshot : [],
          ),
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('report-answer-issue error:', err)
    return res.status(500).json({ error: 'Failed to report answer issue' })
  }
}
