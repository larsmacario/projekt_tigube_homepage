"use client"

import * as React from "react"

const STORAGE_KEY = "sidebar-open"

export function useSidebarPersist() {
  const [open, setOpenState] = React.useState(true)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setOpenState(stored === "true")
      }
    } catch {
      // localStorage unavailable
    }
    setReady(true)
  }, [])

  const setOpen = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }, [])

  return { open, setOpen, ready }
}
