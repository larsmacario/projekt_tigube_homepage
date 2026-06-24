import nodemailer from 'nodemailer'
import { getResendClient, getResendFrom, isResendConfigured } from '@/lib/resend-client'

export type LeadEmailData = {
  name: string
  vorname?: string | null
  email: string
  phone: string
  pet?: string | null
  service: string
  message: string
  availability: string
  anzahlTiere?: string | null
  tiernamen?: string | null
  schulferienBW?: boolean | null
  konkreterUrlaub?: string | null
  urlaubVon?: string | null
  urlaubBis?: string | null
  intaktKastriert?: string | null
  alter?: string | null
}

export type EmailDelivery = {
  status: 'sent' | 'failed'
  error: string | null
}

export type LeadEmailDeliveries = {
  internal: EmailDelivery
  confirmation: EmailDelivery
}

export type EmailTransport = 'resend' | 'smtp'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from: string
  to: string
}

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password) {
    throw new Error('SMTP-Konfiguration ist unvollständig')
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user,
    password,
    from: process.env.SMTP_FROM || 'info@tierischgutbetreut.de',
    to: process.env.SMTP_TO || 'info@tierischgutbetreut.de',
  }
}

function escapeHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function toHtml(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function serviceLabel(service: string): string {
  const labels: Record<string, string> = {
    hundepension: 'Hundepension',
    katzenbetreuung: 'Mobile Katzenbetreuung',
    tagesbetreuung: 'Tagesbetreuung',
    notfallbetreuung: 'Notfallbetreuung',
  }

  return labels[service] || service
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-DE')
}

function optionalInternalDetails(data: LeadEmailData): string {
  const details = [
    ['Tier', data.pet],
    ['Anzahl Tiere', data.anzahlTiere],
    ['Tiernamen', data.tiernamen],
    ['Alter', data.alter],
    ['Intakt/Kastriert', data.intaktKastriert],
    ['Schulferien Baden-Württemberg', data.schulferienBW === null || data.schulferienBW === undefined ? null : data.schulferienBW ? 'Ja' : 'Nein'],
    ['Konkreter Urlaub geplant', data.konkreterUrlaub],
    ['Urlaub von', formatDate(data.urlaubVon)],
    ['Urlaub bis', formatDate(data.urlaubBis)],
  ].filter(([, value]) => value)

  if (details.length === 0) return ''

  return `<h3>Tier- und Betreuungsdetails</h3><ul>${details
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${toHtml(String(value))}</li>`)
    .join('')}</ul>`
}

function internalText(data: LeadEmailData): string {
  return [
    'Neue Lead-Anfrage',
    '',
    `Name: ${data.vorname || ''} ${data.name}`.trim(),
    `E-Mail: ${data.email}`,
    `Telefon: ${data.phone}`,
    `Leistung: ${serviceLabel(data.service)}`,
    data.pet ? `Tier: ${data.pet}` : null,
    data.anzahlTiere ? `Anzahl Tiere: ${data.anzahlTiere}` : null,
    data.tiernamen ? `Tiernamen: ${data.tiernamen}` : null,
    data.alter ? `Alter: ${data.alter}` : null,
    data.intaktKastriert ? `Intakt/Kastriert: ${data.intaktKastriert}` : null,
    data.schulferienBW === null || data.schulferienBW === undefined
      ? null
      : `Schulferien Baden-Württemberg: ${data.schulferienBW ? 'Ja' : 'Nein'}`,
    data.konkreterUrlaub ? `Konkreter Urlaub geplant: ${data.konkreterUrlaub}` : null,
    formatDate(data.urlaubVon) ? `Urlaub von: ${formatDate(data.urlaubVon)}` : null,
    formatDate(data.urlaubBis) ? `Urlaub bis: ${formatDate(data.urlaubBis)}` : null,
    '',
    'Nachricht:',
    data.message,
    '',
    'Beste Erreichbarkeit:',
    data.availability,
  ].filter((line) => line !== null).join('\n')
}

async function sendViaResend(options: SendEmailOptions): Promise<EmailDelivery> {
  try {
    const resend = getResendClient()
    const { error } = await resend.emails.send({
      from: getResendFrom(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    })

    if (error) {
      return { status: 'failed', error: error.message }
    }

    return { status: 'sent', error: null }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen',
    }
  }
}

async function sendViaSmtp(options: SendEmailOptions): Promise<EmailDelivery> {
  try {
    const config = getSmtpConfig()
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    })

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    return { status: 'sent', error: null }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen',
    }
  }
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<EmailDelivery & { transport: EmailTransport }> {
  if (isResendConfigured()) {
    const resendResult = await sendViaResend(options)
    if (resendResult.status === 'sent') {
      return { ...resendResult, transport: 'resend' }
    }

    const smtpResult = await sendViaSmtp(options)
    if (smtpResult.status === 'sent') {
      return { ...smtpResult, transport: 'smtp' }
    }

    return {
      status: 'failed',
      error: `Resend: ${resendResult.error}; SMTP: ${smtpResult.error}`,
      transport: 'smtp',
    }
  }

  const smtpResult = await sendViaSmtp(options)
  return { ...smtpResult, transport: 'smtp' }
}

export async function sendOnboardingEmail(data: { email: string; name: string; onboardingUrl: string }): Promise<EmailDelivery> {
  const result = await sendEmail({
    to: data.email,
    subject: 'Dein Zugang zum Kundenportal von tierisch gut betreut',
    text: `Hallo ${data.name},\n\nwillkommen bei tierisch gut betreut. Über diesen Link kannst du dein Kundenkonto einrichten:\n${data.onboardingUrl}\n\nDer Link ist sieben Tage gültig.\n\nHerzliche Grüße\nTamara und Gabriel`,
    html: `<p>Hallo ${escapeHtml(data.name)},</p><p>willkommen bei tierisch gut betreut. Über diesen Link kannst du dein Kundenkonto einrichten:</p><p><a href="${escapeHtml(data.onboardingUrl)}">Kundenkonto einrichten</a></p><p>Der Link ist sieben Tage gültig.</p><p>Herzliche Grüße<br>Tamara und Gabriel</p>`,
  })

  return { status: result.status, error: result.error }
}

export async function sendLeadEmails(data: LeadEmailData): Promise<LeadEmailDeliveries> {
  const fullName = [data.vorname, data.name].filter(Boolean).join(' ')
  const service = serviceLabel(data.service)

  let internalTo: string
  try {
    internalTo = getSmtpConfig().to
  } catch {
    internalTo = process.env.SMTP_TO || 'info@tierischgutbetreut.de'
  }

  const internal = await sendEmail({
    to: internalTo,
    replyTo: data.email,
    subject: `Neue Lead-Anfrage: ${fullName || data.email}`,
    text: internalText(data),
    html: `
        <h2>Neue Lead-Anfrage</h2>
        <h3>Kontaktdaten</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(fullName)}</li>
          <li><strong>E-Mail:</strong> ${escapeHtml(data.email)}</li>
          <li><strong>Telefon:</strong> ${escapeHtml(data.phone)}</li>
          <li><strong>Gewünschte Leistung:</strong> ${escapeHtml(service)}</li>
        </ul>
        ${optionalInternalDetails(data)}
        <h3>Nachricht</h3>
        <p>${toHtml(data.message)}</p>
        <h3>Beste Erreichbarkeit</h3>
        <p>${toHtml(data.availability)}</p>
      `,
  })

  const confirmation = await sendEmail({
    to: data.email,
    subject: 'Deine Anfrage bei tierisch gut betreut GmbH',
    text: [
      `Hallo${fullName ? ` ${fullName}` : ''},`,
      '',
      'vielen Dank für Deine Anfrage. Wir haben sie erhalten und melden uns so schnell wie möglich bei Dir.',
      '',
      'Zusammenfassung Deiner Anfrage:',
      `Leistung: ${service}`,
      `Nachricht: ${data.message}`,
      `Beste Erreichbarkeit: ${data.availability}`,
      '',
      'Herzliche Grüße',
      'Tamara und Gabriel von tierisch gut betreut GmbH',
    ].join('\n'),
    html: `
        <p>Hallo${fullName ? ` ${escapeHtml(fullName)}` : ''},</p>
        <p>vielen Dank für Deine Anfrage. Wir haben sie erhalten und melden uns so schnell wie möglich bei Dir.</p>
        <h3>Zusammenfassung Deiner Anfrage</h3>
        <ul>
          <li><strong>Leistung:</strong> ${escapeHtml(service)}</li>
          <li><strong>Nachricht:</strong> ${toHtml(data.message)}</li>
          <li><strong>Beste Erreichbarkeit:</strong> ${toHtml(data.availability)}</li>
        </ul>
        <p>Herzliche Grüße<br>Tamara und Gabriel von tierisch gut betreut GmbH</p>
      `,
  })

  return {
    internal: { status: internal.status, error: internal.error },
    confirmation: { status: confirmation.status, error: confirmation.error },
  }
}

export async function sendTestEmail(): Promise<EmailDelivery & { transport: EmailTransport; to: string }> {
  const to = process.env.RESEND_TEST_TO?.trim() || 'dev@tigube.de'

  const result = await sendEmail({
    to,
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
    text: 'Congrats on sending your first email!',
  })

  return { ...result, to }
}
