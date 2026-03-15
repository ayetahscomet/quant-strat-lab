import { base } from '../lib/airtable.js'

function renderPage({ title, body, muted = '', isError = false }) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Akinto</title>
      </head>
      <body style="margin:0;background:#f3f3f3;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111111;">
        <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;box-sizing:border-box;text-align:center;">
          <div style="max-width:640px;width:100%;">
            <img
              src="https://akinto.io/logo-800-full.svg"
              alt="Akinto"
              width="120"
              height="120"
              style="display:block;margin:0 auto 28px;width:120px;height:120px;"
            />

            <h1 style="margin:0 0 16px;font-size:40px;line-height:1.08;font-weight:800;letter-spacing:-0.02em;color:${isError ? '#9a1b1b' : '#111111'};">
              ${title}
            </h1>

            <p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#222222;">
              ${body}
            </p>

            ${
              muted
                ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#7a7a7a;">${muted}</p>`
                : ''
            }

            <div style="height:30px;"></div>

            <a
              href="https://akinto.io"
              style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;line-height:1;padding:16px 24px;border-radius:14px;"
            >
              Back to Akinto
            </a>
          </div>
        </main>
      </body>
    </html>
  `
}

function escapeAirtableString(value) {
  return String(value).replace(/'/g, "\\'")
}

export default async function handler(req, res) {
  try {
    const token = req.query?.token

    if (!token) {
      return res
        .status(400)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(
          renderPage({
            title: 'Invalid unsubscribe link',
            body: 'This link is missing the token required to manage your reminders.',
            muted: 'You can return to Akinto and enable reminders again whenever you like.',
            isError: true,
          }),
        )
    }

    const records = await base('EmailSubscriptions')
      .select({
        filterByFormula: `{UnsubToken} = '${escapeAirtableString(token)}'`,
      })
      .firstPage()

    if (!records.length) {
      return res
        .status(400)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(
          renderPage({
            title: 'This link is no longer valid',
            body: 'We could not find an active reminder subscription for this unsubscribe link.',
            muted: 'If needed, you can enable reminders again from Akinto.',
            isError: true,
          }),
        )
    }

    await base('EmailSubscriptions').update(records[0].id, {
      Status: 'unsubscribed',
    })

    return res
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(
        renderPage({
          title: 'You have now been unsubscribed',
          body: 'Akinto email reminders have been turned off for this address.',
          muted: 'You can enable them again any time from the lockout screen.',
        }),
      )
  } catch (err) {
    console.error('[UNSUBSCRIBE] error:', err)

    return res
      .status(500)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(
        renderPage({
          title: 'Something went wrong',
          body: 'We could not update your email reminder preference just now.',
          muted: 'Please try the link again in a moment.',
          isError: true,
        }),
      )
  }
}
