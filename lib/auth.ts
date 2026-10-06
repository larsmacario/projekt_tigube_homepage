import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { User } from './types'

/**
 * Auth Helper Functions für Supabase Authentication
 */

/**
 * Prüft ob ein User eingeloggt ist
 */
export async function getCurrentUser(): Promise<User | null> {
  /** Session erst aus Storage/Memory laden – vermeidet Race nach Full-Page-Load vor getUser(). */
  await supabase.auth.getSession()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Hole erweiterte User-Daten aus public.users
  const { data, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError || !data) {
    return null
  }

  return data
}

/**
 * Prüft ob der aktuelle User ein Admin ist
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Prüft ob der aktuelle User ein Kunde ist
 */
export async function isCustomer(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'customer'
}

/**
 * Login mit Email und Passwort
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Registrierung (für Onboarding)
 * Der Eintrag in public.users wird automatisch durch den Trigger 
 * on_auth_user_created erstellt.
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Prüft ob eine Session existiert
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    throw error
  }

  return session
}

/**
 * Server-Side Auth Helper für API Routes
 * Erstellt einen Supabase Client mit dem Request-Header
 */
export function createServerClient(cookieHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          // Parse cookies from header
          if (!cookieHeader) return undefined
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
          }, {} as Record<string, string>)
          return cookies[name]
        },
        set() {
          // Server-side cookies werden nicht gesetzt
        },
        remove() {
          // Server-side cookies werden nicht entfernt
        },
      },
    } as Parameters<typeof createClient>[2]
  )
}

