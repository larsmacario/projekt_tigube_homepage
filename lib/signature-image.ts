const MAX_SIGNATURE_WIDTH = 300
const MAX_SIGNATURE_HEIGHT = 125
const JPEG_QUALITY = 0.85

/**
 * Skaliert eine Signatur-Daten-URL für die PDF-Einbettung herunter,
 * um unnötig große PDFs zu vermeiden.
 */
export async function compressSignatureForPdf(dataUrl: string): Promise<string> {
  if (typeof window === 'undefined') {
    return dataUrl
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(
        MAX_SIGNATURE_WIDTH / image.width,
        MAX_SIGNATURE_HEIGHT / image.height,
        1
      )
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    image.onerror = () => reject(new Error('Signatur konnte nicht verarbeitet werden'))
    image.src = dataUrl
  })
}
