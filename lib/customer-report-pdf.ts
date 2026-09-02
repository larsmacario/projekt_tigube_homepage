import type { jsPDF } from 'jspdf'
import type { Customer, Pet } from '@/lib/types'
import { formatCarePlanSummary, normalizeCarePlan } from '@/lib/pet-care-plan'
import {
  formatPetGeschlecht,
  INTERVALL_OPTIONS,
  KOMBI_INTERVALL_OPTIONS,
} from '@/lib/pet-form-options'

export type CustomerReportPdfOptions = {
  customer: Customer
  pets: Pet[]
}

const PAGE_BOTTOM = 275
const MARGIN_LEFT = 20
const CONTENT_WIDTH = 170
const PDF_PAGE_WIDTH = 210
const REPORT_LOGO_PATH = '/images/tigube-logo.png'
const REPORT_LOGO_TOP = 12
const REPORT_LOGO_WIDTH = 90
const REPORT_LOGO_HEIGHT = (REPORT_LOGO_WIDTH * 135) / 500
const REPORT_TITLE_Y = 48
const REPORT_CONTENT_START_Y = 62

type ReportHeaderDoc = Pick<jsPDF, 'addImage' | 'setFont' | 'setFontSize' | 'text'>

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('de-DE')
}

function formatIntervall(value: string | null | undefined): string {
  if (!value) return '-'
  const fromStandard = INTERVALL_OPTIONS.find((option) => option.value === value)?.label
  if (fromStandard) return fromStandard
  const fromKombi = KOMBI_INTERVALL_OPTIONS.find((option) => option.value === value)?.label
  return fromKombi || value
}

function drawFooter(doc: jsPDF, pageNumber: number) {
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('© tierischgutbetreut GmbH 2026', MARGIN_LEFT, 285)
  doc.text(`Seite ${pageNumber}`, 180, 285)
  doc.setTextColor(0, 0, 0)
}

function ensureSpace(doc: jsPDF, y: number, needed: number, pageNumber: { n: number }): number {
  if (y + needed <= PAGE_BOTTOM) return y
  drawFooter(doc, pageNumber.n)
  doc.addPage()
  pageNumber.n += 1
  return 20
}

function writeLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  pageNumber: { n: number }
): number {
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight, pageNumber)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

function writeSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  pageNumber: { n: number }
): number {
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  y = ensureSpace(doc, y, 10, pageNumber)
  doc.text(title, MARGIN_LEFT, y)
  return y + 8
}

async function loadLogoBytes(): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises')
    const path = await import('path')
    const logoPath = path.join(process.cwd(), 'public', 'images', 'tigube-logo.png')
    return new Uint8Array(await fs.readFile(logoPath))
  }

  const logoResponse = await fetch(REPORT_LOGO_PATH)
  if (!logoResponse.ok) {
    throw new Error('Firmenlogo konnte nicht für den Bericht geladen werden')
  }
  return new Uint8Array(await logoResponse.arrayBuffer())
}

async function renderReportPdfHeader(doc: ReportHeaderDoc, pageWidth = PDF_PAGE_WIDTH): Promise<number> {
  const logoBytes = await loadLogoBytes()
  const logoX = (pageWidth - REPORT_LOGO_WIDTH) / 2
  doc.addImage(
    logoBytes,
    'PNG',
    logoX,
    REPORT_LOGO_TOP,
    REPORT_LOGO_WIDTH,
    REPORT_LOGO_HEIGHT
  )

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Tierhalter-Übersicht', MARGIN_LEFT, REPORT_TITLE_Y)

  return REPORT_CONTENT_START_Y
}

function renderCustomerSection(
  doc: jsPDF,
  y: number,
  customer: Customer,
  pageNumber: { n: number }
): number {
  y = writeSectionTitle(doc, 'Tierhalter', y, pageNumber)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  const holderName = [customer.vorname, customer.nachname].filter(Boolean).join(' ').trim() || '-'
  const address = [customer.strasse, customer.hausnummer].filter(Boolean).join(' ').trim()
  const cityLine = [customer.plz, customer.ort].filter(Boolean).join(' ').trim()

  y = writeLines(
    doc,
    [
      `Name: ${holderName}`,
      `Kundennummer: ${customer.kundennummer || '-'}`,
      `Anschrift: ${address || '-'}${cityLine ? `, ${cityLine}` : ''}`,
      `Telefon: ${customer.telefonnummer || '-'}`,
      customer.telefon_2 ? `Telefon 2: ${customer.telefon_2}` : '',
      `E-Mail: ${customer.email || '-'}`,
      `Notfallkontakt: ${customer.notfall_kontakt_name || '-'} | ${customer.notfallnummer || '-'}`,
      `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`,
    ].filter(Boolean),
    MARGIN_LEFT,
    y,
    6,
    pageNumber
  )

  return y + 6
}

function renderPetSection(
  doc: jsPDF,
  y: number,
  pets: Pet[],
  pageNumber: { n: number }
): number {
  y = writeSectionTitle(doc, `Tiere (${pets.length})`, y, pageNumber)

  if (pets.length === 0) {
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    return writeLines(doc, ['Keine Tiere hinterlegt.'], MARGIN_LEFT, y, 6, pageNumber)
  }

  pets.forEach((pet, index) => {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    y = ensureSpace(doc, y, 8, pageNumber)
    const deceasedHint = pet.deceased_at ? ' (verstorben)' : ''
    doc.text(`Tier ${index + 1}: ${pet.name}${deceasedHint}`, MARGIN_LEFT, y)
    y += 7

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)

    const carePlan = normalizeCarePlan(pet.care_plan)
    const careSummary = carePlan
      ? formatCarePlanSummary(carePlan)
      : [pet.futtermenge, pet.medikamente, pet.besonderheiten].filter(Boolean).join(' | ') ||
        'Keine Angaben'

    const petLines = [
      `Tierart: ${pet.tierart || '-'} | Rasse: ${pet.rasse || '-'} | Farbe: ${pet.farbe || '-'}`,
      `Geschlecht: ${formatPetGeschlecht(pet.geschlecht) || '-'}`,
      pet.wiedererkennungsmerkmal
        ? `Wiedererkennungsmerkmal: ${pet.wiedererkennungsmerkmal}`
        : '',
      `Letzte Kombiimpfung: ${formatDate(pet.letzte_impfung)} | Intervall: ${formatIntervall(pet.intervall_impfung)}`,
      `Letzte Zwingerhusten-Impfung: ${formatDate(pet.letzte_impfung_zusatz)}`,
      `Entwurmung – Intervall: ${formatIntervall(pet.intervall_entwurmung)} | Letzte Stuhlprobe: ${formatDate(pet.letzte_stuhlprobe)} | Nächste Stuhlprobe: ${formatDate(pet.naechste_stuhlprobe)}`,
      `Pflegeplan / Fütterung / Medikamente:`,
      careSummary,
    ].filter(Boolean)

    for (const line of petLines) {
      const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH)
      y = writeLines(doc, wrapped, MARGIN_LEFT, y, 5, pageNumber)
    }

    y += 4
  })

  return y
}

export async function buildCustomerReportPdf(options: CustomerReportPdfOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageNumber = { n: 1 }

  let y = await renderReportPdfHeader(doc)
  y = renderCustomerSection(doc, y, options.customer, pageNumber)
  y = renderPetSection(doc, y, options.pets, pageNumber)

  drawFooter(doc, pageNumber.n)

  return doc.output('blob')
}
