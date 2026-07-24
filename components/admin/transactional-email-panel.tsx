'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ContactEmail } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'
import { CardTitle } from '@/components/ui/card'

type TransactionalEmailPanelProps = {
  contactId: string
  recipientEmail: string
  recipientName: string
  defaultExpanded?: boolean
}

function formatSender(email: ContactEmail): string | null {
  if (!email.sent_by) return null
  if (typeof email.sent_by === 'object' && 'email' in email.sent_by) {
    return email.sent_by.email
  }
  return null
}

function truncateText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}

export function TransactionalEmailPanel({
  contactId,
  recipientEmail,
  recipientName,
  defaultExpanded = true,
}: TransactionalEmailPanelProps) {
  const { toast } = useToast()
  const [emails, setEmails] = useState<ContactEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const loadEmails = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/admin/contacts/${contactId}/emails`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verlauf konnte nicht geladen werden')
      }

      setEmails(data.emails || [])
    } catch (error) {
      console.error('Error loading transactional emails:', error)
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'E-Mail-Verlauf konnte nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [contactId, toast])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  async function handleSend() {
    if (!subject.trim()) {
      toast({
        title: 'Hinweis',
        description: 'Bitte einen Betreff eingeben',
        variant: 'destructive',
      })
      return
    }

    if (!body.trim()) {
      toast({
        title: 'Hinweis',
        description: 'Bitte eine Nachricht eingeben',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      const response = await authenticatedFetch(`/api/admin/contacts/${contactId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.email) {
          setEmails((prev) => [...prev, data.email])
        }
        throw new Error(data.error || 'E-Mail konnte nicht gesendet werden')
      }

      setEmails((prev) => [...prev, data.email])
      setSubject('')
      setBody('')
      toast({
        title: 'E-Mail gesendet',
        description: `Nachricht an ${recipientEmail} wurde versendet`,
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <CollapsibleAdminCard
      defaultExpanded={defaultExpanded}
      title={
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-Mail an {recipientName}
        </CardTitle>
      }
    >
      <div className="space-y-6">
        <div className="space-y-1 pb-2">
          <p className="text-sm text-sage-600">{recipientEmail}</p>
          <p className="text-xs text-sage-500">
            Persönlicher Einzelversand — für Massenversand siehe „E-Mails“ im Menü.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`transactional-email-subject-${contactId}`}>Betreff</Label>
            <Input
              id={`transactional-email-subject-${contactId}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff der E-Mail"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`transactional-email-body-${contactId}`}>Nachricht</Label>
            <Textarea
              id={`transactional-email-body-${contactId}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Deine Nachricht an den Kontakt…"
              rows={5}
              disabled={sending}
            />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gesendet…
              </>
            ) : (
              'E-Mail senden'
            )}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sage-900">E-Mail-Verlauf</h3>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sage-600">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <p className="text-sm text-sage-600 py-4 text-center">
              Noch keine E-Mails gesendet
            </p>
          ) : (
            <div className="space-y-3">
              {[...emails].reverse().map((email) => {
                const isFailed = email.status === 'failed'
                const sender = formatSender(email)

                return (
                  <div
                    key={email.id}
                    className={`rounded-lg border p-3 text-sm ${
                      isFailed
                        ? 'border-red-200 bg-red-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isFailed ? (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sage-900">{email.subject}</p>
                        <p className="text-xs text-sage-600 mt-1">
                          {new Date(email.created_at).toLocaleString('de-DE')}
                          {sender ? ` · ${sender}` : ''}
                          {isFailed ? ' · Fehlgeschlagen' : ' · Gesendet'}
                        </p>
                        <p className="mt-2 text-sage-800 whitespace-pre-wrap">
                          {truncateText(email.body_text)}
                        </p>
                        {isFailed && email.error_message && (
                          <p className="mt-2 text-red-700 whitespace-pre-wrap">{email.error_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </CollapsibleAdminCard>
  )
}

/** @deprecated Umbenannt in TransactionalEmailPanel */
export { TransactionalEmailPanel as ContactEmailPanel }
