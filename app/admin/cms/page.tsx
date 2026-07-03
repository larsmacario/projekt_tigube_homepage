'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Trash2, Plus, Upload, Loader2, FileText, Globe } from "lucide-react"

// Types matching page constants
interface HomepageData {
  heroTitle?: string
  heroSubtitle?: string
  heroMainImage?: string
  heroSecondaryImage?: string
  heroTrustIndicators?: string[]
  aboutTitle?: string
  aboutSubtitle?: string
  tamaraName?: string
  tamaraTexts?: string[]
  tamaraImage?: string
  gabrielName?: string
  gabrielTexts?: string[]
  gabrielImage?: string
  lunaTitle?: string
  lunaSubtitle?: string
  lunaImage?: string
  lunaDescription?: string
  aboutCtaText?: string
  aboutCtaSubtitle?: string
  statExperience?: string
  statExperienceLabel?: string
  statClients?: string
  statClientsLabel?: string
  statAnimals?: string
  statAnimalsLabel?: string
  contactTitle?: string
  contactSubtitle?: string
  contactPhone?: string
  contactEmail?: string
  contactLocation?: string
  contactAvailability?: string
  contactWhatsAppUrl?: string
}

interface DogPensionData {
  badge?: string
  heroSubtitle?: string
  heroIntroText?: string
  heroChecklist?: string[]
  heroPriceBadge?: string
  heroImageSrc?: string
  qualificationsTitle?: string
  qualificationsSubtitle?: string
  qualificationsList?: { title: string; description: string }[]
  activitiesTitle?: string
  activitiesSubtitle?: string
  activitiesList?: string[]
  activitiesSummary?: string
  priceListTitle?: string
  priceListSubtitle?: string
  priceList?: { service: string; price: string; duration: string; note?: string }[]
  additionalServicesTitle?: string
  additionalServices?: { service: string; price: string; unit?: string }[]
  cancellationPolicyTitle?: string
  cancellationPolicy?: { period: string; refund: string }[]
  pickupTimesTitle?: string
  pickupTimesList?: { days: string; times: string }[]
  warningBoxTitle?: string
  warningBoxNotes?: string[]
  warningBoxSummary?: string
  contactCtaTitle?: string
  contactCtaSubtitle?: string
  contactCtaWhatsAppUrl?: string
  contactCtaInfo?: string
}

interface CatCareData {
  title?: string
  badge?: string
  heroSubtitle?: string
  heroIntroText?: string
  heroChecklist?: string[]
  heroPriceBadge?: string
  heroImageSrc?: string
  qualificationsTitle?: string
  qualificationsSubtitle?: string
  qualificationsList?: { title: string; description: string }[]
  activitiesTitle?: string
  activitiesSubtitle?: string
  activitiesList?: string[]
  activitiesSummary?: string
  priceListTitle?: string
  priceListSubtitle?: string
  priceList?: { service: string; price: string; duration: string }[]
  additionalServicesTitle?: string
  additionalServices?: { service: string; price: string; unit?: string }[]
  cancellationPolicyTitle?: string
  cancellationPolicy?: { period: string; refund: string }[]
  warningBoxTitle?: string
  warningBoxNotes?: string[]
  warningBoxSummary?: string
  contactCtaTitle?: string
  contactCtaSubtitle?: string
  contactCtaWhatsAppUrl?: string
  contactCtaInfo?: string
}

interface LegalData {
  title?: string
  content?: string
}

export default function CMSPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cmsData, setCmsData] = useState<Record<string, any>>({})

  // Fetch all CMS content on load
  useEffect(() => {
    async function loadCMSData() {
      try {
        const res = await fetch('/api/admin/cms')
        const result = await res.json()
        if (res.ok) {
          setCmsData(result.data || {})
        } else {
          toast.error("Fehler beim Laden: " + result.error)
        }
      } catch (err: any) {
        toast.error("Netzwerkfehler: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadCMSData()
  }, [])

  // Save specific key to Supabase
  const handleSave = async (key: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          data: cmsData[key] || {}
        })
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`Inhalte für "${key}" erfolgreich gespeichert!`)
      } else {
        toast.error("Speichern fehlgeschlagen: " + result.error)
      }
    } catch (err: any) {
      toast.error("Netzwerkfehler beim Speichern: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle local state updates
  const updateData = (key: string, field: string, val: any) => {
    setCmsData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: val
      }
    }))
  }

  // Universal image uploader
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const uploadToast = toast.loading("Bild wird hochgeladen...")
    try {
      const res = await fetch('/api/admin/cms/upload', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (res.ok) {
        updateData(key, field, result.url)
        toast.success("Bild erfolgreich hochgeladen!", { id: uploadToast })
      } else {
        toast.error("Upload fehlgeschlagen: " + result.error, { id: uploadToast })
      }
    } catch (err: any) {
      toast.error("Upload-Fehler: " + err.message, { id: uploadToast })
    }
  }

  // Reusable sub-editor components
  const StringList = ({ label, list, onChange }: { label: string; list: string[]; onChange: (val: string[]) => void }) => {
    const items = list || []
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input value={item} onChange={(e) => {
              const next = [...items]
              next[idx] = e.target.value
              onChange(next)
            }} />
            <Button variant="ghost" size="icon" onClick={() => {
              onChange(items.filter((_, i) => i !== idx))
            }} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="h-4 w-4 mr-1" /> Eintrag hinzufügen
        </Button>
      </div>
    )
  }

  const StructuredList = ({
    label,
    list,
    fields,
    onChange,
    defaultObj
  }: {
    label: string
    list: any[]
    fields: { key: string; label: string; type?: 'text' | 'textarea' }[]
    onChange: (val: any[]) => void
    defaultObj: any
  }) => {
    const items = list || []
    return (
      <div className="space-y-4">
        <Label className="text-lg font-bold">{label}</Label>
        {items.map((item, idx) => (
          <div key={idx} className="border border-sage-200 p-4 rounded-lg relative space-y-3 bg-sage-50/50">
            <Button variant="ghost" size="icon" onClick={() => {
              onChange(items.filter((_, i) => i !== idx))
            }} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea value={item[f.key] || ''} onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...next[idx], [f.key]: e.target.value }
                    onChange(next)
                  }} />
                ) : (
                  <Input value={item[f.key] || ''} onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...next[idx], [f.key]: e.target.value }
                    onChange(next)
                  }} />
                )}
              </div>
            ))}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, defaultObj])}>
          <Plus className="h-4 w-4 mr-1" /> {label} hinzufügen
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-sage-600" />
        <p className="text-gray-500">Lade CMS-Inhalte...</p>
      </div>
    )
  }

  const hData: HomepageData = cmsData['homepage'] || {}
  const dData: DogPensionData = cmsData['hundepension'] || {}
  const cData: CatCareData = cmsData['katzenbetreuung'] || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-sage-900 font-raleway">Webseiten-Inhaltsverwaltung (CMS)</h1>
        <p className="text-gray-600">Verwalte hier die statischen Texte und Bilder deiner Next.js-Webseite direkt über Supabase.</p>
      </div>

      <Tabs defaultValue="homepage" className="w-full">
        <TabsList className="bg-white border border-sage-200 p-1 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="homepage" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">Startseite</TabsTrigger>
          <TabsTrigger value="hundepension" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">Hundepension</TabsTrigger>
          <TabsTrigger value="katzenbetreuung" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">Katzenbetreuung</TabsTrigger>
          <TabsTrigger value="agb" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">AGB</TabsTrigger>
          <TabsTrigger value="datenschutz" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">Datenschutz</TabsTrigger>
          <TabsTrigger value="impressum" className="data-[state=active]:bg-sage-600 data-[state=active]:text-white">Impressum</TabsTrigger>
        </TabsList>

        {/* Startseite */}
        <TabsContent value="homepage" className="space-y-6 mt-6">
          <Card className="border-sage-200">
            <CardHeader className="bg-sage-50/50 border-b border-sage-100">
              <CardTitle className="text-xl text-sage-900 font-raleway flex items-center gap-2">
                <Globe className="h-5 w-5" /> Startseite verwalten
              </CardTitle>
              <CardDescription>Hero-Sektion, Über Uns, Tamara, Gabriel, Luna und Kontaktbereich anpassen.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Hero Sektion */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">1. Hero Sektion</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero-Titel</Label>
                    <Input id="heroTitle" value={hData.heroTitle || ''} onChange={(e) => updateData('homepage', 'heroTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero-Untertitel</Label>
                    <Textarea id="heroSubtitle" value={hData.heroSubtitle || ''} onChange={(e) => updateData('homepage', 'heroSubtitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hauptbild (Hero)</Label>
                    <div className="flex gap-4 items-center">
                      <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'homepage', 'heroMainImage')} />
                      {hData.heroMainImage && <img src={hData.heroMainImage} alt="Main" className="h-16 w-24 object-cover rounded border" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Zweitbild (Hero)</Label>
                    <div className="flex gap-4 items-center">
                      <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'homepage', 'heroSecondaryImage')} />
                      {hData.heroSecondaryImage && <img src={hData.heroSecondaryImage} alt="Secondary" className="h-16 w-24 object-cover rounded border" />}
                    </div>
                  </div>
                </div>
                <StringList label="Vertrauensindikatoren" list={hData.heroTrustIndicators || []} onChange={(val) => updateData('homepage', 'heroTrustIndicators', val)} />
              </div>

              {/* Über uns */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">2. Über uns</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aboutTitle">Über-Uns-Titel</Label>
                    <Input id="aboutTitle" value={hData.aboutTitle || ''} onChange={(e) => updateData('homepage', 'aboutTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutSubtitle">Über-Uns-Beschreibung</Label>
                    <Textarea id="aboutSubtitle" value={hData.aboutSubtitle || ''} onChange={(e) => updateData('homepage', 'aboutSubtitle', e.target.value)} />
                  </div>
                </div>

                <div className="border p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sage-700">Tamara Pfaff</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={hData.tamaraName || ''} onChange={(e) => updateData('homepage', 'tamaraName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Foto</Label>
                      <div className="flex gap-4 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'homepage', 'tamaraImage')} />
                        {hData.tamaraImage && <img src={hData.tamaraImage} alt="Tamara" className="h-16 w-16 object-cover rounded-full border" />}
                      </div>
                    </div>
                  </div>
                  <StringList label="Beschreibungstexte" list={hData.tamaraTexts || []} onChange={(val) => updateData('homepage', 'tamaraTexts', val)} />
                </div>

                <div className="border p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sage-700">Gabriel Haaga</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={hData.gabrielName || ''} onChange={(e) => updateData('homepage', 'gabrielName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Foto</Label>
                      <div className="flex gap-4 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'homepage', 'gabrielImage')} />
                        {hData.gabrielImage && <img src={hData.gabrielImage} alt="Gabriel" className="h-16 w-16 object-cover rounded-full border" />}
                      </div>
                    </div>
                  </div>
                  <StringList label="Beschreibungstexte" list={hData.gabrielTexts || []} onChange={(val) => updateData('homepage', 'gabrielTexts', val)} />
                </div>

                <div className="border p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sage-700">Hundepartner/Luna</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Luna Titel</Label>
                      <Input value={hData.lunaTitle || ''} onChange={(e) => updateData('homepage', 'lunaTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Luna Beschreibung</Label>
                      <Textarea value={hData.lunaDescription || ''} onChange={(e) => updateData('homepage', 'lunaDescription', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Luna Foto</Label>
                      <div className="flex gap-4 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'homepage', 'lunaImage')} />
                        {hData.lunaImage && <img src={hData.lunaImage} alt="Luna" className="h-16 w-16 object-cover rounded border" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Zusätzlicher Text</Label>
                      <Textarea value={hData.lunaSubtitle || ''} onChange={(e) => updateData('homepage', 'lunaSubtitle', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistiken */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">3. Statistiken</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Statistik 1 (Wert)</Label>
                    <Input value={hData.statExperience || ''} onChange={(e) => updateData('homepage', 'statExperience', e.target.value)} />
                    <Label>Label</Label>
                    <Input value={hData.statExperienceLabel || ''} onChange={(e) => updateData('homepage', 'statExperienceLabel', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Statistik 2 (Wert)</Label>
                    <Input value={hData.statClients || ''} onChange={(e) => updateData('homepage', 'statClients', e.target.value)} />
                    <Label>Label</Label>
                    <Input value={hData.statClientsLabel || ''} onChange={(e) => updateData('homepage', 'statClientsLabel', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Statistik 3 (Wert)</Label>
                    <Input value={hData.statAnimals || ''} onChange={(e) => updateData('homepage', 'statAnimals', e.target.value)} />
                    <Label>Label</Label>
                    <Input value={hData.statAnimalsLabel || ''} onChange={(e) => updateData('homepage', 'statAnimalsLabel', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Kontaktbereich */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">4. Kontaktinformationen</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input value={hData.contactTitle || ''} onChange={(e) => updateData('homepage', 'contactTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Untertitel</Label>
                    <Textarea value={hData.contactSubtitle || ''} onChange={(e) => updateData('homepage', 'contactSubtitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefonnummer</Label>
                    <Input value={hData.contactPhone || ''} onChange={(e) => updateData('homepage', 'contactPhone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail-Adresse</Label>
                    <Input value={hData.contactEmail || ''} onChange={(e) => updateData('homepage', 'contactEmail', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Standort</Label>
                    <Input value={hData.contactLocation || ''} onChange={(e) => updateData('homepage', 'contactLocation', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Erreichbarkeit</Label>
                    <Input value={hData.contactAvailability || ''} onChange={(e) => updateData('homepage', 'contactAvailability', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Link</Label>
                    <Input value={hData.contactWhatsAppUrl || ''} onChange={(e) => updateData('homepage', 'contactWhatsAppUrl', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button disabled={saving} onClick={() => handleSave('homepage')} className="bg-sage-600 hover:bg-sage-700 text-white">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Startseite Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hundepension */}
        <TabsContent value="hundepension" className="space-y-6 mt-6">
          <Card className="border-sage-200">
            <CardHeader className="bg-sage-50/50 border-b border-sage-100">
              <CardTitle className="text-xl text-sage-900 font-raleway flex items-center gap-2">
                <Globe className="h-5 w-5" /> Hundepension verwalten
              </CardTitle>
              <CardDescription>Hero, Gründe, Qualifikationen, Preise, Stornierungsregeln, Bringzeiten anpassen.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Input value={dData.badge || ''} onChange={(e) => updateData('hundepension', 'badge', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Untertitel</Label>
                  <Input value={dData.heroSubtitle || ''} onChange={(e) => updateData('hundepension', 'heroSubtitle', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Einleitungstext</Label>
                  <Textarea value={dData.heroIntroText || ''} onChange={(e) => updateData('hundepension', 'heroIntroText', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hauptbild (Hundepension)</Label>
                  <div className="flex gap-4 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hundepension', 'heroImageSrc')} />
                    {dData.heroImageSrc && <img src={dData.heroImageSrc} alt="Hund" className="h-16 w-24 object-cover rounded border" />}
                  </div>
                </div>
              </div>

              <StringList label="Checkliste (Warum Pension?)" list={dData.heroChecklist || []} onChange={(val) => updateData('hundepension', 'heroChecklist', val)} />

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">Dienstleistungen & Aktivitäten</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aktivitäten Titel</Label>
                    <Input value={dData.activitiesTitle || ''} onChange={(e) => updateData('hundepension', 'activitiesTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Aktivitäten Untertitel</Label>
                    <Textarea value={dData.activitiesSubtitle || ''} onChange={(e) => updateData('hundepension', 'activitiesSubtitle', e.target.value)} />
                  </div>
                </div>
                <StringList label="Aktivitäten-Liste" list={dData.activitiesList || []} onChange={(val) => updateData('hundepension', 'activitiesList', val)} />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Qualifikationen" 
                  list={dData.qualificationsList || []}
                  fields={[
                    { key: 'title', label: 'Qualifikationstitel' },
                    { key: 'description', label: 'Beschreibung', type: 'textarea' }
                  ]}
                  defaultObj={{ title: '', description: '' }}
                  onChange={(val) => updateData('hundepension', 'qualificationsList', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Preise" 
                  list={dData.priceList || []}
                  fields={[
                    { key: 'service', label: 'Leistungsname' },
                    { key: 'price', label: 'Preis (z. B. 31€)' },
                    { key: 'duration', label: 'Dauer (z. B. je Kalendertag)' },
                    { key: 'note', label: 'Hinweis (optional)', type: 'textarea' }
                  ]}
                  defaultObj={{ service: '', price: '', duration: '', note: '' }}
                  onChange={(val) => updateData('hundepension', 'priceList', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Zusätzliche Leistungen" 
                  list={dData.additionalServices || []}
                  fields={[
                    { key: 'service', label: 'Leistung' },
                    { key: 'price', label: 'Preis' },
                    { key: 'unit', label: 'Einheit' }
                  ]}
                  defaultObj={{ service: '', price: '', unit: '' }}
                  onChange={(val) => updateData('hundepension', 'additionalServices', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Stornierungsbedingungen" 
                  list={dData.cancellationPolicy || []}
                  fields={[
                    { key: 'period', label: 'Frist' },
                    { key: 'refund', label: 'Erstattung' }
                  ]}
                  defaultObj={{ period: '', refund: '' }}
                  onChange={(val) => updateData('hundepension', 'cancellationPolicy', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Bring- & Abholzeiten" 
                  list={dData.pickupTimesList || []}
                  fields={[
                    { key: 'days', label: 'Tage' },
                    { key: 'times', label: 'Uhrzeiten' }
                  ]}
                  defaultObj={{ days: '', times: '' }}
                  onChange={(val) => updateData('hundepension', 'pickupTimesList', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">Hinweise & Warnungen</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warnungsbox-Titel</Label>
                    <Input value={dData.warningBoxTitle || ''} onChange={(e) => updateData('hundepension', 'warningBoxTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Zusammenfassung</Label>
                    <Textarea value={dData.warningBoxSummary || ''} onChange={(e) => updateData('hundepension', 'warningBoxSummary', e.target.value)} />
                  </div>
                </div>
                <StringList label="Warnungshinweise" list={dData.warningBoxNotes || []} onChange={(val) => updateData('hundepension', 'warningBoxNotes', val)} />
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button disabled={saving} onClick={() => handleSave('hundepension')} className="bg-sage-600 hover:bg-sage-700 text-white">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hundepension Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Katzenbetreuung */}
        <TabsContent value="katzenbetreuung" className="space-y-6 mt-6">
          <Card className="border-sage-200">
            <CardHeader className="bg-sage-50/50 border-b border-sage-100">
              <CardTitle className="text-xl text-sage-900 font-raleway flex items-center gap-2">
                <Globe className="h-5 w-5" /> Katzenbetreuung verwalten
              </CardTitle>
              <CardDescription>Hero, Leistungen, Preise, Zusatzleistungen, Stornierung anpassen.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titel</Label>
                  <Input value={cData.title || ''} onChange={(e) => updateData('katzenbetreuung', 'title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Input value={cData.badge || ''} onChange={(e) => updateData('katzenbetreuung', 'badge', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Untertitel</Label>
                  <Input value={cData.heroSubtitle || ''} onChange={(e) => updateData('katzenbetreuung', 'heroSubtitle', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Einleitungstext</Label>
                  <Textarea value={cData.heroIntroText || ''} onChange={(e) => updateData('katzenbetreuung', 'heroIntroText', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Foto (Katzenbetreuung)</Label>
                  <div className="flex gap-4 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'katzenbetreuung', 'heroImageSrc')} />
                    {cData.heroImageSrc && <img src={cData.heroImageSrc} alt="Katze" className="h-16 w-24 object-cover rounded border" />}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Inhalts-Leistungen" 
                  list={cData.qualificationsList || []}
                  fields={[
                    { key: 'title', label: 'Leistungstitel' }
                  ]}
                  defaultObj={{ title: '' }}
                  onChange={(val) => updateData('katzenbetreuung', 'qualificationsList', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Preise" 
                  list={cData.priceList || []}
                  fields={[
                    { key: 'service', label: 'Leistung' },
                    { key: 'price', label: 'Preis' },
                    { key: 'duration', label: 'Dauer/Umfang' }
                  ]}
                  defaultObj={{ service: '', price: '', duration: '' }}
                  onChange={(val) => updateData('katzenbetreuung', 'priceList', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Zusätzliche Leistungen" 
                  list={cData.additionalServices || []}
                  fields={[
                    { key: 'service', label: 'Leistung' },
                    { key: 'price', label: 'Preis' },
                    { key: 'unit', label: 'Einheit' }
                  ]}
                  defaultObj={{ service: '', price: '', unit: '' }}
                  onChange={(val) => updateData('katzenbetreuung', 'additionalServices', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <StructuredList 
                  label="Stornierungsbedingungen" 
                  list={cData.cancellationPolicy || []}
                  fields={[
                    { key: 'period', label: 'Frist' },
                    { key: 'refund', label: 'Erstattung' }
                  ]}
                  defaultObj={{ period: '', refund: '' }}
                  onChange={(val) => updateData('katzenbetreuung', 'cancellationPolicy', val)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold border-b pb-2 text-sage-800">Hinweise</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warnungs-Titel</Label>
                    <Input value={cData.warningBoxTitle || ''} onChange={(e) => updateData('katzenbetreuung', 'warningBoxTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Zusammenfassung</Label>
                    <Textarea value={cData.warningBoxSummary || ''} onChange={(e) => updateData('katzenbetreuung', 'warningBoxSummary', e.target.value)} />
                  </div>
                </div>
                <StringList label="Wichtige Hinweise" list={cData.warningBoxNotes || []} onChange={(val) => updateData('katzenbetreuung', 'warningBoxNotes', val)} />
              </div>

              <div className="flex justify-end pt-6 border-t">
                <Button disabled={saving} onClick={() => handleSave('katzenbetreuung')} className="bg-sage-600 hover:bg-sage-700 text-white">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Katzenbetreuung Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rechtliches (AGB, Datenschutz, Impressum) */}
        {['agb', 'datenschutz', 'impressum'].map((lKey) => {
          const lData: LegalData = cmsData[lKey] || {}
          return (
            <TabsContent key={lKey} value={lKey} className="space-y-6 mt-6">
              <Card className="border-sage-200">
                <CardHeader className="bg-sage-50/50 border-b border-sage-100">
                  <CardTitle className="text-xl text-sage-900 font-raleway flex items-center gap-2">
                    <FileText className="h-5 w-5" /> {lKey.toUpperCase()} verwalten
                  </CardTitle>
                  <CardDescription>Passe den Titel und Inhalt dieser rechtlichen Seite an. Unterstützt HTML und reinen Text.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Seitentitel</Label>
                    <Input value={lData.title || ''} onChange={(e) => updateData(lKey, 'title', e.target.value)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Inhalt (HTML/Text)</Label>
                      <Textarea 
                        className="min-h-[400px] font-mono text-sm leading-relaxed" 
                        value={lData.content || ''} 
                        onChange={(e) => updateData(lKey, 'content', e.target.value)} 
                        placeholder="Trage hier den Text oder HTML-Code für die AGBs ein. Zum Beispiel: <h2 class='text-xl font-bold'>Zusicherungen</h2>..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Live Vorschau</Label>
                      <div className="min-h-[400px] p-4 border rounded-lg overflow-y-auto bg-sage-50/20 prose max-w-none text-sm text-gray-700">
                        {lData.content ? (
                          <div dangerouslySetInnerHTML={{ __html: lData.content }} />
                        ) : (
                          <p className="text-gray-400 italic">Noch kein Inhalt eingetragen...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t">
                    <Button disabled={saving} onClick={() => handleSave(lKey)} className="bg-sage-600 hover:bg-sage-700 text-white">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Speichern
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
