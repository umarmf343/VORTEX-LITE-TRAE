import type { ViewerManifest } from "@/lib/types"

export const VIEWER_MANIFEST_VERSION = "v1.0.0"
export const VIEWER_MANIFEST_SCHEMA_ID = "virtualtour.viewer.manifest:v1.0.0"

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const DEFAULT_CDN_ORIGIN = "https://cdn.virtualtour.ai"

export const getViewerCdnOrigin = () => {
  const explicit =
    typeof process !== "undefined"
      ? process.env.VIEWER_CDN_ORIGIN || process.env.NEXT_PUBLIC_CDN_ORIGIN
      : undefined

  if (!explicit || explicit.trim().length === 0) {
    return DEFAULT_CDN_ORIGIN
  }

  return trimTrailingSlash(explicit.trim())
}

export const buildViewerManifestUrl = (spaceId: string) => {
  const origin = getViewerCdnOrigin()
  const normalizedSpaceId = spaceId.replace(/\s+/g, "_")
  return `${origin}/spaces/${normalizedSpaceId}/manifest.json`
}

export const isViewerManifest = (value: unknown): value is ViewerManifest => {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.space_id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.owner === "string" &&
    typeof candidate.created_at === "string"
  )
}
