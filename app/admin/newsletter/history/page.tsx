'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NewsletterCampaign } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  sending: 'Wird gesendet',
  sent: 'Versendet',
  failed: 'Fehlgeschlagen',
  cancelled: 'Abgebrochen',
}

export default function NewsletterHistoryPage() {
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authenticatedFetch('/api/admin/newsletter/campaigns')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/newsletter">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Versandhistorie</h1>
          <p className="mt-1 text-sage-600">Vergangene transaktionale E-Mails und Versandstatus.</p>
        </div>
      </div>

      {loading && <p className="text-sage-600">Laden …</p>}

      {!loading && campaigns.length === 0 && (
        <p className="text-sage-600">Noch keine transaktionalen E-Mails versendet.</p>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg">{campaign.subject || 'Ohne Betreff'}</CardTitle>
                <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                  {statusLabels[campaign.status] || campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-sage-700">
              <p>
                Erstellt: {new Date(campaign.created_at).toLocaleString('de-DE')}
                {campaign.sent_at && ` · Versendet: ${new Date(campaign.sent_at).toLocaleString('de-DE')}`}
              </p>
              {campaign.stats && (
                <p>
                  {campaign.stats.sent} gesendet · {campaign.stats.failed} fehlgeschlagen
                </p>
              )}
              <Button asChild variant="link" className="p-0 h-auto">
                <Link href={`/admin/newsletter/history/${campaign.id}`}>Details anzeigen</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
