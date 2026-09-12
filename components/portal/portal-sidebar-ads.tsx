"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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

type NaturalSize = { w: number; h: number }

function computeSlotAspectRatio(
  ads: PortalAd[],
  naturalSizes: Record<string, NaturalSize>,
  fallbackWidth: number,
  fallbackHeight: number
): number {
  const measured = ads
    .map((ad) => naturalSizes[ad.id])
    .filter((size): size is NaturalSize => size != null && size.w > 0 && size.h > 0)

  if (measured.length === 0) {
    return fallbackWidth / fallbackHeight
  }

  // Tallest image (relative to width) sets the stable box height for rotation.
  return Math.min(...measured.map((size) => size.w / size.h))
}

function AdBannerImage({
  ad,
  visible,
  onNaturalSize,
}: {
  ad: PortalAd
  visible: boolean
  onNaturalSize: (adId: string, width: number, height: number) => void
}) {
  const image = (
    <Image
      src={ad.image_url}
      alt={ad.title}
      fill
      sizes="256px"
      className="rounded-md object-contain"
      unoptimized
      onLoad={(event) => {
        const img = event.currentTarget
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          onNaturalSize(ad.id, img.naturalWidth, img.naturalHeight)
        }
      }}
    />
  )

  const content = ad.link_url ? (
    <a
      href={ad.link_url}
      target={ad.link_target}
      rel={ad.link_target === "_blank" ? "noopener noreferrer" : undefined}
      className="relative block h-full w-full overflow-hidden rounded-md ring-offset-background transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
    >
      {image}
    </a>
  ) : (
    <div className="relative h-full w-full overflow-hidden rounded-md">{image}</div>
  )

  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-500",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!visible}
    >
      {content}
    </div>
  )
}

function SidebarAdSlot({
  format,
  ads,
  rotationEnabled,
  intervalSeconds,
  pathname,
}: {
  format: AdFormat
  ads: PortalAd[]
  rotationEnabled: boolean
  intervalSeconds: number
  pathname: string | null
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [naturalSizes, setNaturalSizes] = useState<Record<string, NaturalSize>>({})
  const pathnameRef = useRef<string | null>(pathname)

  const handleNaturalSize = useCallback((adId: string, width: number, height: number) => {
    setNaturalSizes((current) => {
      const existing = current[adId]
      if (existing?.w === width && existing?.h === height) {
        return current
      }
      return { ...current, [adId]: { w: width, h: height } }
    })
  }, [])

  useEffect(() => {
    setCurrentIndex(0)
    setNaturalSizes({})
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

  const aspectRatio = useMemo(
    () => computeSlotAspectRatio(ads, naturalSizes, format.width_px, format.height_px),
    [ads, naturalSizes, format.width_px, format.height_px]
  )

  if (ads.length === 0) return null

  const displayIndex = rotationEnabled ? currentIndex : 0

  return (
    <div className="px-2 py-3 group-data-[collapsible=icon]:hidden">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Angebot
      </p>
      <div
        className="relative w-full overflow-hidden rounded-md bg-sage-100"
        style={{ aspectRatio }}
      >
        {ads.map((ad, index) => (
          <AdBannerImage
            key={ad.id}
            ad={ad}
            visible={index === displayIndex}
            onNaturalSize={handleNaturalSize}
          />
        ))}
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
        const response = await fetch("/api/portal/ads")
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
          format={format}
          ads={ads}
          rotationEnabled={rotationEnabled}
          intervalSeconds={intervalSeconds}
          pathname={pathname}
        />
      ))}
    </>
  )
}
