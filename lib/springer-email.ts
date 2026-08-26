import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import nodemailer from 'nodemailer'
import type { EmailDelivery } from '@/lib/email'

export type SpringerOfferEmailData = {
  to: string
  customerName: string
  petName: string
  offerDate: string
  acceptUrl: string
}

function escapeHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatOfferDateLabel(offerDate: string): string {
  try {
    return format(parseISO(offerDate), 'EEEE, d. MMMM yyyy', { locale: de })
  } catch {
    return offerDate
  }
}

function getSmtpConfig() {
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
  }
}

export function buildSpringerOfferEmailSubject(offerDate: string): string {
  return `Freier Tagesbetreuungsplatz am ${formatOfferDateLabel(offerDate)}`
}

export function buildSpringerOfferEmailPlainText(data: SpringerOfferEmailData): string {
  const greetingName = data.customerName || 'zusammen'
  const dateLabel = formatOfferDateLabel(data.offerDate)

  return [
    `Hallo ${greetingName},`,
    '',
    `für ${data.petName} ist am ${dateLabel} ein Platz in der Tagesbetreuung frei geworden.`,
    'Wenn du den Platz annehmen möchtest, klicke auf den folgenden Link:',
    data.acceptUrl,
    '',
    'Herzliche Grüße',
    'Tamara und Gabriel',
    'tierisch gut betreut',
  ].join('\n')
}

export function buildSpringerOfferEmailHtml(data: SpringerOfferEmailData): string {
  const greetingName = data.customerName || 'zusammen'
  const dateLabel = formatOfferDateLabel(data.offerDate)

  return `
    <p>Hallo ${escapeHtml(greetingName)},</p>
    <p>für <strong>${escapeHtml(data.petName)}</strong> ist am <strong>${escapeHtml(dateLabel)}</strong> ein Platz in der Tagesbetreuung frei geworden.</p>
    <p>Wenn du den Platz annehmen möchtest, klicke auf den folgenden Link:</p>
    <p><a href="${escapeHtml(data.acceptUrl)}">Platz annehmen</a></p>
    <p>Herzliche Grüße<br>Tamara und Gabriel<br><strong>tierisch gut betreut</strong></p>
  `
}

export async function sendSpringerOfferEmail(data: SpringerOfferEmailData): Promise<EmailDelivery> {
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
      to: data.to,
      subject: buildSpringerOfferEmailSubject(data.offerDate),
      text: buildSpringerOfferEmailPlainText(data),
      html: buildSpringerOfferEmailHtml(data),
    })

    return { status: 'sent', error: null }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
    }
  }
}
