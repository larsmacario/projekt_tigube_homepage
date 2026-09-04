/** Mappt technische API-/Auth-Fehler auf verständliche Portal-Meldungen. */
export function mapPortalApiError(message: string): string {
  if (message === 'Auth session missing!') {
    return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'
  }

  return message
}
