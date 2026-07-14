'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { useToast } from '@/hooks/use-toast'
import { RichTextEditor } from '@/components/admin/newsletter/rich-text-editor'
import { RecipientPicker } from '@/components/admin/newsletter/recipient-picker'
import { TemplateModal } from '@/components/admin/newsletter/template-modal'
import { TopicManager } from '@/components/admin/newsletter/topic-manager'
import type { NewsletterTemplate, NewsletterTopic } from '@/lib/types'
import { Sparkles, Upload, Save, Send, Clock, Mail, History } from 'lucide-react'

type ContactOption = { id: string; email: string; label: string }

export default function NewsletterPage() {
  const { toast } = useToast()
  const [fromAddress, setFromAddress] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [topics, setTopics] = useState<NewsletterTopic[]>([])
  const [campaignId, setCampaignId] = useState<string | null>(null)

  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [htmlBody, setHtmlBody] = useState('<p>Hallo,</p><p></p><p>Herzliche Grüße<br>Tamara und Gabriel</p>')
  const [replyTo, setReplyTo] = useState('')
  const [topicId, setTopicId] = useState<string>('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [contactIds, setContactIds] = useState<string[]>([])
  const [selectedContacts, setSelectedContacts] = useState<ContactOption[]>([])
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [warnLargeList, setWarnLargeList] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    authenticatedFetch('/api/admin/newsletter/config').then((r) => r.json()).then((d) => {
      setFromAddress(d.from || '')
      setTestEmail(d.testEmail || '')
      setAiEnabled(Boolean(d.aiEnabled))
    })
    authenticatedFetch('/api/admin/newsletter/topics').then((r) => r.json()).then((d) => setTopics(d.topics || []))
  }, [])

  const previewRecipients = useCallback(async () => {
    if (groups.length === 0 && contactIds.length === 0) {
      setRecipientCount(null)
      setWarnLargeList(false)
      return
    }
    const res = await authenticatedFetch('/api/admin/newsletter/recipients/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups, contactIds }),
    })
    const data = await res.json()
    if (res.ok) {
      setRecipientCount(data.count)
      setWarnLargeList(Boolean(data.warnLargeList))
    }
  }, [groups, contactIds])

  useEffect(() => {
    previewRecipients()
  }, [previewRecipients])

  const buildPayload = () => ({
    subject,
    preview_text: previewText || null,
    html_body: htmlBody,
    reply_to: replyTo || null,
    topic_id: topicId || null,
    recipient_config: { groups, contactIds },
    scheduled_at: scheduledAt || null,
    status: scheduledAt ? 'scheduled' : 'draft',
  })

  const saveDraft = async () => {
    setLoading(true)
    try {
      const payload = buildPayload()
      const url = campaignId
        ? `/api/admin/newsletter/campaigns/${campaignId}`
        : '/api/admin/newsletter/campaigns'
      const res = await authenticatedFetch(url, {
        method: campaignId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaignId(data.campaign.id)
      toast({ title: 'Entwurf gespeichert' })
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTest = async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), testEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Test-Mail gesendet', description: data.to })
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Test fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast({ title: 'Betreff und Inhalt sind Pflicht', variant: 'destructive' })
      return
    }
    if (groups.length === 0 && contactIds.length === 0) {
      toast({ title: 'Mindestens eine Empfänger-Gruppe oder ein Kontakt nötig', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      let id = campaignId
      const payload = buildPayload()

      if (!id) {
        const createRes = await authenticatedFetch('/api/admin/newsletter/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const createData = await createRes.json()
        if (!createRes.ok) throw new Error(createData.error)
        id = createData.campaign.id
        setCampaignId(id)
      } else {
        const updateRes = await authenticatedFetch(`/api/admin/newsletter/campaigns/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const updateData = await updateRes.json()
        if (!updateRes.ok) throw new Error(updateData.error)
      }

      if (scheduledAt) {
        toast({ title: 'Versand geplant', description: new Date(scheduledAt).toLocaleString('de-DE') })
        return
      }

      const res = await authenticatedFetch(`/api/admin/newsletter/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({
        title: 'Transaktionale E-Mails versendet',
        description: `${data.stats.sent} gesendet, ${data.stats.failed} fehlgeschlagen`,
      })
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Versand fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateAiDraft = async () => {
    if (!aiEnabled) {
      toast({ title: 'AI nicht konfiguriert', description: 'OPENAI_API_KEY fehlt', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const topicName = topics.find((t) => t.id === topicId)?.name || 'Allgemein'
      const res = await authenticatedFetch('/api/admin/newsletter/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicName, audience: groups.join(', ') || 'Kontakte', prompt: aiPrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubject(data.draft.subject || subject)
      setPreviewText(data.draft.preview_text || previewText)
      setHtmlBody(data.draft.html_body || htmlBody)
      toast({ title: 'AI-Entwurf eingefügt' })
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'AI fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleHtmlUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setHtmlBody(reader.result)
    }
    reader.readAsText(file)
  }

  const saveAsTemplate = async () => {
    const name = window.prompt('Template-Name')
    if (!name) return
    const res = await authenticatedFetch('/api/admin/newsletter/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject_template: subject,
        preview_text: previewText,
        html_body: htmlBody,
      }),
    })
    const data = await res.json()
    if (res.ok) toast({ title: 'Template gespeichert' })
    else toast({ title: 'Fehler', description: data.error, variant: 'destructive' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Transaktionale E-Mails</h1>
          <p className="mt-2 text-sage-600">
            Service-Mails an Kontakte erstellen und versenden — z. B. Buchungsbestätigungen,
            Terminhinweise oder wichtige Mitteilungen. Kein Marketing-Newsletter.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/newsletter/history">
            <History className="h-4 w-4 mr-2" />
            Historie
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Empfänger & Metadaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Von</Label>
              <Input value={fromAddress} readOnly className="mt-1 bg-sage-50" />
            </div>
            <div>
              <Label htmlFor="reply-to">Reply-To (optional)</Label>
              <Input id="reply-to" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="mt-1" placeholder="info@tierischgutbetreut.de" />
            </div>
          </div>

          <RecipientPicker
            groups={groups}
            contactIds={contactIds}
            selectedContacts={selectedContacts}
            onGroupsChange={setGroups}
            onContactIdsChange={setContactIds}
            onSelectedContactsChange={setSelectedContacts}
            recipientCount={recipientCount}
            warnLargeList={warnLargeList}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Thema</Label>
                <TopicManager
                  topics={topics}
                  onTopicsChange={setTopics}
                  selectedTopicId={topicId}
                  onSelectTopic={setTopicId}
                />
              </div>
              <Select value={topicId || 'none'} onValueChange={(v) => setTopicId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Thema wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Thema</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduled">Geplant für (optional)</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inhalt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subject">Betreff</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="preview">Preview-Text</Label>
            <Input id="preview" value={previewText} onChange={(e) => setPreviewText(e.target.value)} className="mt-1" placeholder="Kurzer Vorschautext in der Posteingangsliste" />
          </div>

          <RichTextEditor value={htmlBody} onChange={setHtmlBody} />

          <div className="flex flex-wrap gap-2">
            <TemplateModal
              onSelect={(template: NewsletterTemplate) => {
                setSubject(template.subject_template || subject)
                setPreviewText(template.preview_text || previewText)
                setHtmlBody(template.html_body)
              }}
            />
            <label>
              <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  HTML hochladen
                </span>
              </Button>
              <input
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleHtmlUpload(file)
                }}
              />
            </label>
            <Button type="button" variant="outline" size="sm" onClick={saveAsTemplate}>
              Als Template speichern
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={generateAiDraft} disabled={!aiEnabled || loading}>
              <Sparkles className="h-4 w-4" />
              Mit AI schreiben
            </Button>
          </div>

          {aiEnabled && (
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Optional: Was soll die AI formulieren? z. B. Buchungsbestätigung für Hundepension oder Erinnerung an fehlende Unterlagen"
              rows={2}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={saveDraft} disabled={loading} variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Entwurf speichern
        </Button>
        <Button onClick={sendTest} disabled={loading} variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Test an {testEmail}
        </Button>
        <Button onClick={handleSend} disabled={loading} className="gap-2">
          {scheduledAt ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {scheduledAt ? 'Planen' : 'Jetzt senden'}
        </Button>
      </div>
    </div>
  )
}
