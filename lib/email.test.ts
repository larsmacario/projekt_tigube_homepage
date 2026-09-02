import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn(async () => ({ messageId: 'test-id' }))
  const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }))
  return { mockSendMail, mockCreateTransport }
})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}))

import { sendLeadEmails } from '@/lib/email'
import { DEFAULT_WAITLIST_CMS } from '@/lib/waitlist-defaults'

const BANNER_CID = 'lead-confirmation-banner'
const BANNER_PATH = path.join(process.cwd(), 'public/images/email-banner-kontakt.jpeg')

const baseLead = {
  name: 'Mustermann',
  vorname: 'Max',
  email: 'max@example.com',
  phone: '0123456789',
  service: 'katzenbetreuung',
  pet: 'Katze',
  message: 'Testnachricht',
  availability: 'morgens',
}

type MailOptions = {
  to: string
  html?: string
  attachments?: Array<{
    cid?: string
    contentType?: string
    content?: Buffer
  }>
}

function getConfirmationMail(): MailOptions | undefined {
  return mockSendMail.mock.calls
    .map(([opts]) => opts as MailOptions)
    .find((opts) => opts.to === baseLead.email)
}

function expectBannerInMail(mail: MailOptions) {
  expect(mail.html).toContain(`src="cid:${BANNER_CID}"`)
  expect(mail.html).toContain('width="600"')
  expect(mail.attachments).toHaveLength(1)

  const attachment = mail.attachments![0]
  expect(attachment.cid).toBe(BANNER_CID)
  expect(attachment.contentType).toBe('image/jpeg')
  expect(attachment.content?.length).toBeGreaterThan(0)
  expect(attachment.content?.equals(fs.readFileSync(BANNER_PATH))).toBe(true)
}

describe('sendLeadEmails – Banner in Bestätigungsmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear()
    mockCreateTransport.mockClear()

    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASSWORD = 'secret'
    process.env.SMTP_FROM = 'info@tierischgutbetreut.de'
    process.env.SMTP_TO = 'info@tierischgutbetreut.de'
  })

  it('bindet Banner in Wartelisten-Bestätigung ein', async () => {
    const result = await sendLeadEmails({
      ...baseLead,
      waitlistMode: true,
      waitlistTexts: DEFAULT_WAITLIST_CMS,
    })

    expect(result.internal.status).toBe('sent')
    expect(result.confirmation.status).toBe('sent')
    expect(mockSendMail).toHaveBeenCalledTimes(2)

    const confirmation = getConfirmationMail()
    expect(confirmation).toBeDefined()
    expect(confirmation?.html).toContain(DEFAULT_WAITLIST_CMS.emailIntro.slice(0, 40))
    expectBannerInMail(confirmation!)
  })

  it('bindet Banner in normale Lead-Bestätigung ein', async () => {
    const result = await sendLeadEmails({
      ...baseLead,
      waitlistMode: false,
    })

    expect(result.internal.status).toBe('sent')
    expect(result.confirmation.status).toBe('sent')
    expect(mockSendMail).toHaveBeenCalledTimes(2)

    const confirmation = getConfirmationMail()
    expect(confirmation).toBeDefined()
    expect(confirmation?.html).toContain('vielen Dank für deine Anfrage')
    expectBannerInMail(confirmation!)
  })

  it('versendet bei Betriebsferien-Konflikt keine Kunden-Bestätigung mit Banner', async () => {
    const result = await sendLeadEmails({
      ...baseLead,
      ferienKonflikt: true,
      waitlistMode: false,
    })

    expect(result.internal.status).toBe('sent')
    expect(result.confirmation.status).toBe('sent')
    expect(mockSendMail).toHaveBeenCalledTimes(1)

    const confirmation = getConfirmationMail()
    expect(confirmation).toBeUndefined()
  })
})
