'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NewsletterCampaign, NewsletterSendLog } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export default function NewsletterCampaignDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [campaign, setCampaign] = useState<NewsletterCampaign | null>(null)
  const [logs, setLogs] = useState<NewsletterSendLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authenticatedFetch(`/api/admin/newsletter/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaign(d.campaign)
        setLogs(d.logs || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sage-600">Laden …</p>
  if (!campaign) return <p className="text-red-700">Versand nicht gefunden.</p>

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/newsletter/history">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Historie
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{campaign.subject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-sage-700">
          <p>Status: {campaign.status}</p>
          <p>Versendet: {campaign.stats?.sent ?? 0} · Fehlgeschlagen: {campaign.stats?.failed ?? 0}</p>
          {campaign.preview_text && <p>Preview: {campaign.preview_text}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Empfänger-Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 && <p className="text-sage-600">Keine Logs vorhanden.</p>}
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-sage-100 py-2 text-sm">
                <span>{log.email}</span>
                <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>{log.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
