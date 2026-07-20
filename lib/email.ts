import fs from 'node:fs'
import path from 'node:path'
import nodemailer from 'nodemailer'

const LEAD_CONFIRMATION_BANNER_CID = 'lead-confirmation-banner'
const LEAD_CONFIRMATION_BANNER_ALT =
  'tigube - tigube bringt Tierhalter:innen und Betreuungspersonen zusammen'

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
  ferienKonflikt?: boolean
}

export type EmailDelivery = {
  status: 'sent' | 'failed'
  error: string | null
}

export type LeadEmailDeliveries = {
  internal: EmailDelivery
  confirmation: EmailDelivery
}

export async function sendOnboardingEmail(data: { email: string; name: string; onboardingUrl: string }): Promise<EmailDelivery> {
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
      to: data.email,
      subject: 'Dein Zugang zum Kundenportal von tierisch gut betreut',
      text: `Hallo ${data.name},\n\nwillkommen bei tierisch gut betreut. Über diesen Link kannst du dein Kundenkonto einrichten:\n${data.onboardingUrl}\n\nDer Link ist sieben Tage gültig.\n\nHerzliche Grüße\nTamara und Gabriel`,
      html: `<p>Hallo ${escapeHtml(data.name)},</p><p>willkommen bei tierisch gut betreut. Über diesen Link kannst du dein Kundenkonto einrichten:</p><p><a href="${escapeHtml(data.onboardingUrl)}">Kundenkonto einrichten</a></p><p>Der Link ist sieben Tage gültig.</p><p>Herzliche Grüße<br>Tamara und Gabriel</p>`,
    })
    return { status: 'sent', error: null }
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'Interner SMTP-Fehler' }
  }
}

export async function sendAdminInvitationEmail(data: { email: string; name: string; invitationUrl: string }): Promise<EmailDelivery> {
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
      to: data.email,
      subject: 'Einladung zur Adminverwaltung von tierisch gut betreut',
      text: `Hallo ${data.name},\n\ndu wurdest als Administrator für tierisch gut betreut eingeladen. Über diesen Link kannst du dein Admin-Konto einrichten:\n${data.invitationUrl}\n\nHerzliche Grüße\nTamara und Gabriel`,
      html: `<p>Hallo ${escapeHtml(data.name)},</p><p>du wurdest als Administrator für tierisch gut betreut eingeladen. Über diesen Link kannst du dein Admin-Konto einrichten:</p><p><a href="${escapeHtml(data.invitationUrl)}">Admin-Konto einrichten</a></p><p>Herzliche Grüße<br>Tamara und Gabriel</p>`,
    })
    return { status: 'sent', error: null }
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'Interner SMTP-Fehler' }
  }
}


export async function sendContractEmail(data: { 
  email: string; 
  name: string; 
  pdfBuffer: Buffer; 
  fileName: string;
}): Promise<EmailDelivery> {
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
      to: [data.email, config.to], // An den Kunden und an das Admin-Team
      subject: 'Dein unterzeichneter Pflegevertrag - tierisch gut betreut',
      text: `Hallo ${data.name},\n\nvielen Dank für das Ausfüllen deiner Daten und die Unterzeichnung des Pflegevertrags.\n\nIm Anhang findest du deinen unterzeichneten Pflegevertrag als PDF-Dokument für deine Unterlagen.\n\nHerzliche Grüße\nTamara und Gabriel\ntierisch gut betreut`,
      html: `<p>Hallo ${escapeHtml(data.name)},</p><p>vielen Dank für das Ausfüllen deiner Daten und die Unterzeichnung des Pflegevertrags.</p><p>Im Anhang findest du deinen unterzeichneten Pflegevertrag als PDF-Dokument für deine Unterlagen.</p><p>Herzliche Grüße<br>Tamara und Gabriel<br><strong>tierisch gut betreut</strong></p>`,
      attachments: [
        {
          filename: data.fileName,
          content: data.pdfBuffer,
          contentType: 'application/pdf',
        }
      ]
    })
    return { status: 'sent', error: null }
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'Interner SMTP-Fehler' }
  }
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
    hundepension: 'Urlaubsbetreuung',
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

function getLeadConfirmationBannerAttachment() {
  const filePath = path.join(process.cwd(), 'public/images/email-banner-kontakt.jpeg')

  return {
    filename: 'email-banner-kontakt.jpeg',
    content: fs.readFileSync(filePath),
    cid: LEAD_CONFIRMATION_BANNER_CID,
    contentDisposition: 'inline' as const,
    contentType: 'image/jpeg',
  }
}

function leadConfirmationBannerHtml(): string {
  return `<p style="margin-top:24px;"><img src="cid:${LEAD_CONFIRMATION_BANNER_CID}" alt="${escapeHtml(LEAD_CONFIRMATION_BANNER_ALT)}" width="600" style="max-width:100%;height:auto;display:block;" /></p>`
}

function internalText(data: LeadEmailData): string {
  return [
    data.ferienKonflikt
      ? 'Lead-Anfrage – an tigube.de weitergeleitet (Betriebsferien-Konflikt)'
      : 'Neue Lead-Anfrage',
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

export async function sendLeadEmails(data: LeadEmailData): Promise<LeadEmailDeliveries> {
  let config: SmtpConfig

  try {
    config = getSmtpConfig()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMTP-Konfiguration ist ungültig'
    return {
      internal: { status: 'failed', error: message },
      confirmation: { status: 'failed', error: message },
    }
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  })

  const fullName = [data.vorname, data.name].filter(Boolean).join(' ')
  const service = serviceLabel(data.service)
  const internalSubject = data.ferienKonflikt
    ? `Weitergeleitet an tigube.de: ${fullName || data.email}`
    : `Neue Lead-Anfrage: ${fullName || data.email}`
  const internalHeading = data.ferienKonflikt
    ? 'Lead-Anfrage – an tigube.de weitergeleitet'
    : 'Neue Lead-Anfrage'
  const conflictNotice = data.ferienKonflikt
    ? '<p><strong>Hinweis:</strong> Der Lead hat angegeben, dass der Betreuungszeitraum in die Betriebsferien fällt. Es wurde kein Bestätigungsmail versendet.</p>'
    : ''

  const internal = await transporter
    .sendMail({
      from: config.from,
      to: config.to,
      replyTo: data.email,
      subject: internalSubject,
      text: internalText(data),
      html: `
        <h2>${internalHeading}</h2>
        ${conflictNotice}
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
    .then((): EmailDelivery => ({ status: 'sent', error: null }))
    .catch((error: unknown): EmailDelivery => ({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
    }))

  if (data.ferienKonflikt) {
    return {
      internal,
      confirmation: { status: 'sent', error: null },
    }
  }

  const confirmation = await transporter
    .sendMail({
      from: config.from,
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
        ${leadConfirmationBannerHtml()}
      `,
      attachments: [getLeadConfirmationBannerAttachment()],
    })
    .then((): EmailDelivery => ({ status: 'sent', error: null }))
    .catch((error: unknown): EmailDelivery => ({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
    }))

  return { internal, confirmation }
}

export type NewsletterEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  previewText?: string
  unsubscribeUrl?: string
  listUnsubscribeUrl?: string
}

export function createSmtpTransporter() {
  const config = getSmtpConfig()
  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    }),
  }
}

export type TransactionalContactEmailOptions = {
  to: string
  subject: string
  text: string
  replyTo?: string
}

export type TransactionalContactEmailResult = EmailDelivery & {
  messageId: string | null
}

function generateMessageId(): string {
  const domain = process.env.SMTP_FROM?.split('@')[1] || 'tierischgutbetreut.de'
  return `<${crypto.randomUUID()}@${domain}>`
}

export async function sendTransactionalContactEmail(
  options: TransactionalContactEmailOptions
): Promise<TransactionalContactEmailResult> {
  const messageId = generateMessageId()
  const signature = '\n\nHerzliche Grüße\nTamara und Gabriel · tierisch gut betreut GmbH'
  const textBody = `${options.text.trim()}${signature}`

  try {
    const { config, transporter } = createSmtpTransporter()

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      replyTo: options.replyTo || config.from,
      subject: options.subject.trim(),
      text: textBody,
      html: `<p>${toHtml(options.text.trim())}</p><p>Herzliche Grüße<br>Tamara und Gabriel · tierisch gut betreut GmbH</p>`,
      headers: {
        'Message-ID': messageId,
      },
    })

    return { status: 'sent', error: null, messageId }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
      messageId: null,
    }
  }
}

export type VaccinationReminderEmailData = {
  email: string
  customerName: string
  petName: string
  vaccinationLabel: string
  dueDateLabel: string
  daysBefore: 28 | 14
  portalUrl: string
}

export async function sendVaccinationReminderEmail(
  data: VaccinationReminderEmailData
): Promise<EmailDelivery> {
  try {
    const config = getSmtpConfig()
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    })

    const greetingName = data.customerName || 'Tierhalter/in'
    const weeksLabel = data.daysBefore === 28 ? '4 Wochen' : '2 Wochen'
    const subject = `Impf-Erinnerung für ${data.petName}: ${data.vaccinationLabel}`

    const text = [
      `Hallo ${greetingName},`,
      '',
      `in ${weeksLabel} ist die ${data.vaccinationLabel} für ${data.petName} fällig (${data.dueDateLabel}).`,
      'Bitte vereinbare rechtzeitig einen Termin beim Tierarzt und aktualisiere danach die Impfdaten im Kundenportal.',
      '',
      `Portal: ${data.portalUrl}`,
      '',
      'Herzliche Grüße',
      'Tamara und Gabriel',
      'tierisch gut betreut',
    ].join('\n')

    const html = `
      <p>Hallo ${escapeHtml(greetingName)},</p>
      <p>in <strong>${escapeHtml(weeksLabel)}</strong> ist die <strong>${escapeHtml(data.vaccinationLabel)}</strong> für <strong>${escapeHtml(data.petName)}</strong> fällig (${escapeHtml(data.dueDateLabel)}).</p>
      <p>Bitte vereinbare rechtzeitig einen Termin beim Tierarzt und aktualisiere danach die Impfdaten im Kundenportal.</p>
      <p><a href="${escapeHtml(data.portalUrl)}">Impfdaten im Portal aktualisieren</a></p>
      <p>Herzliche Grüße<br>Tamara und Gabriel<br><strong>tierisch gut betreut</strong></p>
    `

    await transporter.sendMail({
      from: config.from,
      to: data.email,
      subject,
      text,
      html,
    })

    return { status: 'sent', error: null }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
    }
  }
}

export async function sendNewsletterEmail(options: NewsletterEmailOptions): Promise<EmailDelivery> {
  try {
    const { config, transporter } = createSmtpTransporter()
    const headers: Record<string, string> = {}

    if (options.listUnsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${options.listUnsubscribeUrl}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      headers,
    })

    return { status: 'sent', error: null }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Interner SMTP-Fehler',
    }
  }
}
