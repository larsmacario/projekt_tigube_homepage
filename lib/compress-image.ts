const DEFAULT_MAX_DIMENSION = 1920
const DEFAULT_QUALITY = 0.82

/** Reduziert Handyfotos auf eine upload-freundliche Größe (JPEG). */
export async function compressImageForUpload(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY
): Promise<File> {
  if (typeof window === 'undefined') return file

  // Kleine Dateien nicht unnötig re-encoden
  if (file.size <= 800 * 1024) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      const longestSide = Math.max(width, height)
      if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Bildverarbeitung ist in diesem Browser nicht verfügbar.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Das Bild konnte nicht komprimiert werden.'))
            return
          }

          const baseName = file.name.replace(/\.[^.]+$/, '') || 'tierfoto'
          resolve(
            new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
          )
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Das Bild konnte nicht gelesen werden.'))
    }

    img.src = objectUrl
  })
}
