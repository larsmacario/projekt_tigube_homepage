import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Alte CMS-URLs (Großschreibung) → neue Next-Routen (klein).
 * Nur exakte Großschreibung weiterleiten – sonst matcht Vercel/Edge die
 * next.config-Regeln case-insensitiv und /hundepension → /hundepension (Schleife).
 */
const legacyExact: Record<string, string> = {
  '/Hundepension': '/hundepension',
  '/Katzenbetreuung': '/katzenbetreuung',
  '/Kundenstimmen': '/kundenstimmen',
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (legacyExact[path]) {
    return NextResponse.redirect(new URL(legacyExact[path], request.url), 308)
  }

  for (const [from, to] of Object.entries(legacyExact)) {
    if (path.startsWith(`${from}/`)) {
      return NextResponse.redirect(new URL(to, request.url), 308)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/Hundepension/:path*', '/Katzenbetreuung/:path*', '/Kundenstimmen/:path*'],
}
