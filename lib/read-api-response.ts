export async function readApiResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  response: Response
): Promise<{ data: T | null; error: string | null }> {
  const text = await response.text()

  if (!text) {
    if (response.status === 413) {
      return {
        data: null,
        error: 'Die Datei ist zu groß. Bitte wähle ein kleineres Bild (max. 10 MB).',
      }
    }
    if (!response.ok) {
      return { data: null, error: `Fehler ${response.status}` }
    }
    return { data: null, error: null }
  }

  let data: T | null = null
  try {
    data = JSON.parse(text) as T
  } catch {
    if (response.status === 413 || text.includes('Request Entity Too Large')) {
      return {
        data: null,
        error: 'Die Datei ist zu groß. Bitte wähle ein kleineres Bild (max. 10 MB).',
      }
    }
    const statusHint =
      response.status >= 500
        ? `Serverfehler (${response.status})`
        : `Antwort konnte nicht gelesen werden (${response.status || 'unbekannt'})`
    if (text.includes('Internal Server Error') || text.startsWith('Internal')) {
      return {
        data: null,
        error: `${statusHint}. Bitte Seite neu laden und erneut speichern.`,
      }
    }
    return {
      data: null,
      error: `${statusHint}. Bitte versuche es erneut.`,
    }
  }

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Fehler ${response.status}`
    return { data, error: message }
  }

  return { data, error: null }
}
