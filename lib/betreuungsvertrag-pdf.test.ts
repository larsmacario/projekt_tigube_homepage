import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Pet } from '@/lib/types'
import { emptyPetCarePlan, formatCarePlanSummary } from '@/lib/pet-care-plan'
import {
  buildBetreuungsvertragPdf,
  renderBetreuungsvertragPdfHeader,
} from '@/lib/betreuungsvertrag-pdf'

const MINIMAL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const MINIMAL_PNG_BYTES = Uint8Array.from(
  atob(MINIMAL_PNG.replace(/^data:image\/png;base64,/, '')),
  (char) => char.charCodeAt(0)
)

function createPetWithFullCarePlan(): Pet {
  const carePlan = emptyPetCarePlan()
  carePlan.foodTypes = ['trocken']
  carePlan.feeding[0] = {
    enabled: true,
    time: '6 Uhr',
    food: 'Trockenfutter',
    amount: '75g',
    additive: '',
    additiveAmount: '',
  }
  carePlan.feeding[1] = {
    enabled: true,
    time: '13 Uhr',
    food: 'Trockenfutter',
    amount: '75g',
    additive: '',
    additiveAmount: '',
  }
  carePlan.feeding[2] = {
    enabled: true,
    time: '19 Uhr',
    food: 'Trockenfutter',
    amount: '75g',
    additive: '',
    additiveAmount: '',
  }
  carePlan.intolerances = 'Keine bekannt'

  return {
    id: 'pet-1',
    customer_id: 'customer-1',
    name: 'Kaia',
    tierart: 'Hund',
    rasse: 'Mischling',
    farbe: null,
    wiedererkennungsmerkmal: null,
    geschlecht: 'weiblich_kastriert',
    futtermenge: null,
    medikamente: null,
    besonderheiten: null,
    care_plan: carePlan,
    letzte_impfung: null,
    letzte_impfung_zusatz: null,
    intervall_impfung: null,
    intervall_entwurmung: null,
    letzte_stuhlprobe: null,
    naechste_stuhlprobe: null,
    deceased_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('betreuungsvertrag-pdf', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('setzt das Firmenlogo mittig und verwendet die feste Vertragsüberschrift', async () => {
    const logoBytes = new Uint8Array([137, 80, 78, 71])
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => logoBytes.buffer,
    })
    vi.stubGlobal('fetch', fetchMock)

    const doc = {
      addImage: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      text: vi.fn(),
    }

    await renderBetreuungsvertragPdfHeader(doc, 210)

    expect(fetchMock).toHaveBeenCalledWith('/images/tigube-logo.png')
    expect(doc.addImage).toHaveBeenCalledOnce()
    const [, format, x, , width, height] = doc.addImage.mock.calls[0]
    expect(format).toBe('PNG')
    expect(x + width / 2).toBe(105)
    expect(width / height).toBeCloseTo(500 / 135, 5)
    expect(doc.text).toHaveBeenCalledWith('Betreuungsvertrag', 20, 48)
  })

  it('bricht verständlich ab, wenn das Firmenlogo nicht geladen werden kann', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const doc = {
      addImage: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      text: vi.fn(),
    }

    await expect(renderBetreuungsvertragPdfHeader(doc, 210)).rejects.toThrow(
      'Firmenlogo konnte nicht für den Betreuungsvertrag geladen werden'
    )
    expect(doc.addImage).not.toHaveBeenCalled()
  })

  it('berücksichtigt mehrzeilige Pflegepläne bei der vertikalen Layout-Berechnung', async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const careSummary = formatCarePlanSummary(createPetWithFullCarePlan().care_plan!)
    const petInfo = [
      'Tierart: Hund | Rasse: Mischling | Farbe: -',
      'Geschlecht: Weiblich, kastriert',
      `Futter / Medikamente / Besonderheiten: ${careSummary}`,
    ].join('\n')

    const lines = doc.splitTextToSize(petInfo, 170)

    expect(careSummary.split('\n').length).toBeGreaterThan(1)
    expect(lines.length).toBeGreaterThan(3)
  })

  it('generiert ein PDF mit vollem Pflegeplan ohne Layout-Fehler', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => MINIMAL_PNG_BYTES.buffer,
      })
    )

    const blob = await buildBetreuungsvertragPdf({
      contractHtml: '<p>Vertragstext</p>',
      party: {
        vorname: 'Sandra',
        nachname: 'Dileo',
        strasse: 'Musterstraße',
        hausnummer: '1',
        plz: '78462',
        ort: 'Konstanz',
        telefonnummer: '0123456789',
        email: 'sandra@example.com',
        notfall_kontakt_name: 'Julia Dileo',
        notfallnummer: '0987654321',
      },
      pets: [createPetWithFullCarePlan()],
      fotoVideoConsent: true,
      signatureDataUrl: MINIMAL_PNG,
      signedAt: new Date('2026-09-02T10:00:00.000Z'),
    })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(1000)
  })
})
