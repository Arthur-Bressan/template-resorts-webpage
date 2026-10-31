export type TransactionalEmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  /** Property identity shown to the recipient. */
  fromName?: string
  replyTo?: string
}

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'provider_error' | 'provider_unavailable' }

/** Small shared Resend transport. Callers should never log message secrets. */
export async function sendTransactionalEmail(
  message: TransactionalEmailMessage,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const configuredFrom = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !configuredFrom) return { sent: false, reason: 'not_configured' }

  // Resend's configured, verified sender is always used. A tenant can supply
  // its display name and reply-to without replacing that verified address.
  const address = configuredFrom.match(/<([^<>]+)>/)?.[1]?.trim() || configuredFrom
  const safeAddress = address.replace(/[\r\n]/g, '')
  const safeName = message.fromName?.replace(/[\r\n<>]/g, '').trim()
  const from = safeName
    ? `${safeName} <${safeAddress}>`
    : configuredFrom

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    })
    return response.ok
      ? { sent: true }
      : { sent: false, reason: 'provider_error' }
  } catch {
    return { sent: false, reason: 'provider_unavailable' }
  }
}
