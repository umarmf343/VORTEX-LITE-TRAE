"use client"

import { useEffect, useMemo, useState } from "react"

import type { ViewerManifest } from "@/lib/types"
import { buildViewerManifestUrl, isViewerManifest } from "@/lib/viewer-manifest"

interface ViewerManifestState {
  manifest: ViewerManifest | null
  isLoading: boolean
  error: Error | null
  url: string | null
}

export const useViewerManifest = (spaceId?: string | null): ViewerManifestState => {
  const [manifest, setManifest] = useState<ViewerManifest | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const manifestUrl = useMemo(() => {
    if (!spaceId) {
      return null
    }
    return buildViewerManifestUrl(spaceId)
  }, [spaceId])

  useEffect(() => {
    if (!manifestUrl) {
      setManifest(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()

    const normalizedSpaceId = spaceId?.replace(/\s+/g, "_") ?? ""
    const fallbackUrl = normalizedSpaceId ? `/spaces/${normalizedSpaceId}/manifest.json` : null

    const attemptFetch = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Manifest request failed (${response.status})`)
      }
      return (await response.json()) as unknown
    }

    const resolveManifest = async () => {
      const sources = [manifestUrl, fallbackUrl].filter(Boolean) as string[]
      let lastError: Error | null = null
      for (const url of sources) {
        try {
          const payload = await attemptFetch(url)
          if (cancelled) {
            return
          }
          if (!isViewerManifest(payload)) {
            throw new Error("Manifest response did not match schema shape")
          }
          setManifest(payload)
          setError(null)
          return
        } catch (err) {
          if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
            return
          }
          lastError = err as Error
        }
      }

      if (!cancelled) {
        setManifest(null)
        if (lastError) {
          setError(lastError)
        }
      }
    }

    resolveManifest().finally(() => {
      if (!cancelled) {
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [manifestUrl, spaceId])

  return { manifest, isLoading, error, url: manifestUrl }
}
