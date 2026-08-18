import type { jsPDF } from 'jspdf'
import type { Pet } from '@/lib/types'
import { parseLegalHtmlToBlocks, type LegalPdfBlock } from '@/lib/betreuungsvertrag-html'
import { formatCarePlanSummary, normalizeCarePlan } from '@/lib/pet-care-plan'
import { formatPetGeschlecht } from '@/lib/pet-form-options'

export type BetreuungsvertragParty = {
  vorname: string
  nachname: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  telefonnummer: string
  email: string
  notfall_kontakt_name: string
  notfallnummer: string
}

export type BetreuungsvertragPdfOptions = {
  title: string
  contractHtml: string
  party: BetreuungsvertragParty
  pets: Pet[]
  fotoVideoConsent: boolean
  signatureDataUrl: string
  signedAt: Date
}

const PAGE_BOTTOM = 275
const MARGIN_LEFT = 20
const CONTENT_WIDTH = 170

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

function renderPartySection(doc: jsPDF, y: number, options: BetreuungsvertragPdfOptions, pageNumber: { n: number }) {
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  y = ensureSpace(doc, y, 20, pageNumber)
  doc.text(options.title.toUpperCase(), MARGIN_LEFT, y)
  y += 10

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  y = ensureSpace(doc, y, 8, pageNumber)
  doc.text('Auftraggeber (Tierhalter):', MARGIN_LEFT, y)
  y += 7

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  const party = options.party
  y = writeLines(
    doc,
    [
      `Name: ${party.vorname} ${party.nachname}`.trim(),
      `Anschrift: ${party.strasse} ${party.hausnummer}, ${party.plz} ${party.ort}`.trim(),
      `Telefon: ${party.telefonnummer || '-'}`,
      `E-Mail: ${party.email || '-'}`,
    ],
    MARGIN_LEFT,
    y,
    6,
    pageNumber
  )
  y += 4

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  y = ensureSpace(doc, y, 8, pageNumber)
  doc.text('Es soll(en) folgende(r) Hund(e) betreut werden:', MARGIN_LEFT, y)
  y += 8

  options.pets.forEach((pet, index) => {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    y = ensureSpace(doc, y, 6, pageNumber)
    doc.text(`Hund ${index + 1}: ${pet.name}`, MARGIN_LEFT, y)
    y += 6
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    const carePlan = normalizeCarePlan(pet.care_plan)
    const careSummary = carePlan
      ? formatCarePlanSummary(carePlan)
      : [pet.futtermenge, pet.medikamente, pet.besonderheiten].filter(Boolean).join(' | ') || 'Keine'
    const lines = [
      `Tierart: ${pet.tierart || '-'} | Rasse: ${pet.rasse || '-'} | Farbe: ${pet.farbe || '-'}`,
      `Geschlecht: ${formatPetGeschlecht(pet.geschlecht) || '-'}`,
      `Futter / Medikamente / Besonderheiten: ${careSummary}`,
    ]
    y = writeLines(doc, lines, MARGIN_LEFT, y, 5, pageNumber)
    y += 3
  })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  y = ensureSpace(doc, y, 8, pageNumber)
  doc.text('Im Notfall zu verständigen (Vertrauensperson):', MARGIN_LEFT, y)
  y += 6
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  y = writeLines(
    doc,
    [`Name: ${party.notfall_kontakt_name || '-'} | Telefonnummer: ${party.notfallnummer || '-'}`],
    MARGIN_LEFT,
    y,
    5,
    pageNumber
  )

  return y + 8
}

function paragraphWithFotoConsent(
  text: string,
  sectionHeading: string | null,
  fotoVideoConsent: boolean
): string {
  const inDatenschutz = sectionHeading?.toLowerCase().includes('datenschutz')
  const isFotoParagraph = inDatenschutz && /^\(2\)/.test(text.trim())
  if (!isFotoParagraph) return text
  const status = fotoVideoConsent ? 'JA, erteilt.' : 'NEIN, widersprochen.'
  return `${text} Status der Einwilligung Foto/Video: ${status}`
}

function renderLegalBlocks(
  doc: jsPDF,
  y: number,
  blocks: LegalPdfBlock[],
  fotoVideoConsent: boolean,
  pageNumber: { n: number }
): number {
  let currentHeading: string | null = null

  for (const block of blocks) {
    if (block.type === 'hr') {
      y += 4
      continue
    }
    if (block.type === 'heading') {
      currentHeading = block.text
      y += 6
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(14)
      y = ensureSpace(doc, y, 10, pageNumber)
      const headingLines = doc.splitTextToSize(block.text, CONTENT_WIDTH)
      y = writeLines(doc, headingLines, MARGIN_LEFT, y, 6, pageNumber)
      y += 2
      continue
    }
    if (block.type === 'list') {
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      for (const item of block.items) {
        const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH)
        y = writeLines(doc, lines, MARGIN_LEFT, y, 5, pageNumber)
        y += 1
      }
      continue
    }
    if (block.type === 'blockquote') {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(block.text, CONTENT_WIDTH)
      y = writeLines(doc, lines, MARGIN_LEFT, y, 5, pageNumber)
      y += 2
      continue
    }
    if (block.type === 'paragraph') {
      const text = paragraphWithFotoConsent(block.text, currentHeading, fotoVideoConsent)
      const isNumbered = /^\(\d+\)/.test(text.trim())
      doc.setFont('Helvetica', isNumbered ? 'bold' : 'normal')
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(text, isNumbered ? 160 : CONTENT_WIDTH)
      const x = isNumbered ? 27 : MARGIN_LEFT
      if (isNumbered) {
        const num = text.match(/^\(\d+\)/)?.[0] ?? ''
        y = ensureSpace(doc, y, 5, pageNumber)
        doc.setFont('Helvetica', 'bold')
        doc.text(num, MARGIN_LEFT, y)
        doc.setFont('Helvetica', 'normal')
        const body = text.replace(/^\(\d+\)\s*/, '')
        const bodyLines = doc.splitTextToSize(body, 160)
        for (const line of bodyLines) {
          y = ensureSpace(doc, y, 5, pageNumber)
          doc.text(line, x, y)
          y += 5
        }
      } else {
        y = writeLines(doc, lines, MARGIN_LEFT, y, 5, pageNumber)
      }
      y += 2
    }
  }

  return y
}

export async function buildBetreuungsvertragPdf(options: BetreuungsvertragPdfOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageNumber = { n: 1 }
  const blocks = parseLegalHtmlToBlocks(options.contractHtml)

  let y = 20
  y = renderPartySection(doc, y, options, pageNumber)
  y = renderLegalBlocks(doc, y, blocks, options.fotoVideoConsent, pageNumber)

  y += 10
  y = ensureSpace(doc, y, 45, pageNumber)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Unterschrift des Tierhalters (digital geleistet):', MARGIN_LEFT, y)
  y += 6

  const { compressSignatureForPdf } = await import('@/lib/signature-image')
  const compressedSignature = await compressSignatureForPdf(options.signatureDataUrl)
  const signatureFormat = compressedSignature.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
  doc.addImage(compressedSignature, signatureFormat, MARGIN_LEFT, y, 60, 25)
  y += 33

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Datum: ${options.signedAt.toLocaleDateString('de-DE')}`, MARGIN_LEFT, y)
  doc.text('Ort: Moos', 100, y)

  drawFooter(doc, pageNumber.n)

  return doc.output('blob')
}
