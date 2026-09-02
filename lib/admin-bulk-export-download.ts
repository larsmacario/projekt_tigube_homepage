export async function downloadResponseAsFile(response: Response, fallbackFilename: string) {
  if (!response.ok) {
    let message = 'Download fehlgeschlagen'
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('Content-Disposition') || ''
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] || fallbackFilename

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
