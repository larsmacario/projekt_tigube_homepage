import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SIDEBAR_AD_FORMAT_RECOMMENDATIONS,
  SIDEBAR_CONTENT_WIDTH_PX,
} from '@/lib/portal-ads'

export function SidebarAdFormatRecommendations() {
  return (
    <Card className="border-sage-200 bg-sage-50/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Empfohlene Bildformate</CardTitle>
        <CardDescription>
          Die Sidebar im Kundenportal ist ca. {SIDEBAR_CONTENT_WIDTH_PX} px breit. Bilder werden
          automatisch auf die volle Breite skaliert – wichtig ist das Seitenverhältnis. Formate JPG,
          PNG oder WebP, möglichst unter 500 KB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SIDEBAR_AD_FORMAT_RECOMMENDATIONS.map((format) => (
            <li
              key={format.label}
              className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-sage-900">{format.label}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {format.width_px}×{format.height_px} px
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {format.aspect_ratio}
                </Badge>
                {format.recommended && (
                  <Badge className="bg-sage-600 text-white hover:bg-sage-600">Empfohlen</Badge>
                )}
              </div>
              <p className="text-sm text-sage-600">{format.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
