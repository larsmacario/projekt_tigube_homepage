import { NextResponse } from 'next/server'

import { getBetreuungsvertragLegal } from '@/lib/betreuungsvertrag'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const legal = await getBetreuungsvertragLegal()
    return NextResponse.json(legal)
  } catch (error: unknown) {
    console.error('Error loading betreuungsvertrag legal:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden des Vertragstexts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
