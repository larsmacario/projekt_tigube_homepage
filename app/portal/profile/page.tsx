'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { Customer, Pet, Document } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  PetVaccinationSection,
  PetVaccinationSummary,
} from '@/components/portal/pet-vaccination-section'
import {
  formatPetSaveWarning,
  getPetSaveWarnings,
  isDog,
  validatePetSaveRequired,
} from '@/lib/pet-vaccination'
import { PetPhotoGallery } from '@/components/portal/pet-photo-gallery'
import { PetRecognitionField } from '@/components/portal/pet-recognition-field'
import { PetMissingFieldsHint } from '@/components/portal/pet-missing-fields-hint'

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const stepParam = searchParams.get('step')
  
  // Schritt 1 = Persönliche Daten, Schritt 2 = Tier/e + Tierinformationen, Schritt 3 = Pflegevertrag
  const [step, setStep] = useState<1 | 2 | 3>(stepParam === '3' ? 3 : stepParam === '2' ? 2 : 1)
  
  // Debug: Log onboarding status
  useEffect(() => {
    console.log('Onboarding status:', { isOnboarding, stepParam, step })
  }, [isOnboarding, stepParam, step])
  
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Schritt 1: Persönliche Daten
  const [personalData, setPersonalData] = useState({
    email: '',
    nachname: '',
    vorname: '',
    telefonnummer: '',
    telefon_2: '',
    notfall_kontakt_name: '',
    notfallnummer: '',
    datenschutz: false,
  })
  
  // Schritt 2: Tiere
  const [pets, setPets] = useState<Pet[]>([])
  const [petFormData, setPetFormData] = useState({
    name: '',
    tierart: '',
    rasse: '',
    farbe: '',
    wiedererkennungsmerkmal: '',
    geschlecht: '',
    letzte_impfung: '',
    letzte_impfung_zusatz: '',
    futtermenge: '',
    medikamente: '',
    besonderheiten: '',
    intervall_impfung: '',
    intervall_entwurmung: '',
    letzte_stuhlprobe: '',
  })

  // Schritt 3: Pflegevertrag und Signatur
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [fotoVideoConsent, setFotoVideoConsent] = useState(false)
  const [dataConsent, setDataConsent] = useState(false)
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null)
  const [showPetForm, setShowPetForm] = useState(false)
  const [editingPetId, setEditingPetId] = useState<string | null>(null)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [impfpassFile, setImpfpassFile] = useState<File | null>(null)
  const [wurmtestFile, setWurmtestFile] = useState<File | null>(null)
  const [formPhotoCount, setFormPhotoCount] = useState(0)

  useEffect(() => {
    console.log('Component mounted, loading profile...')
    loadProfile()
  }, [])
  
  // Debug: Log personalData changes
  useEffect(() => {
    console.log('Personal data changed:', personalData)
  }, [personalData])

  useEffect(() => {
    if (step === 2 && customer) {
      loadPets()
    }
  }, [step, customer])

  async function loadProfile() {
    try {
      const response = await authenticatedFetch('/api/portal/profile')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('Profile API response:', data)
      
      if (data.customer) {
        console.log('Customer data received from API:', {
          id: data.customer.id,
          nachname: data.customer.nachname,
          vorname: data.customer.vorname,
          telefonnummer: data.customer.telefonnummer,
          email: data.customer.email,
          telefon_2: data.customer.telefon_2,
          notfall_kontakt_name: data.customer.notfall_kontakt_name,
          notfallnummer: data.customer.notfallnummer,
          datenschutz: data.customer.datenschutz,
        })
        
        setCustomer(data.customer)
        
        // Persönliche Daten vorausfüllen (auch wenn leer, werden aus DB geladen)
        const loadedPersonalData = {
          email: data.customer.email || '',
          nachname: data.customer.nachname || '',
          vorname: data.customer.vorname || '',
          telefonnummer: data.customer.telefonnummer || '',
          telefon_2: data.customer.telefon_2 || '',
          notfall_kontakt_name: data.customer.notfall_kontakt_name || '',
          notfallnummer: data.customer.notfallnummer || '',
          datenschutz: data.customer.datenschutz || false,
        }
        
        console.log('Setting personal data state:', loadedPersonalData)
        setPersonalData(loadedPersonalData)
        
        // Debug: Prüfe nach 100ms ob die Daten gesetzt wurden
        setTimeout(() => {
          console.log('Personal data after setState:', personalData)
        }, 100)
        // Tierinformationen werden jetzt pro Tier gespeichert, nicht mehr auf Customer-Ebene
      } else {
        console.warn('No customer data found in response')
        // Setze Customer auf null, damit die Form trotzdem angezeigt wird
        setCustomer(null)
      }

      // Dokumente laden
      const docsResponse = await authenticatedFetch('/api/portal/documents')
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Fehler',
        description: error.message || 'Profil konnte nicht geladen werden',
        variant: 'destructive',
      })
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadPets() {
    try {
      const response = await authenticatedFetch('/api/portal/pets')
      const data = await response.json()
      setPets(data.pets || [])

      const docsResponse = await authenticatedFetch('/api/portal/documents')
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }
    } catch (error) {
      console.error('Error loading pets:', error)
    }
  }

  // Polling für mobile Unterschrift
  useEffect(() => {
    let intervalId: any
    if (mobileSessionId && isPolling) {
      intervalId = setInterval(async () => {
        try {
          const response = await authenticatedFetch(`/api/portal/signatures/session?id=${mobileSessionId}`)
          const data = await response.json()
          if (response.ok && data.session.status === 'completed' && data.session.signature_data) {
            setSignatureImage(data.session.signature_data)
            setIsPolling(false)
            setMobileSessionId(null)
            toast({
              title: 'Erfolg',
              description: 'Unterschrift erfolgreich vom Smartphone empfangen!',
            })
          }
        } catch (error) {
          console.error('Error polling signature session:', error)
        }
      }, 2000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [mobileSessionId, isPolling])

  // Setup Desktop Canvas Event Listeners
  useEffect(() => {
    let timerId: any
    let isInitialized = false
    let drawing = false
    let ctx: CanvasRenderingContext2D | null = null
    let canvasElement: HTMLCanvasElement | null = null

    if (step !== 3 || signatureImage) return

    const startDrawing = (e: MouseEvent) => {
      drawing = true
      draw(e)
    }
    const stopDrawing = () => {
      drawing = false
      if (ctx) ctx.beginPath()
    }
    const draw = (e: MouseEvent) => {
      if (!drawing) return
      if (!ctx || !canvasElement) return
      const rect = canvasElement.getBoundingClientRect()
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    }

    // Touch Event Handlers für Mobilgeräte
    const getTouchPos = (e: TouchEvent) => {
      if (!canvasElement) return { x: 0, y: 0 }
      const rect = canvasElement.getBoundingClientRect()
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    }

    const startDrawingTouch = (e: TouchEvent) => {
      e.preventDefault()
      drawing = true
      const pos = getTouchPos(e)
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
      }
    }

    const drawTouch = (e: TouchEvent) => {
      e.preventDefault()
      if (!drawing) return
      if (!ctx) return
      const pos = getTouchPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }

    const stopDrawingTouch = (e: TouchEvent) => {
      e.preventDefault()
      drawing = false
      if (ctx) ctx.beginPath()
    }

    const initCanvas = () => {
      canvasElement = desktopCanvasRef.current
      if (!canvasElement) {
        timerId = setTimeout(initCanvas, 50)
        return
      }

      ctx = canvasElement.getContext('2d')
      if (!ctx) return

      canvasElement.width = canvasElement.offsetWidth || 400
      canvasElement.height = 150
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#0f172a'

      canvasElement.addEventListener('mousedown', startDrawing)
      canvasElement.addEventListener('mousemove', draw)
      canvasElement.addEventListener('mouseup', stopDrawing)
      canvasElement.addEventListener('mouseleave', stopDrawing)

      // Touch Listener registrieren (passive: false wird benötigt um das Scrollen des Bodys beim Zeichnen zu unterdrücken)
      canvasElement.addEventListener('touchstart', startDrawingTouch, { passive: false })
      canvasElement.addEventListener('touchmove', drawTouch, { passive: false })
      canvasElement.addEventListener('touchend', stopDrawingTouch, { passive: false })
      
      isInitialized = true
    }

    initCanvas()

    return () => {
      clearTimeout(timerId)
      if (isInitialized && canvasElement) {
        canvasElement.removeEventListener('mousedown', startDrawing)
        canvasElement.removeEventListener('mousemove', draw)
        canvasElement.removeEventListener('mouseup', stopDrawing)
        canvasElement.removeEventListener('mouseleave', stopDrawing)

        canvasElement.removeEventListener('touchstart', startDrawingTouch)
        canvasElement.removeEventListener('touchmove', drawTouch)
        canvasElement.removeEventListener('touchend', stopDrawingTouch)
      }
    }
  }, [step, signatureImage])

  const startMobileSignature = async () => {
    if (!customer?.id) return
    try {
      setSaving(true)
      const response = await authenticatedFetch('/api/portal/signatures/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customer.id })
      })
      const data = await response.json()
      if (response.ok && data.session?.id) {
        setMobileSessionId(data.session.id)
        setIsPolling(true)
        toast({
          title: 'QR-Code generiert',
          description: 'Bitte scanne den QR-Code mit deinem Smartphone.',
        })
      } else {
        throw new Error(data.error || 'Fehler beim Erstellen der Session')
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Verbindung fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const acceptDesktopSignature = () => {
    const canvas = desktopCanvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setSignatureImage(dataUrl)
    toast({
      title: 'Erfolg',
      description: 'Unterschrift übernommen',
    })
  }

  const clearDesktopSignature = () => {
    const canvas = desktopCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleFinishOnboarding() {
    if (!dataConsent) {
      toast({
        title: 'Fehler',
        description: 'Bitte stimme der Datenschutzerklärung zu, um fortzufahren.',
        variant: 'destructive',
      })
      return
    }
    if (!signatureImage) {
      toast({
        title: 'Fehler',
        description: 'Bitte unterzeichne den Pflegevertrag.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // 1. PDF generieren
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Hilfsfunktion für Seitenhintergrund & Ränder
      const drawHeaderFooter = (pageNumber: number) => {
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text('© tierischgutbetreut GmbH 2026', 20, 285)
        doc.text(`Seite ${pageNumber}`, 180, 285)
        doc.setTextColor(0, 0, 0)
      }

      // --- SEITE 1: STAMMDATEN & VERTRAGSPARTNER ---
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(22)
      doc.text('PFLEGEVERTRAG', 20, 25)
      doc.setFontSize(14)
      doc.text('für den Hundeurlaub in der Pension', 20, 33)
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('tierisch gut betreut Gesellschaft mit beschränkter Haftung', 20, 42)
      doc.setFont('Helvetica', 'normal')
      doc.text('Tamara Pfaff & Gabriel Haaga, Iznangerstr. 32, 78345 Moos', 20, 47)
      doc.line(20, 50, 190, 50)

      // Auftraggeber
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Auftraggeber (Tierhalter):', 20, 60)
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Name: ${personalData.vorname || ''} ${personalData.nachname || ''}`, 20, 67)
      doc.text(`Anschrift: ${personalData.strasse || ''} ${personalData.hausnummer || ''}, ${personalData.plz || ''} ${personalData.ort || ''}`, 20, 74)
      doc.text(`Telefon: ${personalData.telefonnummer || ''}`, 20, 81)
      doc.text(`E-Mail: ${personalData.email || ''}`, 20, 88)

      // Betreute Hunde
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Es soll(en) folgende(r) Hund(e) betreut werden:', 20, 100)
      
      let yOffset = 108
      pets.forEach((pet, index) => {
        if (yOffset > 240) {
          drawHeaderFooter(1)
          doc.addPage()
          yOffset = 20
        }
        
        doc.setFont('Helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(`Hund ${index + 1}: ${pet.name}`, 20, yOffset)
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(9)
        yOffset += 6
        
        doc.text(`Tierart: ${pet.tierart || '-'} | Rasse: ${pet.rasse || '-'} | Farbe: ${pet.farbe || '-'} | Geb.-Datum: ${pet.geburtsdatum ? new Date(pet.geburtsdatum).toLocaleDateString('de-DE') : '-'}`, 20, yOffset)
        yOffset += 5
        doc.text(`Geschlecht: ${pet.geschlecht || '-'} | Kastriert: ${pet.kastriert ? 'Ja' : 'Nein'} | Ableinbar: ${pet.ableinbar || '-'}`, 20, yOffset)
        yOffset += 5
        doc.text(`Chip-Nr: ${pet.chip_nummer || '-'} | Fütterung: ${pet.fütterungszeiten || '-'} | Menge: ${pet.futtermenge || '-'}`, 20, yOffset)
        yOffset += 5
        
        const details = `Besonderheiten / Medikamente / Unverträglichkeiten: ${pet.besonderheiten || pet.medikamente || 'Keine'}`
        const splitDetails = doc.splitTextToSize(details, 170)
        splitDetails.forEach((line: string) => {
          doc.text(line, 20, yOffset)
          yOffset += 5
        })
        yOffset += 4
      })

      // Notfallkontakt & Verpflichtung auf Seite 1
      if (yOffset > 240) {
        drawHeaderFooter(1)
        doc.addPage()
        yOffset = 20
      }

      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Im Notfall zu verständigen (Vertrauensperson):', 20, yOffset)
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      yOffset += 6
      doc.text(`Name: ${personalData.notfall_kontakt_name || '-'} | Telefonnummer: ${personalData.notfallnummer || '-'}`, 20, yOffset)
      
      yOffset += 12
      doc.setFont('Helvetica', 'bold')
      const complianceText = 'Der Hundehalter verpflichtet sich dazu, uns darüber zu informieren, wenn sich zwischen 2 Betreuungen etwas an den o.g. Angaben ändert. Die Änderung greift ab der darauffolgenden Betreuung.'
      const splitCompliance = doc.splitTextToSize(complianceText, 170)
      splitCompliance.forEach((line: string) => {
        doc.text(line, 20, yOffset)
        yOffset += 5
      })

      drawHeaderFooter(1)

      // --- SEITE 2: ZUSICHERUNGEN & PFLICHTEN ---
      doc.addPage()
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Zusicherungen und Pflichten beider Parteien', 20, 25)
      
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('(1) Der Tierbesitzer sichert zu, dass', 20, 35)
      
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      let textY = 42
      const assurances = [
        '• der Hund sein Eigentum ist und er über diesen frei verfügen kann.',
        '• der Hund stubenrein ist, nicht inkontinent ist oder in geschlossenen Räumen markiert.',
        '• das Tier über eine gültige Impfung gegen Hepatitis, Parvovirose, Leptospirose, Staupe und Zwingerhusten verfügt. Der Impfpass wird vor jedem Aufenthalt zur Durchsicht digital im Kundenportal hochgeladen.',
        '• der Hund wurmfrei ist (Entwurmung oder Kot-Test) und frei von ansteckenden Krankheiten und Ungeziefer ist, wobei die letzte Entwurmung/Kotuntersuchung nicht länger als drei Monate zurückliegt.',
        '• Mittel zur Floh- und Zeckenprophylaxe vorher verabreicht wurden und noch Schutz besteht.',
        '• der Hund gesund ist. Falls Krankheiten/Gebrechen bekannt sind, sind diese im Kundenprofil aufgeführt.',
        '• eine ordentliche Tierhalter-Haftpflichtversicherung besteht und die Folgeprämien bezahlt sind, sodass ein aktueller Versicherungsschutz besteht (Nachweis auf Wunsch vorzulegen).',
        '• der Hund steuerlich gemeldet ist.',
        '• alle Angaben vollständig und wahrheitsgetreu gemacht wurden. Der Tierhalter verpflichtet sich, etwaige Änderungen unverzüglich mitzuteilen.'
      ]

      assurances.forEach(item => {
        const splitItem = doc.splitTextToSize(item, 170)
        splitItem.forEach((line: string) => {
          doc.text(line, 20, textY)
          textY += 5
        })
        textY += 2
      })

      textY += 4
      doc.setFont('Helvetica', 'bold')
      doc.text('(2)', 20, textY)
      doc.setFont('Helvetica', 'normal')
      const para2 = 'Je nach Schwere der Erkrankung des Hundes ist tierisch gut betreut Gesellschaft mit beschränkter Haftung berechtigt, sowohl am Abgabetag als auch bei nachträglicher Feststellung sofort vom Vertrag zurückzutreten bzw. das Tier in tierärztliche Betreuung zu geben. Hier ist auf das Wohl des Tieres von beiden Vertragsparteien zu achten. Eventuell anfallende Mehrkosten sind vom Tierbesitzer zu tragen.'
      const splitPara2 = doc.splitTextToSize(para2, 160)
      splitPara2.forEach((line: string) => {
        doc.text(line, 27, textY)
        textY += 5
      })

      textY += 2
      doc.setFont('Helvetica', 'bold')
      doc.text('(3)', 20, textY)
      doc.setFont('Helvetica', 'normal')
      const para3 = 'Der Tierbesitzer haftet für anfallende Kosten, falls durch eine polizeiliche Kontrolle der Hund nicht oder unzureichend gekennzeichnet (Chip/Tattoo) ist.'
      const splitPara3 = doc.splitTextToSize(para3, 160)
      splitPara3.forEach((line: string) => {
        doc.text(line, 27, textY)
        textY += 5
      })

      textY += 2
      doc.setFont('Helvetica', 'bold')
      doc.text('(4)', 20, textY)
      doc.setFont('Helvetica', 'normal')
      const para4 = 'tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, das Tier art- und verhaltensgerecht laut Tierschutzgesetz, sowie dessen Nebenbestimmungen zu betreuen.'
      const splitPara4 = doc.splitTextToSize(para4, 160)
      splitPara4.forEach((line: string) => {
        doc.text(line, 27, textY)
        textY += 5
      })

      drawHeaderFooter(2)

      // --- SEITE 3: VERTRAULICHKEIT & HAFTUNG ---
      doc.addPage()
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Vertraulichkeit und Sorgfalt beider Parteien', 20, 25)
      
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      textY = 35

      const sectionsPage3 = [
        { num: '(1)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, über alle ihr im Rahmen ihrer Tätigkeit für den Tierbesitzer auf Grundlage dieses Vertrages bekannt gewordenen Informationen auch nach Ablauf der Vertragsdauer Stillschweigen zu bewahren. Gleiches gilt umgekehrt.' },
        { num: '(2)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich auch, die anvertrauten Tiere nur mit größter Sorgfalt zu behandeln.' },
        { num: '(3)', text: 'Der Tierbesitzer erklärt sich mit der Aufnahme und (elektronischen) Speicherung der in diesem Vertrag und ggf. in der Zusatzvereinbarung erhobenen Daten einverstanden. Die Daten dürfen im Rahmen der Vertragsabwicklung bspw. im Krankheitsfall an den Tierarzt weitergegeben werden.' }
      ]

      sectionsPage3.forEach(sec => {
        doc.setFont('Helvetica', 'bold')
        doc.text(sec.num, 20, textY)
        doc.setFont('Helvetica', 'normal')
        const splitText = doc.splitTextToSize(sec.text, 160)
        splitText.forEach((line: string) => {
          doc.text(line, 27, textY)
          textY += 5
        })
        textY += 3
      })

      textY += 4
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Haftung beider Parteien', 20, textY)
      textY += 10
      doc.setFontSize(9)

      const liabilitySections = [
        { num: '(1)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung bestätigt, dass eine Betriebshaftpflichtversicherung besteht.' },
        { num: '(2)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet für Sachschäden und Schäden an den in Obhut gegebenen Hunden nur soweit, als diese Schäden auf Vorsatz oder grob fahrlässiges Handeln der Betreuungsperson oder deren Erfüllungsgehilfen zurückzuführen sind.' },
        { num: '(3)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet nicht für durch die Tiere verursachte Schäden oder Kosten. Sie ist von sämtlichen mit dem Betreuungstier in Verbindung stehenden Ansprüchen Dritter seitens des Tierbesitzers freizustellen. Trotz größter Sorgfalt kann das Risiko eines Entlaufens oder Erkrankung nicht gänzlich ausgeschlossen werden. Eine Haftung seitens tierisch gut betreut Gesellschaft mit beschränkter Haftung besteht jedoch nicht.' },
        { num: '(4)', text: 'Für Schäden, welche ein Hund verursacht, die nicht oder nicht ausreichend durch die Hundehaftpflichtversicherung oder private Haftpflichtversicherung abgedeckt sind, haftet allein der Tierbesitzer.' }
      ]

      liabilitySections.forEach(sec => {
        doc.setFont('Helvetica', 'bold')
        doc.text(sec.num, 20, textY)
        doc.setFont('Helvetica', 'normal')
        const splitText = doc.splitTextToSize(sec.text, 160)
        splitText.forEach((line: string) => {
          doc.text(line, 27, textY)
          textY += 5
        })
        textY += 3
      })

      textY += 4
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Information', 20, textY)
      textY += 10
      doc.setFontSize(9)

      const infoSections = [
        { num: '(1)', text: 'tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, bei Auftreten von schwerwiegenden Problemen (plötzliche Krankheit des Tieres, auffällige Verhaltensänderung, etc.) den Tierbesitzer oder dessen Kontaktperson umgehend zu benachrichtigen.' },
        { num: '(2)', text: 'Der Tierbesitzer hat das Recht, sich während der Betreuungszeit bei der Betreuungsperson nach dem Wohl des Tieres zu erkundigen. tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, wahrheitsgemäße Aussagen hierüber zu machen.' }
      ]

      infoSections.forEach(sec => {
        doc.setFont('Helvetica', 'bold')
        doc.text(sec.num, 20, textY)
        doc.setFont('Helvetica', 'normal')
        const splitText = doc.splitTextToSize(sec.text, 160)
        splitText.forEach((line: string) => {
          doc.text(line, 27, textY)
          textY += 5
        })
        textY += 3
      })

      drawHeaderFooter(3)

      // --- SEITE 4: NOTFALL & STORNIERUNG ---
      doc.addPage()
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      textY = 25

      doc.setFont('Helvetica', 'bold')
      doc.text('(3)', 20, textY)
      doc.setFont('Helvetica', 'normal')
      const page4Para3 = 'Der Tierbesitzer hat eine Vertrauensperson zu benennen, welche tierisch gut betreut Gesellschaft mit beschränkter Haftung kontaktieren kann falls eine Situation eintritt, welche schnelles Handeln erfordert und der Tierbesitzer nicht erreichbar ist.'
      const splitPage4Para3 = doc.splitTextToSize(page4Para3, 160)
      splitPage4Para3.forEach((line: string) => {
        doc.text(line, 27, textY)
        textY += 5
      })

      textY += 6
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Notfall', 20, textY)
      textY += 10
      doc.setFontSize(9)

      const emergencySections = [
        { num: '(1)', text: 'Der Tierhalter erklärt sich damit einverstanden, dass in Notfällen und bei akuten Erkrankungen oder Verletzungen die erforderliche Behandlung bei einem Tierarzt erfolgt, der von tierisch gut betreut Gesellschaft mit beschränkter Haftung bestimmt wird. Für diesen Fall ist tierisch gut betreut Gesellschaft mit beschränkter Haftung ausdrücklich ermächtigt, im Namen und auf Rechnung des Kunden eine Tierarztpraxis/-klinik mit der tierärztlichen Versorgung und Behandlung des Tieres zu beauftragen. Die Kosten übernimmt der Tierhalter.' },
        { num: '(2)', text: 'Die Kostenübernahme seitens des Halters gilt auch für einen nötigen Transport mit der Tierrettung Südbaden e.V.' },
        { num: '(3)', text: 'Im Falle einer tierärztlichen Behandlung übernimmt die entscheidungsermächtigte Person die Bezahlung der Tierarztkosten, sollte dieser nicht auf Rechnung arbeiten.' }
      ]

      emergencySections.forEach(sec => {
        doc.setFont('Helvetica', 'bold')
        doc.text(sec.num, 20, textY)
        doc.setFont('Helvetica', 'normal')
        const splitText = doc.splitTextToSize(sec.text, 160)
        splitText.forEach((line: string) => {
          doc.text(line, 27, textY)
          textY += 5
        })
        textY += 3
      })

      textY += 6
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('STORNIERUNG', 20, textY)
      textY += 10
      doc.setFontSize(9)

      const cancellationTexts = [
        '• 15 Tage und mehr vor Check-In: 100% Rückerstattung (kostenlos)',
        '• 14 - 7 Tage vor Check-In: 50% Rückerstattung / Stornogebühr',
        '• 6 Tage und weniger vor Check-In: keine Rückerstattung (100% der Buchungssumme)',
        '',
        'Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.',
        'Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.'
      ]

      cancellationTexts.forEach(line => {
        if (!line) {
          textY += 3
          return
        }
        const splitText = doc.splitTextToSize(line, 170)
        splitText.forEach((lineText: string) => {
          doc.text(lineText, 20, textY)
          textY += 5
        })
      })

      drawHeaderFooter(4)

      // --- SEITE 5: DATENSCHUTZ & UNTERSCHRIFT ---
      doc.addPage()
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Datenschutz', 20, 25)
      doc.setFontSize(11)
      doc.text('Nutzung personenbezogener Daten, Fotos und Videos', 20, 33)
      
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Der Tierbesitzer ist damit einverstanden,', 20, 42)
      textY = 50
      doc.setFontSize(9)

      const privacySections = [
        { num: '(1)', text: 'dass tierisch gut betreut Gesellschaft mit beschränkter Haftung personenbezogene Daten speichern und verarbeiten darf. Die Daten dürfen nicht an dritte Personen weitergegeben werden, und sind auf Aufforderung unverzüglich zu löschen.' },
        { num: '(2)', text: `dass Fotos und Videos von dem betreuten Tier/den betreuten Tieren in die Homepage, etc. von tierisch gut betreut Gesellschaft mit beschränkter Haftung eingestellt werden dürfen. Der Tierbesitzer bleibt hierbei anonym und es wird ausschließlich der Name des Tieres, Tierart, Rasse sowie Datum/Zeitraum veröffentlicht. \nStatus der Einwilligung: ${fotoVideoConsent ? 'JA, erteilt.' : 'NEIN, widersprochen.'}` }
      ]

      privacySections.forEach(sec => {
        doc.setFont('Helvetica', 'bold')
        doc.text(sec.num, 20, textY)
        doc.setFont('Helvetica', 'normal')
        const splitText = doc.splitTextToSize(sec.text, 160)
        splitText.forEach((line: string) => {
          doc.text(line, 27, textY)
          textY += 5
        })
        textY += 3
      })

      textY += 15
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Unterschrift des Tierbesitzers (digital geleistet):', 20, textY)
      textY += 6

      // Füge das Unterschriftsbild ein
      doc.addImage(signatureImage, 'PNG', 20, textY, 60, 25)
      
      textY += 33
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, textY)
      doc.text('Ort: Moos', 100, textY)

      drawHeaderFooter(5)

      // 2. In File konvertieren
      const pdfBlob = doc.output('blob')
      const pdfFile = new File([pdfBlob], 'Pflegevertrag.pdf', { type: 'application/pdf' })

      // 3. In Storage hochladen & Dokumenteintrag erstellen
      const uploadFormData = new FormData()
      uploadFormData.append('file', pdfFile)
      uploadFormData.append('document_type', 'vertrag')

      const uploadResponse = await authenticatedFetch('/api/portal/documents', {
        method: 'POST',
        body: uploadFormData
      })

      if (!uploadResponse.ok) {
        const uploadErr = await uploadResponse.json()
        throw new Error(uploadErr.error || 'Fehler beim Hochladen des Vertrags-PDFs')
      }

      // 4. E-Mail versenden
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(pdfFile)
      })

      const mailResponse = await authenticatedFetch('/api/portal/contracts/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          fileName: 'Pflegevertrag.pdf'
        })
      })

      if (!mailResponse.ok) {
        console.error('Fehler beim E-Mail-Versand, fahren aber fort')
      }

      // 5. Profil und Onboarding als abgeschlossen markieren
      const profileResponse = await authenticatedFetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding_completed: true,
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        })
      })

      if (profileResponse.ok) {
        toast({
          title: 'Onboarding abgeschlossen!',
          description: 'Der Pflegevertrag wurde erfolgreich unterzeichnet.',
        })
        router.push('/portal')
      } else {
        const errorData = await profileResponse.json()
        throw new Error(errorData.error || 'Fehler beim Aktualisieren des Onboarding-Status')
      }

    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Abschließen des Onboardings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveStep1() {
    setSaving(true)
    try {
      const response = await authenticatedFetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalData),
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        toast({
          title: 'Persönliche Daten gespeichert',
          description: 'Bitte fahre mit Schritt 2 fort.',
        })
        // Weiter zu Schritt 2
        setStep(2)
        router.push('/portal/profile?onboarding=true&step=2')
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePet() {
    const saveError = validatePetSaveRequired(petFormData)
    if (saveError) {
      toast({
        title: 'Fehler',
        description: saveError,
        variant: 'destructive',
      })
      return
    }

    const saveWarning = formatPetSaveWarning(
      getPetSaveWarnings({
        formData: petFormData,
        documents,
        editingPetId,
        impfpassFile,
        wurmtestFile,
      })
    )
    if (saveWarning) {
      toast({
        title: 'Hinweis',
        description: saveWarning,
      })
    }

    try {
      setUploadingDocuments(true)
      
      const url = editingPetId 
        ? `/api/portal/pets/${editingPetId}`
        : '/api/portal/pets'
      const method = editingPetId ? 'PUT' : 'POST'
      
      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
        setUploadingDocuments(false)
        return
      }

      const petData = await response.json()
      const savedPetId = petData.pet?.id || editingPetId

      if (!editingPetId && savedPetId) {
        setEditingPetId(savedPetId)
      }

      // Lade Dokumente hoch, falls vorhanden
      if (savedPetId) {
        const uploadPromises = []
        
        if (impfpassFile) {
          const formData = new FormData()
          formData.append('file', impfpassFile)
          formData.append('document_type', 'impfpass')
          formData.append('pet_id', savedPetId)
          
          uploadPromises.push(
            authenticatedFetch('/api/portal/documents', {
              method: 'POST',
              body: formData,
            }).catch(err => {
              console.error('Error uploading impfpass:', err)
              toast({
                title: 'Warnung',
                description: 'Impfpass konnte nicht hochgeladen werden',
                variant: 'destructive',
              })
            })
          )
        }

        if (wurmtestFile) {
          const formData = new FormData()
          formData.append('file', wurmtestFile)
          formData.append('document_type', 'wurmtest')
          formData.append('pet_id', savedPetId)
          
          uploadPromises.push(
            authenticatedFetch('/api/portal/documents', {
              method: 'POST',
              body: formData,
            }).catch(err => {
              console.error('Error uploading wurmtest:', err)
              toast({
                title: 'Warnung',
                description: 'Wurmtest konnte nicht hochgeladen werden',
                variant: 'destructive',
              })
            })
          )
        }

        await Promise.all(uploadPromises)
      }

      await loadPets()

      const missingPhoto = (petData.pet?.photo_count ?? formPhotoCount) === 0

      if (missingPhoto) {
        setEditingPetId(savedPetId)
        setShowPetForm(true)
        toast({
          title: 'Hinweis',
          description:
            'Bitte lade noch mindestens ein Foto deines Tieres hoch – das hilft uns bei der Wiedererkennung.',
        })
      } else {
        setPetFormData({
          name: '',
          tierart: '',
          rasse: '',
          farbe: '',
          wiedererkennungsmerkmal: '',
          geschlecht: '',
          letzte_impfung: '',
          letzte_impfung_zusatz: '',
          futtermenge: '',
          medikamente: '',
          besonderheiten: '',
          intervall_impfung: '',
          intervall_entwurmung: '',
          letzte_stuhlprobe: '',
        })
        setImpfpassFile(null)
        setWurmtestFile(null)
        setShowPetForm(false)
        setEditingPetId(null)
        setFormPhotoCount(0)
        toast({
          title: 'Erfolg',
          description: editingPetId ? 'Tier erfolgreich aktualisiert' : 'Tier erfolgreich hinzugefügt',
        })
      }
    } catch (error) {
      console.error('Error saving pet:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setUploadingDocuments(false)
    }
  }

  function openPetForm(pet?: Pet) {
    if (pet) {
      setEditingPetId(pet.id)
      setPetFormData({
        name: pet.name,
        tierart: pet.tierart || '',
        rasse: pet.rasse || '',
        farbe: pet.farbe || '',
        wiedererkennungsmerkmal: pet.wiedererkennungsmerkmal || '',
        geschlecht: pet.geschlecht || '',
        letzte_impfung: pet.letzte_impfung ? pet.letzte_impfung.split('T')[0] : '',
        letzte_impfung_zusatz: pet.letzte_impfung_zusatz ? pet.letzte_impfung_zusatz.split('T')[0] : '',
        futtermenge: pet.futtermenge || '',
        medikamente: pet.medikamente || '',
        besonderheiten: pet.besonderheiten || '',
        intervall_impfung: pet.intervall_impfung || '',
        intervall_entwurmung: pet.intervall_entwurmung || '',
        letzte_stuhlprobe: pet.letzte_stuhlprobe || '',
      })
    } else {
      setEditingPetId(null)
      setPetFormData({
        name: '',
        tierart: '',
        rasse: '',
        farbe: '',
        wiedererkennungsmerkmal: '',
        geschlecht: '',
        letzte_impfung: '',
        letzte_impfung_zusatz: '',
        futtermenge: '',
        medikamente: '',
        besonderheiten: '',
        intervall_impfung: '',
        intervall_entwurmung: '',
        letzte_stuhlprobe: '',
      })
    }
    // Dateien zurücksetzen beim Öffnen des Formulars
    setImpfpassFile(null)
    setWurmtestFile(null)
    setFormPhotoCount(pet?.photo_count ?? 0)
    setShowPetForm(true)
  }

  async function handleDeletePet(petId: string) {
    try {
      const response = await authenticatedFetch(`/api/portal/pets/${petId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadPets()
        toast({
          title: 'Erfolg',
          description: 'Tier erfolgreich gelöscht',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Löschen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting pet:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Löschen',
        variant: 'destructive',
      })
    }
  }

  async function handleSaveStep2Next() {
    if (pets.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte füge mindestens ein Tier hinzu.',
        variant: 'destructive',
      })
      return
    }
    setStep(3)
    router.push('/portal/profile?onboarding=true&step=3')
  }

  async function handleSaveStep2() {
    setSaving(true)
    try {
      // Markiere Onboarding als abgeschlossen (Tierinformationen sind jetzt pro Tier gespeichert)
      const response = await authenticatedFetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding_completed: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        toast({
          title: 'Onboarding abgeschlossen!',
          description: 'Willkommen bei Tierisch Gut Betreut!',
        })
        // Nach dem Onboarding zum Portal weiterleiten
        router.push('/portal')
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    // Normales Speichern (nicht im Onboarding)
    // Tierinformationen werden jetzt pro Tier gespeichert, nicht mehr auf Customer-Ebene
    setSaving(true)
    try {
      const response = await authenticatedFetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalData),
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        toast({
          title: 'Erfolg',
          description: 'Profil erfolgreich gespeichert',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Fehler beim Speichern',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const hasExistingImpfpass = editingPetId && documents.some(d => d.pet_id === editingPetId && d.document_type === 'impfpass')
  const hasExistingWurmtest = editingPetId && documents.some(d => d.pet_id === editingPetId && d.document_type === 'wurmtest')

  return (
    <div className="space-y-6">
      {/* Schritt-Indikator */}
      {isOnboarding && (
        <Card className="bg-white border-sage-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 md:gap-8">
              {/* Schritt 1 */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === 1 
                    ? 'bg-sage-600 text-white ring-4 ring-sage-200' 
                    : step > 1
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <div className="text-center">
                  <p className={`text-xs md:text-sm font-semibold ${step >= 1 ? 'text-sage-900' : 'text-gray-400'}`}>
                    Persönliche Daten
                  </p>
                  {step === 1 && (
                    <p className="text-[10px] md:text-xs text-sage-600 mt-1">Aktueller Schritt</p>
                  )}
                </div>
              </div>
              
              {/* Verbindungslinie 1 */}
              <div className={`flex-1 h-1 transition-all ${
                step >= 2 ? 'bg-green-600' : 'bg-gray-200'
              }`} />
              
              {/* Schritt 2 */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === 2 
                    ? 'bg-sage-600 text-white ring-4 ring-sage-200' 
                    : step > 2
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <div className="text-center">
                  <p className={`text-xs md:text-sm font-semibold ${step >= 2 ? 'text-sage-900' : 'text-gray-400'}`}>
                    Tier/e & Infos
                  </p>
                  {step === 2 && (
                    <p className="text-[10px] md:text-xs text-sage-600 mt-1">Aktueller Schritt</p>
                  )}
                </div>
              </div>

              {/* Verbindungslinie 2 */}
              <div className={`flex-1 h-1 transition-all ${
                step >= 3 ? 'bg-green-600' : 'bg-gray-200'
              }`} />
              
              {/* Schritt 3 */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === 3 
                    ? 'bg-sage-600 text-white ring-4 ring-sage-200' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <div className="text-center">
                  <p className={`text-xs md:text-sm font-semibold ${step >= 3 ? 'text-sage-900' : 'text-gray-400'}`}>
                    Pflegevertrag
                  </p>
                  {step === 3 && (
                    <p className="text-[10px] md:text-xs text-sage-600 mt-1">Aktueller Schritt</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-3xl font-bold text-sage-900">
          {isOnboarding 
            ? (step === 1 ? 'Schritt 1: Persönliche Daten' : step === 2 ? 'Schritt 2: Tier/e & Informationen' : 'Schritt 3: Pflegevertrag unterzeichnen')
            : 'Mein Profil'}
        </h1>
        <p className="mt-2 text-sage-600">
          {isOnboarding 
            ? (step === 1 
                ? 'Bitte fülle deine persönlichen Daten aus.'
                : step === 2
                ? 'Lege deine Tier/e an und ergänze die Tierinformationen.'
                : 'Lies den Pflegevertrag sorgfältig durch und unterzeichne ihn digital.')
            : 'Verwalte deine persönlichen Daten'}
        </p>
      </div>

      {/* Schritt 1: Persönliche Daten */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{isOnboarding ? 'Schritt 1: Persönliche Daten' : 'Persönliche Daten'}</CardTitle>
            <CardDescription>
              Deine Daten wurden bereits aus unserem System geladen. Bitte überprüfe und vervollständige diese.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vorname">Vorname *</Label>
                <Input
                  id="vorname"
                  value={personalData.vorname}
                  onChange={(e) => setPersonalData({ ...personalData, vorname: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nachname">Nachname *</Label>
                <Input
                  id="nachname"
                  value={personalData.nachname}
                  onChange={(e) => setPersonalData({ ...personalData, nachname: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={personalData.email}
                  onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefonnummer">Telefonnummer *</Label>
                <Input
                  id="telefonnummer"
                  type="tel"
                  value={personalData.telefonnummer}
                  onChange={(e) => setPersonalData({ ...personalData, telefonnummer: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefon_2">2. Telefonnummer</Label>
                <Input
                  id="telefon_2"
                  value={personalData.telefon_2}
                  onChange={(e) => setPersonalData({ ...personalData, telefon_2: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Notfallkontakt</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notfall_kontakt_name">Name</Label>
                  <Input
                    id="notfall_kontakt_name"
                    value={personalData.notfall_kontakt_name}
                    onChange={(e) => setPersonalData({ ...personalData, notfall_kontakt_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notfallnummer">Notfallnummer</Label>
                  <Input
                    id="notfallnummer"
                    value={personalData.notfallnummer}
                    onChange={(e) => setPersonalData({ ...personalData, notfallnummer: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="datenschutz"
                checked={personalData.datenschutz}
                onChange={(e) => setPersonalData({ ...personalData, datenschutz: e.target.checked })}
                className="rounded border-sage-300"
              />
              <Label htmlFor="datenschutz">Ich stimme der Datenschutzerklärung zu *</Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {isOnboarding ? (
                <>
                  <Button
                    onClick={handleSaveStep1}
                    disabled={saving || !personalData.datenschutz || !personalData.nachname || !personalData.vorname || !personalData.email || !personalData.telefonnummer}
                    className="flex-1 bg-sage-600 hover:bg-sage-700 text-lg py-6"
                  >
                    {saving ? 'Wird gespeichert...' : 'Weiter zu Schritt 2 →'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/portal')}
                    className="border-sage-300 text-sage-700 hover:bg-sage-50 text-lg py-6"
                  >
                    Später fortfahren
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  {saving ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schritt 2: Tier/e & Tierinformationen */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Tier/e anlegen */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>{isOnboarding ? 'Schritt 2: Deine Tier/e' : 'Deine Tier/e'}</CardTitle>
                  <CardDescription className="mt-1">
                    Lege mindestens ein Tier an und ergänze die Tier-Informationen (Futter, Medikamente, Intervalle) für jedes Tier.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openPetForm()}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tier hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPetForm && (
                <div className="p-4 border border-sage-200 rounded-lg bg-sage-50 space-y-4">
                  <p className="text-sm text-sage-600">
                    Speichere zuerst Name und Tierart – Impfpass, Wurmtest und weitere Angaben kannst du
                    danach jederzeit ergänzen.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pet-name">Name *</Label>
                      <Input
                        id="pet-name"
                        value={petFormData.name}
                        onChange={(e) => setPetFormData({ ...petFormData, name: e.target.value })}
                        placeholder="Name des Tieres"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pet-tierart">Tierart *</Label>
                      <Select
                        value={petFormData.tierart}
                        onValueChange={(value) => setPetFormData({ ...petFormData, tierart: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tierart wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hund">Hund</SelectItem>
                          <SelectItem value="Katze">Katze</SelectItem>
                          <SelectItem value="Andere">Andere</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pet-geschlecht">Geschlecht</Label>
                      <Select
                        value={petFormData.geschlecht}
                        onValueChange={(value) => setPetFormData({ ...petFormData, geschlecht: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Geschlecht wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hündin">Hündin</SelectItem>
                          <SelectItem value="rüde">Rüde</SelectItem>
                          <SelectItem value="rüde_kastriert">Rüde - kastiert</SelectItem>
                          <SelectItem value="rüde_kastriert_gechipt">Rüde - kastiert - gechipt</SelectItem>
                          <SelectItem value="hündin_kastriert">Hündin - kastriert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pet-rasse">Rasse</Label>
                      <Input
                        id="pet-rasse"
                        value={petFormData.rasse}
                        onChange={(e) => setPetFormData({ ...petFormData, rasse: e.target.value })}
                        placeholder="z.B. Labrador, Mischling"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pet-farbe">Farbe</Label>
                      <Input
                        id="pet-farbe"
                        value={petFormData.farbe}
                        onChange={(e) => setPetFormData({ ...petFormData, farbe: e.target.value })}
                        placeholder="z.B. schwarz, braun-weiß"
                      />
                    </div>
                  </div>

                  <PetRecognitionField
                    id="onboarding-pet-wiedererkennungsmerkmal"
                    value={petFormData.wiedererkennungsmerkmal || ''}
                    onChange={(value) => setPetFormData({ ...petFormData, wiedererkennungsmerkmal: value })}
                  />

                  <PetPhotoGallery
                    petId={editingPetId}
                    onPhotoCountChange={(count) => {
                      setFormPhotoCount(count)
                      if (count > 0) void loadPets()
                    }}
                  />

                  {/* Tier-Informationen */}
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold text-sage-900">Tier-Informationen</h3>
                    <div>
                      <Label htmlFor="pet-futtermenge">Futtermenge</Label>
                      <Textarea
                        id="pet-futtermenge"
                        value={petFormData.futtermenge}
                        onChange={(e) => setPetFormData({ ...petFormData, futtermenge: e.target.value })}
                        rows={3}
                        placeholder="z.B. 200g Trockenfutter morgens, 150g abends"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pet-medikamente">Medikamente</Label>
                      <Textarea
                        id="pet-medikamente"
                        value={petFormData.medikamente}
                        onChange={(e) => setPetFormData({ ...petFormData, medikamente: e.target.value })}
                        rows={3}
                        placeholder="z.B. Tabletten gegen Arthrose, täglich morgens"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pet-besonderheiten">Besonderheiten</Label>
                      <Textarea
                        id="pet-besonderheiten"
                        value={petFormData.besonderheiten}
                        onChange={(e) => setPetFormData({ ...petFormData, besonderheiten: e.target.value })}
                        rows={3}
                        placeholder="z.B. Allergien, Verhaltensbesonderheiten, etc."
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Intervalle</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isDog(petFormData.tierart) && (
                          <div>
                            <Label htmlFor="pet-intervall-impfung">Intervall Impfung</Label>
                            <Select
                              value={petFormData.intervall_impfung || ''}
                              onValueChange={(value) => setPetFormData({ ...petFormData, intervall_impfung: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Intervall wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monatlich">Monatlich</SelectItem>
                                <SelectItem value="vierteljährlich">Vierteljährlich</SelectItem>
                                <SelectItem value="halbjährlich">Halbjährlich</SelectItem>
                                <SelectItem value="jährlich">Jährlich</SelectItem>
                                <SelectItem value="alle_2_jahre">Alle 2 Jahre</SelectItem>
                                <SelectItem value="alle_3_jahre">Alle 3 Jahre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label htmlFor="pet-intervall-entwurmung">Intervall Entwurmung/Testung</Label>
                          <Select
                            value={petFormData.intervall_entwurmung || ''}
                            onValueChange={(value) => setPetFormData({ ...petFormData, intervall_entwurmung: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Intervall wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monatlich">Monatlich</SelectItem>
                              <SelectItem value="vierteljährlich">Vierteljährlich</SelectItem>
                              <SelectItem value="halbjährlich">Halbjährlich</SelectItem>
                              <SelectItem value="jährlich">Jährlich</SelectItem>
                              <SelectItem value="alle_2_jahre">Alle 2 Jahre</SelectItem>
                              <SelectItem value="alle_3_jahre">Alle 3 Jahre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dokumente & Vorsorge */}
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold text-sage-900">Dokumente & Vorsorge</h3>
                    
                    <PetVaccinationSection
                      values={petFormData}
                      onChange={(updates) => setPetFormData({ ...petFormData, ...updates })}
                      idPrefix="profile-pet"
                      hasExistingImpfpass={!!hasExistingImpfpass}
                      impfpassFile={impfpassFile}
                      onImpfpassChange={setImpfpassFile}
                    />

                    {/* Wurmtest Bereich */}
                    <div className="p-4 bg-sage-50/50 rounded-lg border border-sage-100 space-y-4">
                      <h4 className="font-semibold text-sm text-sage-800 border-b pb-1">Wurmtest & Entwurmung</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pet-wurmtest">
                            Wurmtest (Foto aufnehmen, Bild oder PDF){' '}
                            {hasExistingWurmtest ? '(bereits hochgeladen)' : '(später nachreichbar)'}
                          </Label>
                          <Input
                            id="pet-wurmtest"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              setWurmtestFile(file || null)
                            }}
                          />
                          {wurmtestFile && (
                            <p className="text-sm text-sage-600 mt-1">
                              Ausgewählt: {wurmtestFile.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="pet-stuhlprobe">
                            Datum der letzten Entwurmung/Stuhlprobe (später nachreichbar)
                          </Label>
                          <Input
                            id="pet-stuhlprobe"
                            type="date"
                            value={petFormData.letzte_stuhlprobe}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setPetFormData({ ...petFormData, letzte_stuhlprobe: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSavePet}
                      disabled={!petFormData.name || !petFormData.tierart || uploadingDocuments}
                      className="bg-sage-600 hover:bg-sage-700"
                    >
                      {uploadingDocuments 
                        ? 'Wird gespeichert...' 
                        : editingPetId 
                        ? 'Tier aktualisieren' 
                        : 'Tier speichern'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPetForm(false)
                        setEditingPetId(null)
                        setPetFormData({
                          name: '',
                          tierart: '',
                          rasse: '',
                          farbe: '',
                          wiedererkennungsmerkmal: '',
                          geschlecht: '',
                          letzte_impfung: '',
                          letzte_impfung_zusatz: '',
                          futtermenge: '',
                          medikamente: '',
                          besonderheiten: '',
                          intervall_impfung: '',
                          intervall_entwurmung: '',
                          letzte_stuhlprobe: '',
                        })
                        setImpfpassFile(null)
                        setWurmtestFile(null)
                        setFormPhotoCount(0)
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}

              {pets.length === 0 ? (
                <p className="text-sage-600 text-center py-8">
                  Noch keine Tier/e angelegt. Bitte füge mindestens ein Tier hinzu.
                </p>
              ) : (
                <div className="space-y-4">
                  {pets.map((pet) => (
                    <div key={pet.id} className="p-4 border border-sage-200 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg">{pet.name}</p>
                          <p className="text-sm text-sage-600">
                            {[pet.tierart, pet.rasse, pet.farbe, pet.geschlecht].filter(Boolean).join(' • ')}
                          </p>
                          <PetMissingFieldsHint
                            pet={pet}
                            documents={documents}
                            className="mt-2 text-sm text-amber-700"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPetForm(pet)}
                            className="border-sage-300 text-sage-700 hover:bg-sage-50"
                          >
                            Bearbeiten
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePet(pet.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {(pet.futtermenge || pet.medikamente || pet.besonderheiten || pet.intervall_impfung || pet.intervall_entwurmung || pet.letzte_stuhlprobe) && (
                        <div className="mt-3 pt-3 border-t border-sage-200 space-y-2">
                          {pet.letzte_stuhlprobe && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Letzte Entwurmung/Stuhlprobe:</p>
                              <p className="text-sm text-sage-700">
                                {new Date(pet.letzte_stuhlprobe).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                          )}
                          {pet.futtermenge && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Futtermenge:</p>
                              <p className="text-sm text-sage-700">{pet.futtermenge}</p>
                            </div>
                          )}
                          {pet.medikamente && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Medikamente:</p>
                              <p className="text-sm text-sage-700">{pet.medikamente}</p>
                            </div>
                          )}
                          {pet.besonderheiten && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Besonderheiten:</p>
                              <p className="text-sm text-sage-700">{pet.besonderheiten}</p>
                            </div>
                          )}
                          <PetVaccinationSummary pet={pet} />
                          {pet.intervall_entwurmung && (
                            <div>
                              <p className="text-xs font-semibold text-sage-600">Entwurmung:</p>
                              <p className="text-sm text-sage-700">{pet.intervall_entwurmung}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abschluss-Button für Onboarding */}
          {isOnboarding && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1)
                      router.push('/portal/profile?onboarding=true&step=1')
                    }}
                    className="border-sage-300 text-sage-700 hover:bg-sage-50"
                  >
                    ← Zurück zu Schritt 1
                  </Button>
                  <Button
                    onClick={handleSaveStep2Next}
                    disabled={pets.length === 0}
                    className="flex-1 bg-sage-600 hover:bg-sage-700 text-lg py-6"
                  >
                    Weiter zu Schritt 3 →
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/portal')}
                    className="border-sage-300 text-sage-700 hover:bg-sage-50"
                  >
                    Später fortfahren
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Schritt 3: Pflegevertrag */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PFLEGEVERTRAG für den Hundeurlaub in der Pension</CardTitle>
              <CardDescription>
                Bitte lies den Vertrag aufmerksam durch. Du kannst direkt hier unterschreiben oder den QR-Code nutzen, um bequem auf deinem Smartphone zu signieren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vertragstext Box */}
              <div className="border rounded-lg p-4 h-64 overflow-y-scroll bg-sage-50 text-sm text-sage-800 space-y-4">
                <h3 className="font-bold text-base border-b pb-2">Zusicherungen und Pflichten beider Parteien</h3>
                <p>
                  <strong>(1) Der Tierbesitzer sichert zu, dass:</strong>
                  <br />
                  - der Hund sein Eigentum ist und er über diesen frei verfügen kann.
                  <br />
                  - der Hund stubenrein ist, nicht inkontinent ist oder in geschlossenen Räumen markiert.
                  <br />
                  - das Tier über eine gültige Impfung gegen Hepatitis, Parvovirose, Leptospirose, Staupe und Zwingerhusten verfügt. Der Impfpass wird vor jedem Aufenthalt zur Durchsicht an tierisch gut betreut Gesellschaft mit beschränkter Haftung per Mail zugesandt oder hochgeladen.
                  <br />
                  - der Hund wurmfrei ist (Entwurmung oder negativer Kot-Test nicht älter als drei Monate).
                </p>
                <p>
                  <strong>(2) Erkrankungen & Tierarzt:</strong>
                  <br />
                  Je nach Schwere der Erkrankung ist tierisch gut betreut Gesellschaft mit beschränkter Haftung berechtigt, vom Vertrag zurückzutreten oder das Tier in tierärztliche Betreuung zu geben. Die anfallenden Kosten werden vom Tierbesitzer getragen.
                </p>
                <p>
                  <strong>(3) Haftung:</strong>
                  <br />
                  tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet für Sachschäden und Schäden an den Hunden nur bei Vorsatz oder grober Fahrlässigkeit. Für Schäden, die der Hund verursacht, haftet allein der Tierbesitzer.
                </p>
                <p>
                  <strong>(4) Notfall-Vollmacht:</strong>
                  <br />
                  Der Tierhalter erklärt sich einverstanden, dass in Notfällen die erforderliche Behandlung bei einem Tierarzt oder in einer Tierklinik erfolgt. Die Kosten übernimmt der Tierhalter.
                </p>
              </div>

              {/* Einverständniserklärungen */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="dataConsent"
                    checked={dataConsent}
                    onChange={(e) => setDataConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-500"
                  />
                  <label htmlFor="dataConsent" className="text-sm text-sage-700">
                    <strong>Datenschutzerklärung (Pflicht):</strong> Ich stimme der Erhebung, Speicherung und elektronischen Verarbeitung meiner Daten sowie der Daten meines Tieres zum Zweck der Betreuung und Vertragsabwicklung zu.
                  </label>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="fotoConsent"
                    checked={fotoVideoConsent}
                    onChange={(e) => setFotoVideoConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-500"
                  />
                  <label htmlFor="fotoConsent" className="text-sm text-sage-700">
                    <strong>Foto- & Videofreigabe (Freiwillig):</strong> Ich willige ein, dass Fotos und Videos von meinem Tier auf der Homepage oder sozialen Medien von tierisch gut betreut Gesellschaft mit beschränkter Haftung veröffentlicht werden dürfen.
                  </label>
                </div>
              </div>

              {/* Unterschriften Bereich */}
              <div className="pt-6 border-t space-y-4">
                <h4 className="font-bold text-sm text-sage-900">Vertrag unterschreiben</h4>
                
                {signatureImage ? (
                  <div className="space-y-2">
                    <p className="text-sm text-emerald-600 font-semibold">✓ Unterschrift erfasst:</p>
                    <div className="border rounded bg-white p-2 w-64 h-24 flex items-center justify-center">
                      <img src={signatureImage} alt="Digitale Unterschrift" className="max-h-full max-w-full" />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setSignatureImage(null)}
                      className="text-xs text-red-600 hover:text-red-700 p-0 h-auto"
                    >
                      Unterschrift zurücksetzen
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Desktop/Mobil Unterschrift */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-sage-600 hidden md:block">Option A: Direkt am Bildschirm unterzeichnen</p>
                      <p className="text-xs font-semibold text-sage-600 md:hidden">Hier mit dem Finger unterzeichnen</p>
                      <div className="border border-dashed rounded-lg bg-white overflow-hidden">
                        <canvas
                          ref={desktopCanvasRef}
                          className="w-full h-[150px] cursor-crosshair bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearDesktopSignature} className="text-xs">
                          Löschen
                        </Button>
                        <Button size="sm" onClick={acceptDesktopSignature} className="bg-sage-600 text-xs text-white">
                          Unterschrift übernehmen
                        </Button>
                      </div>
                    </div>

                    {/* QR Code / Smartphone Unterschrift (Nur auf Desktop sichtbar) */}
                    <div className="hidden md:flex border-l pl-0 md:pl-6 space-y-2 flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-sage-600">Option B: Bequem am Smartphone unterschreiben</p>
                        <p className="text-xs text-sage-500 mt-1">
                          Scanne den QR-Code mit der Smartphone-Kamera, um mit dem Finger zu unterschreiben.
                        </p>
                      </div>

                      {mobileSessionId ? (
                        <div className="flex flex-col items-center p-2 bg-white border rounded-lg w-48 mx-auto mt-2">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                              (typeof window !== 'undefined' ? window.location.origin : '') + '/signature/' + mobileSessionId
                            )}`}
                            alt="Signatur QR Code"
                            className="w-36 h-36"
                          />
                          <p className="text-[10px] text-sage-500 mt-1 animate-pulse text-center">
                            Warte auf Unterschrift...
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={startMobileSignature}
                          disabled={saving}
                          className="w-full bg-sage-500 hover:bg-sage-600 text-white mt-2"
                        >
                          QR-Code anzeigen
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Steuerungsknöpfe */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(2)
                    router.push('/portal/profile?onboarding=true&step=2')
                  }}
                  className="border-sage-300 text-sage-700 hover:bg-sage-50"
                >
                  ← Zurück zu Schritt 2
                </Button>
                <Button
                  onClick={handleFinishOnboarding}
                  disabled={saving || !dataConsent || !signatureImage}
                  className="flex-1 bg-sage-600 hover:bg-sage-700 text-lg py-6 text-white"
                >
                  {saving ? 'Vertrag wird übermittelt...' : '✓ Vertrag unterzeichnen & Onboarding abschließen'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/portal')}
                  className="border-sage-300 text-sage-700 hover:bg-sage-50"
                >
                  Später fortfahren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
