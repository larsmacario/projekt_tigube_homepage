import { Resend } from 'resend'

let resendClient: Resend | null = null

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key || key === 're_xxxxxxxxx') {
    return false
  }
  return true
}

export function getResendFrom(): string {
  return process.env.RESEND_FROM?.trim() || 'info@tierischgutbetreut.de'
}

export function getResendClient(): Resend {
  if (!isResendConfigured()) {
    throw new Error('Resend ist nicht konfiguriert')
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!.trim())
  }

  return resendClient
}
