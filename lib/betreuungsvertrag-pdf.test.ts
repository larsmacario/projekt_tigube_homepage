import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderBetreuungsvertragPdfHeader } from '@/lib/betreuungsvertrag-pdf'

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
})
