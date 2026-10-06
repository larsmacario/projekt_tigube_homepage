import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  // Return cached client if already initialized
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are missing, create a placeholder client
  // This allows the build to complete. Runtime errors will occur if functions are called.
  if (!supabaseUrl || !supabaseAnonKey) {
    // Use placeholder values to allow build to complete
    // Functions using this client will fail at runtime, which is expected
    supabaseClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
    return supabaseClient
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Create a proxy that lazily initializes the client only when accessed
// This prevents the client from being created during module import/build time
const supabaseProxy = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
  has(_target, prop) {
    const client = getSupabaseClient()
    return prop in client
  },
  ownKeys(_target) {
    const client = getSupabaseClient()
    return Reflect.ownKeys(client)
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = getSupabaseClient()
    return Reflect.getOwnPropertyDescriptor(client, prop)
  }
})

export const supabase = supabaseProxy

import type { Testimonial } from './types'

export type { Testimonial } from './types'

// Functions for testimonials
export const getPublishedTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching testimonials:', error)
    return []
  }

  return data || []
}

export const getAllTestimonials = async (): Promise<Testimonial[]> => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching all testimonials:', error)
    return []
  }

  return data || []
}

export const createTestimonial = async (testimonial: Omit<Testimonial, 'id' | 'created_at' | 'updated_at'>): Promise<Testimonial | null> => {
  const { data, error } = await supabase
    .from('testimonials')
    .insert(testimonial)
    .select()
    .single()

  if (error) {
    console.error('Error creating testimonial:', error)
    return null
  }

  return data
}

export const updateTestimonial = async (id: string, updates: Partial<Testimonial>): Promise<Testimonial | null> => {
  const { data, error } = await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating testimonial:', error)
    return null
  }

  return data
}

export const deleteTestimonial = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('testimonials')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting testimonial:', error)
    return false
  }

  return true
} 