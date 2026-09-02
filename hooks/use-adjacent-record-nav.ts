'use client'

import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export type AdjacentRecordEntityType = 'customer' | 'lead'

const STORAGE_KEY_PREFIX = 'admin-list-order:'

function storageKey(entityType: AdjacentRecordEntityType): string {
  return `${STORAGE_KEY_PREFIX}${entityType}`
}

export function saveListOrder(entityType: AdjacentRecordEntityType, ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(entityType), JSON.stringify(ids))
  } catch {
    // sessionStorage unavailable (private mode, quota)
  }
}

function readListOrder(entityType: AdjacentRecordEntityType): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(entityType))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.map(String)
  } catch {
    return null
  }
}

async function fetchAllIds(entityType: AdjacentRecordEntityType): Promise<string[]> {
  const url =
    entityType === 'customer' ? '/api/admin/customers' : '/api/admin/leads'
  const response = await authenticatedFetch(url)
  if (!response.ok) return []

  const data = await response.json()
  const records =
    entityType === 'customer'
      ? (data.customers as { id: string | number }[] | undefined)
      : (data.leads as { id: string | number }[] | undefined)

  return (records || []).map((record) => String(record.id))
}

export type AdjacentRecordNav = {
  prevId: string | null
  nextId: string | null
  currentIndex: number | null
  total: number
  ready: boolean
}

export function useAdjacentRecordNav(
  entityType: AdjacentRecordEntityType,
  currentId: string
): AdjacentRecordNav {
  const [nav, setNav] = useState<AdjacentRecordNav>({
    prevId: null,
    nextId: null,
    currentIndex: null,
    total: 0,
    ready: false,
  })

  useEffect(() => {
    let cancelled = false

    async function resolveNav() {
      let ids = readListOrder(entityType)
      const normalizedCurrentId = String(currentId)

      if (!ids || !ids.includes(normalizedCurrentId)) {
        ids = await fetchAllIds(entityType)
      }

      if (cancelled) return

      const index = ids.indexOf(normalizedCurrentId)
      if (index === -1) {
        setNav({
          prevId: null,
          nextId: null,
          currentIndex: null,
          total: ids.length,
          ready: true,
        })
        return
      }

      setNav({
        prevId: index > 0 ? ids[index - 1] : null,
        nextId: index < ids.length - 1 ? ids[index + 1] : null,
        currentIndex: index + 1,
        total: ids.length,
        ready: true,
      })
    }

    setNav({
      prevId: null,
      nextId: null,
      currentIndex: null,
      total: 0,
      ready: false,
    })

    void resolveNav()

    return () => {
      cancelled = true
    }
  }, [entityType, currentId])

  return nav
}
