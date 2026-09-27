"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { authenticatedFetch } from "@/lib/authenticated-fetch"
import {
  getNextAdIndex,
  groupAdsByFormat,
  type AdFormat,
  type AdRotationSettings,
  type PortalAd,
} from "@/lib/portal-ads"

type PortalAdsResponse = {
  formats: AdFormat[]
  ads: PortalAd[]
  settings: AdRotationSettings | null
}

function AdBannerImage({ ad }: { ad: PortalAd }) {
  const image = (
    <Image
      src={ad.image_url}
      alt={ad.title}
      width={512}
      height={512}
      sizes="(max-width: 768px) 100vw, 16rem"
      className="block h-auto w-full max-w-full rounded-md"
      unoptimized
    />
  )

  if (ad.link_url) {
    return (
      <a
        href={ad.link_url}
        target={ad.link_target}
        rel={ad.link_url && ad.link_target === "_blank" ? "noopener noreferrer" : undefined}
        className="block w-full rounded-md ring-offset-background transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        {image}
      </a>
    )
  }

  return <div className="w-full">{image}</div>
}

function SidebarAdSlot({
  ads,
  rotationEnabled,
  intervalSeconds,
  pathname,
}: {
  ads: PortalAd[]
  rotationEnabled: boolean
  intervalSeconds: number
  pathname: string | null
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const pathnameRef = useRef<string | null>(pathname)

  useEffect(() => {
    setCurrentIndex(0)
  }, [ads])

  useEffect(() => {
    if (!rotationEnabled || ads.length <= 1) return

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => getNextAdIndex(index, ads.length))
    }, intervalSeconds * 1000)

    return () => window.clearInterval(timer)
  }, [ads.length, intervalSeconds, rotationEnabled])

  useEffect(() => {
    if (!rotationEnabled || ads.length <= 1) return
    if (pathnameRef.current === pathname) return
    pathnameRef.current = pathname
    setCurrentIndex((index) => getNextAdIndex(index, ads.length))
  }, [pathname, ads.length, rotationEnabled])

  if (ads.length === 0) return null

  const displayIndex = rotationEnabled ? currentIndex : 0
  const visibleAd = ads[displayIndex] ?? ads[0]

  return (
    <div className="px-1 py-3 group-data-[collapsible=icon]:hidden">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Angebot
      </p>
      <div
        key={visibleAd.id}
        className={cn(
          "w-full overflow-hidden rounded-md bg-sage-100/80",
          rotationEnabled && ads.length > 1 && "animate-in fade-in duration-500"
        )}
        aria-live={rotationEnabled && ads.length > 1 ? "polite" : undefined}
      >
        <AdBannerImage ad={visibleAd} />
      </div>
    </div>
  )
}

export function PortalSidebarAds() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<PortalAdsResponse | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadAds() {
      try {
        const response = await authenticatedFetch("/api/portal/ads")
        const data = (await response.json()) as PortalAdsResponse & { error?: string }
        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Laden der Werbeanzeigen")
        }
        setPayload({
          formats: data.formats || [],
          ads: data.ads || [],
          settings: data.settings,
        })
      } catch (error) {
        console.error("Error loading portal ads:", error)
        setPayload(null)
      } finally {
        setLoading(false)
      }
    }

    void loadAds()
  }, [])

  const groupedAds = useMemo(() => {
    if (!payload) return []
    const groups = groupAdsByFormat(payload.ads, payload.formats)
    return Array.from(groups.values()).filter((group) => group.ads.length > 0)
  }, [payload])

  if (!mounted || loading || groupedAds.length === 0) {
    return null
  }

  const rotationEnabled = payload?.settings?.is_enabled ?? true
  const intervalSeconds = payload?.settings?.interval_seconds ?? 8

  return (
    <>
      {groupedAds.map(({ format, ads }) => (
        <SidebarAdSlot
          key={format.id}
          ads={ads}
          rotationEnabled={rotationEnabled}
          intervalSeconds={intervalSeconds}
          pathname={pathname}
        />
      ))}
    </>
  )
}
