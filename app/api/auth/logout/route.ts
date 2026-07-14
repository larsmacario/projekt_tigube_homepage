import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-cookies'

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearAuthCookies(response)
  return response
}
