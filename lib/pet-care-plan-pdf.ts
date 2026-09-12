import type { jsPDF } from 'jspdf'
import {
  CARE_PLAN_FOOD_TYPES,
  CARE_PLAN_SLOT_LABELS,
  getActiveMedicationEntries,
  groupMedicationsByTimeSlot,
  normalizeCarePlan,
  type PetCarePlan,
} from '@/lib/pet-care-plan'

export type PetCarePlanPdfInput = {
  petName: string
  customerName?: string
  carePlan?: unknown
  standDate?: string
  summary?: string
}

const PAGE_BOTTOM = 275
const MARGIN_LEFT = 20
const CONTENT_WIDTH = 170

type PageCounter = { n: number }

function formatStandDate(value?: string): string {
  if (!value) return new Date().toLocaleDateString('de-DE')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('de-DE')
}

function drawFooter(doc: jsPDF, pageNumber: number) {
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('© tierischgutbetreut GmbH 2026', MARGIN_LEFT, 285)
  doc.text(`Seite ${pageNumber}`, 180, 285)
  doc.setTextColor(0, 0, 0)
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  pageNumber: PageCounter
): number {
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
  pageNumber: PageCounter
): number {
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight, pageNumber)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\wäöüÄÖÜß\-]+/g, '_').replace(/_+/g, '_')
}

export function petCarePlanPdfFilename(input: Pick<PetCarePlanPdfInput, 'petName' | 'standDate'>): string {
  const datePart = input.standDate
    ? new Date(input.standDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  return `Pflegeplan_${sanitizeFilename(input.petName)}_${datePart}.pdf`
}

export function petCarePlanBulkPdfFilename(): string {
  return `Pflegeplaene_${new Date().toISOString().slice(0, 10)}.pdf`
}

export function downloadPetCarePlanPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function renderFeedingTable(
  doc: jsPDF,
  plan: PetCarePlan,
  y: number,
  pageNumber: PageCounter
): number {
  const colWidths = [38, 44, 44, 44]
  const rowHeight = 7
  const rows: Array<{ label: string; values: string[] }> = [
    {
      label: 'Uhrzeit',
      values: plan.feeding.map((slot) => (slot.enabled ? slot.time || '–' : '–')),
    },
    {
      label: 'Futter',
      values: plan.feeding.map((slot) => (slot.enabled ? slot.food || '–' : '–')),
    },
    {
      label: 'Menge',
      values: plan.feeding.map((slot) => (slot.enabled ? slot.amount || '–' : '–')),
    },
    {
      label: 'Zusätze',
      values: plan.feeding.map((slot) => (slot.enabled ? slot.additive || '–' : '–')),
    },
    {
      label: 'Menge Zusatz',
      values: plan.feeding.map((slot) => (slot.enabled ? slot.additiveAmount || '–' : '–')),
    },
  ]

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  y = ensureSpace(doc, y, 10, pageNumber)
  doc.text('Fütterung', MARGIN_LEFT, y)
  y += 6

  const tableTop = y
  const headerHeight = rowHeight
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)

  doc.setDrawColor(0, 0, 0)
  doc.rect(MARGIN_LEFT, tableTop, tableWidth, headerHeight)
  let x = MARGIN_LEFT + colWidths[0]
  for (let index = 1; index < colWidths.length; index += 1) {
    doc.line(x, tableTop, x, tableTop + headerHeight)
    x += colWidths[index]
  }

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('', MARGIN_LEFT + 2, tableTop + 5)
  CARE_PLAN_SLOT_LABELS.forEach((label, index) => {
    const cellX =
      MARGIN_LEFT + colWidths.slice(0, index + 1).reduce((sum, width) => sum + width, 0) -
      colWidths[index + 1] +
      2
    doc.text(label, cellX, tableTop + 5)
  })

  y = tableTop + headerHeight

  doc.setFont('Helvetica', 'normal')
  for (const row of rows) {
    const wrappedValues = row.values.map((value) =>
      doc.splitTextToSize(value, colWidths[1] - 4)
    )
    const maxLines = Math.max(1, ...wrappedValues.map((lines) => lines.length))
    const currentRowHeight = rowHeight + (maxLines - 1) * 4

    y = ensureSpace(doc, y, currentRowHeight, pageNumber)
    doc.rect(MARGIN_LEFT, y, tableWidth, currentRowHeight)

    x = MARGIN_LEFT + colWidths[0]
    for (let index = 1; index < colWidths.length; index += 1) {
      doc.line(x, y, x, y + currentRowHeight)
      x += colWidths[index]
    }

    doc.setFont('Helvetica', 'bold')
    doc.text(row.label, MARGIN_LEFT + 2, y + 5)

    doc.setFont('Helvetica', 'normal')
    row.values.forEach((value, index) => {
      const cellX =
        MARGIN_LEFT + colWidths.slice(0, index + 1).reduce((sum, width) => sum + width, 0) -
        colWidths[index + 1] +
        2
      const lines = doc.splitTextToSize(value, colWidths[index + 1] - 4)
      lines.forEach((line: string, lineIndex: number) => {
        doc.text(line, cellX, y + 5 + lineIndex * 4)
      })
    })

    y += currentRowHeight
  }

  return y + 4
}

function renderMedicationSection(
  doc: jsPDF,
  plan: PetCarePlan,
  y: number,
  pageNumber: PageCounter
): number {
  const entries = getActiveMedicationEntries(plan)
  if (entries.length === 0) return y

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  y = ensureSpace(doc, y, 10, pageNumber)
  doc.text('Medikamente', MARGIN_LEFT, y)
  y += 7

  const grouped = groupMedicationsByTimeSlot(entries)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)

  for (const label of CARE_PLAN_SLOT_LABELS) {
    const slotEntries = grouped[label]
    if (slotEntries.length === 0) continue

    y = ensureSpace(doc, y, 8, pageNumber)
    doc.setFont('Helvetica', 'bold')
    doc.text(label, MARGIN_LEFT, y)
    y += 5

    doc.setFont('Helvetica', 'normal')
    for (const entry of slotEntries) {
      const line = `${entry.timing} · ${entry.medication} · ${entry.amount}`
      const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 4)
      y = writeLines(doc, wrapped, MARGIN_LEFT + 2, y, 5, pageNumber)
    }
    y += 2
  }

  return y
}

function renderLegacySection(
  doc: jsPDF,
  input: PetCarePlanPdfInput,
  y: number,
  pageNumber: PageCounter
): number {
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  y = ensureSpace(doc, y, 10, pageNumber)
  doc.text('Hinweis', MARGIN_LEFT, y)
  y += 6

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  const notice =
    'Für diese Version liegt nur die Änderungs-Zusammenfassung vor, nicht der vollständige Pflegeplan.'
  y = writeLines(doc, doc.splitTextToSize(notice, CONTENT_WIDTH), MARGIN_LEFT, y, 5, pageNumber)

  if (input.summary) {
    y += 2
    doc.setFont('Helvetica', 'bold')
    y = ensureSpace(doc, y, 8, pageNumber)
    doc.text('Änderung', MARGIN_LEFT, y)
    y += 5
    doc.setFont('Helvetica', 'normal')
    y = writeLines(
      doc,
      doc.splitTextToSize(input.summary, CONTENT_WIDTH),
      MARGIN_LEFT,
      y,
      5,
      pageNumber
    )
  }

  return y
}

export function renderPetCarePlanPdfPage(
  doc: jsPDF,
  input: PetCarePlanPdfInput,
  pageNumber: PageCounter,
  options?: { newPage?: boolean }
): number {
  if (options?.newPage) {
    drawFooter(doc, pageNumber.n)
    doc.addPage()
    pageNumber.n += 1
  }

  let y = 20

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Futter- & Medikamentenplan', MARGIN_LEFT, y)
  y += 10

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  y = writeLines(
    doc,
    [
      `Tier: ${input.petName}`,
      input.customerName ? `Besitzer: ${input.customerName}` : '',
      `Stand: ${formatStandDate(input.standDate)}`,
    ].filter(Boolean),
    MARGIN_LEFT,
    y,
    6,
    pageNumber
  )
  y += 4

  const plan = input.carePlan != null ? normalizeCarePlan(input.carePlan) : null

  if (!plan) {
    return renderLegacySection(doc, input, y, pageNumber)
  }

  const foodTypes = plan.foodTypes
    .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  if (foodTypes) {
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    y = writeLines(
      doc,
      doc.splitTextToSize(`Futterarten: ${foodTypes}`, CONTENT_WIDTH),
      MARGIN_LEFT,
      y,
      6,
      pageNumber
    )
    y += 2
  }

  y = renderFeedingTable(doc, plan, y, pageNumber)
  y = renderMedicationSection(doc, plan, y, pageNumber)

  if (plan.intolerances) {
    y = writeLines(
      doc,
      doc.splitTextToSize(`Unverträglichkeiten: ${plan.intolerances}`, CONTENT_WIDTH),
      MARGIN_LEFT,
      y,
      6,
      pageNumber
    )
  }

  if (plan.individualWishes) {
    y = writeLines(
      doc,
      doc.splitTextToSize(`Individuelle Wünsche: ${plan.individualWishes}`, CONTENT_WIDTH),
      MARGIN_LEFT,
      y,
      6,
      pageNumber
    )
  }

  return y
}

export async function buildPetCarePlanPdf(input: PetCarePlanPdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageNumber: PageCounter = { n: 1 }

  renderPetCarePlanPdfPage(doc, input, pageNumber)
  drawFooter(doc, pageNumber.n)

  return doc.output('blob')
}

export async function buildPetCarePlanBulkPdf(inputs: PetCarePlanPdfInput[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageNumber: PageCounter = { n: 1 }

  inputs.forEach((input, index) => {
    renderPetCarePlanPdfPage(doc, input, pageNumber, { newPage: index > 0 })
  })

  drawFooter(doc, pageNumber.n)
  return doc.output('blob')
}
