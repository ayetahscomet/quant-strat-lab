// /api/email-window-open.js

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatWindowRange(win) {
  return `${escapeHtml(win.start)} – ${escapeHtml(win.end)}`
}

export default async function handler(req, res) {
  const trace = []

  function mark(step, extra = {}) {
    trace.push({ step, ...extra })
  }

  try {
    mark('handler-start')

    const isCron = req.headers['x-vercel-cron'] === '1'
    const headerSecret = req.headers['authorization']
    const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`
    const isAuthorised = isCron || headerSecret === expected || querySecret === expected

    mark('auth-checked', {
      isCron,
      hasHeaderSecret: !!headerSecret,
      hasQuerySecret: !!querySecret,
      expectedPresent: !!process.env.CRON_SECRET,
      isAuthorised,
    })

    if (!isAuthorised) {
      return res.status(403).json({
        ok: false,
        stage: 'auth',
        error: 'Forbidden',
        trace,
      })
    }

    if (String(req.query?.ping || '').toLowerCase() === 'true') {
      mark('ping-success')
      return res.status(200).json({
        ok: true,
        stage: 'ping',
        trace,
      })
    }

    mark('before-imports')

    let base
    let WINDOWS
    let dateKeyToday
    let Resend

    try {
      const airtableMod = await import('../lib/airtable.js')
      base = airtableMod.base
      mark('import-airtable-success')
    } catch (err) {
      return res.status(500).json({
        ok: false,
        stage: 'import-airtable',
        error: err?.message || String(err),
        stack: err?.stack || null,
        trace,
      })
    }

    try {
      const windowsMod = await import('../lib/windows.js')
      WINDOWS = windowsMod.WINDOWS
      mark('import-windows-success', {
        windowsCount: Array.isArray(WINDOWS) ? WINDOWS.length : null,
      })
    } catch (err) {
      return res.status(500).json({
        ok: false,
        stage: 'import-windows',
        error: err?.message || String(err),
        stack: err?.stack || null,
        trace,
      })
    }

    try {
      const dateKeyMod = await import('../lib/dateKey.js')
      dateKeyToday = dateKeyMod.dateKeyToday
      mark('import-datekey-success')
    } catch (err) {
      return res.status(500).json({
        ok: false,
        stage: 'import-datekey',
        error: err?.message || String(err),
        stack: err?.stack || null,
        trace,
      })
    }

    try {
      const resendMod = await import('resend')
      Resend = resendMod.Resend
      mark('import-resend-success')
    } catch (err) {
      return res.status(500).json({
        ok: false,
        stage: 'import-resend',
        error: err?.message || String(err),
        stack: err?.stack || null,
        trace,
      })
    }

    mark('imports-complete', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
      hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
    })

    if (String(req.query?.checkEnv || '').toLowerCase() === 'true') {
      return res.status(200).json({
        ok: true,
        stage: 'check-env',
        env: {
          CRON_SECRET: !!process.env.CRON_SECRET,
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
          AIRTABLE_API_KEY: !!process.env.AIRTABLE_API_KEY,
          AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
        },
        trace,
      })
    }

    function getLocalTime(tz) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date())

      const hour = Number(parts.find((p) => p.type === 'hour')?.value)
      const minute = Number(parts.find((p) => p.type === 'minute')?.value)

      return { hour, minute }
    }

    function hhmmToMinutes(hhmm) {
      const [h, m] = String(hhmm || '00:00')
        .split(':')
        .map(Number)

      return (Number(h) || 0) * 60 + (Number(m) || 0)
    }

    const dryRun = String(req.query?.dryRun || '').toLowerCase() === 'true'
    const onlyEmail = String(req.query?.onlyEmail || '')
      .trim()
      .toLowerCase()

    mark('before-airtable-select', { dryRun, onlyEmail: onlyEmail || null })

    let records
    try {
      records = await base('EmailSubscriptions')
        .select({
          filterByFormula: `{Status} = 'active'`,
        })
        .all()

      mark('airtable-select-success', { recordsCount: records.length })
    } catch (err) {
      return res.status(500).json({
        ok: false,
        stage: 'airtable-select',
        error: err?.message || String(err),
        stack: err?.stack || null,
        trace,
      })
    }

    if (String(req.query?.listOnly || '').toLowerCase() === 'true') {
      return res.status(200).json({
        ok: true,
        stage: 'list-only',
        recordsCount: records.length,
        emails: records.map((r) => r.get('Email')).filter(Boolean),
        trace,
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    let sent = 0
    const wouldSend = []
    const skipped = []
    const GRACE_MINS = 6

    for (const r of records) {
      try {
        const email = String(r.get('Email') || '')
          .trim()
          .toLowerCase()

        if (!email) {
          skipped.push({ id: r.id, reason: 'missing-email' })
          continue
        }

        if (onlyEmail && email !== onlyEmail) {
          skipped.push({ id: r.id, email, reason: 'not-target-email' })
          continue
        }

        const tz = r.get('Timezone') || 'UTC'
        const unsubToken = r.get('UnsubToken')
        const lastFailedWindow = r.get('LastFailedWindowId')
        const lastFailedDateKey = r.get('LastFailedDateKey')

        const { hour, minute } = getLocalTime(tz)
        const nowMins = hour * 60 + minute

        const win = WINDOWS.find((w) => {
          const startMins = hhmmToMinutes(w.start)
          const diff = nowMins - startMins
          return diff >= 0 && diff < GRACE_MINS
        })

        if (!win) {
          skipped.push({ id: r.id, email, reason: 'no-window-open', tz, hour, minute })
          continue
        }

        const todayKey = dateKeyToday(tz)
        const currentIndex = WINDOWS.findIndex((w) => w.id === win.id)
        const prevWindow =
          currentIndex === 0 ? WINDOWS[WINDOWS.length - 1] : WINDOWS[currentIndex - 1]

        if (lastFailedWindow !== prevWindow.id || lastFailedDateKey !== todayKey) {
          skipped.push({
            id: r.id,
            email,
            reason: 'previous-window-not-failed',
            expectedPrevWindow: prevWindow.id,
            actualLastFailedWindow: lastFailedWindow,
            expectedDateKey: todayKey,
            actualLastFailedDateKey: lastFailedDateKey,
          })
          continue
        }

        const alreadySentDateKey = r.get('LastSentDateKey')
        const alreadySentWindowId = r.get('LastSentWindowId')

        if (alreadySentDateKey === todayKey && alreadySentWindowId === win.id) {
          skipped.push({
            id: r.id,
            email,
            reason: 'already-sent',
            todayKey,
            winId: win.id,
          })
          continue
        }

        const playUrl = `https://akinto.io/play?window=${win.id}`
        const unsubscribeUrl = `https://akinto.io/api/unsubscribe?token=${unsubToken}`

        if (dryRun) {
          wouldSend.push({
            id: r.id,
            email,
            tz,
            todayKey,
            windowId: win.id,
            previousWindowId: prevWindow.id,
            playUrl,
            unsubscribeUrl,
          })
          continue
        }

        await resend.emails.send({
          from: 'Akinto <notifications@akinto.io>',
          to: email,
          subject: `Akinto · A new window has opened`,
          html: `
            <div style="margin:0;padding:0;background:#f3f3f3;">
              <div style="width:100%;padding:48px 20px 56px;box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;text-align:center;color:#111111;">
                
                <img
                  src="https://akinto.io/logo-800-full.svg"
                  alt="Akinto"
                  width="120"
                  height="120"
                  style="display:block;margin:0 auto 28px;width:120px;height:120px;"
                />

                <h1 style="margin:0 0 16px;font-size:40px;line-height:1.08;font-weight:800;letter-spacing:-0.02em;">
                  A new window has opened
                </h1>

                <p style="margin:0 0 26px;font-size:18px;line-height:1.5;font-weight:400;color:#222222;">
                  Give it another shot.
                </p>

                <p style="margin:0 0 10px;font-size:14px;line-height:1.4;color:#7a7a7a;">
                  Live now:
                </p>

                <div style="margin:0 0 8px;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.02em;color:#111111;">
                  ${formatWindowRange(win)}
                </div>

                <p style="margin:0 0 34px;font-size:15px;line-height:1.45;color:#6f6f6f;">
                  ${escapeHtml(win.label)}
                </p>

                <a
                  href="${playUrl}"
                  style="display:inline-block;background:#f2bd34;color:#111111;text-decoration:none;font-size:18px;font-weight:600;line-height:1;padding:18px 30px;border-radius:14px;border:1px solid #d8a10d;"
                >
                  Play now
                </a>

                <div style="height:28px;"></div>

                <p style="margin:0;font-size:11px;line-height:1.5;color:#8a8a8a;">
                  You’re receiving this because you enabled Akinto email reminders.
                </p>

                <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#8a8a8a;">
                  <a href="${unsubscribeUrl}" style="color:#8a8a8a;text-decoration:underline;">
                    Unsubscribe
                  </a>
                </p>
              </div>
            </div>
          `,
        })

        await base('EmailSubscriptions').update(r.id, {
          LastSentDateKey: todayKey,
          LastSentWindowId: win.id,
          LastSentAt: new Date().toISOString(),
          LastFailedWindowId: null,
          LastFailedDateKey: null,
        })

        sent++
      } catch (err) {
        skipped.push({
          id: r.id,
          reason: 'row-error',
          error: err?.message || String(err),
        })
      }
    }

    mark('handler-complete', {
      sent,
      wouldSendCount: wouldSend.length,
      skippedCount: skipped.length,
    })

    return res.status(200).json({
      ok: true,
      dryRun,
      sent,
      wouldSendCount: wouldSend.length,
      wouldSend,
      skippedCount: skipped.length,
      skipped,
      trace,
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      stage: 'outer-catch',
      error: err?.message || String(err),
      stack: err?.stack || null,
      trace,
    })
  }
}
