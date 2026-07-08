import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await signOut()
    const response = NextResponse.json({ success: true })
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Logout' },
      { status: 500 }
    )
  }
}


