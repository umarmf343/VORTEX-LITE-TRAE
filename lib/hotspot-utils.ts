import { Hotspot, HotspotMedia, HotspotType } from "./types"

type NormalizedHotspotType =
  | "info_point"
  | "media_embed"
  | "navigation_point"
  | "external_link"
  | "custom_action"

const LEGACY_TYPE_MAP: Record<string, NormalizedHotspotType> = {
  info: "info_point",
  link: "navigation_point",
  video: "media_embed",
  audio: "media_embed",
  image: "media_embed",
  cta: "custom_action",
}

export const normalizeHotspotType = (type: HotspotType): NormalizedHotspotType => {
  if (
    type === "info_point" ||
    type === "media_embed" ||
    type === "navigation_point" ||
    type === "external_link" ||
    type === "custom_action"
  ) {
    return type
  }

  const normalized = LEGACY_TYPE_MAP[type]
  return normalized ?? "info_point"
}

export const getHotspotLabel = (hotspot: Hotspot): string =>
  hotspot.label ?? hotspot.title ?? hotspot.description ?? ""

export const getHotspotDescription = (hotspot: Hotspot): string =>
  hotspot.description ?? hotspot.metadata?.description?.toString?.() ?? ""

export const resolveHotspotMedia = (hotspot: Hotspot): HotspotMedia[] => {
  if (Array.isArray(hotspot.media)) {
    return hotspot.media
  }
  if (hotspot.media) {
    return [hotspot.media]
  }
  if (hotspot.mediaUrl) {
    return [
      {
        type: inferMediaTypeFromUrl(hotspot.mediaUrl),
        url: hotspot.mediaUrl,
      },
    ]
  }
  return []
}

const inferMediaTypeFromUrl = (url: string): HotspotMedia["type"] => {
  const extension = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase()
  switch (extension) {
    case "mp4":
    case "webm":
    case "mov":
    case "m4v":
      return "video"
    case "mp3":
    case "wav":
    case "aac":
    case "ogg":
      return "audio"
    case "gltf":
    case "glb":
    case "usdz":
      return "model"
    case "pdf":
    case "doc":
    case "docx":
      return "document"
    default:
      return "image"
  }
}

export const isMediaHotspot = (hotspot: Hotspot) => normalizeHotspotType(hotspot.type) === "media_embed"

export const isNavigationHotspot = (hotspot: Hotspot) =>
  normalizeHotspotType(hotspot.type) === "navigation_point"

export const isInfoHotspot = (hotspot: Hotspot) => normalizeHotspotType(hotspot.type) === "info_point"

export const isExternalLinkHotspot = (hotspot: Hotspot) =>
  normalizeHotspotType(hotspot.type) === "external_link"

export const isCustomActionHotspot = (hotspot: Hotspot) =>
  normalizeHotspotType(hotspot.type) === "custom_action"

export const resolveHotspotTargetScene = (hotspot: Hotspot): string | undefined =>
  hotspot.targetSceneId ?? (hotspot.metadata?.targetScene as string | undefined)

export const resolveHotspotLink = (hotspot: Hotspot): string | undefined =>
  hotspot.linkUrl ?? hotspot.actionUrl ?? (hotspot.metadata?.link as string | undefined)

export const shouldDisplayInfoPanel = (hotspot: Hotspot): boolean => {
  const type = normalizeHotspotType(hotspot.type)
  return type === "info_point" || type === "media_embed"
}

export const getPrimaryMedia = (hotspot: Hotspot): HotspotMedia | undefined =>
  resolveHotspotMedia(hotspot)[0]

export interface HotspotOcclusionState {
  hidden: boolean
  reason?: "distance" | "angle" | "manual"
}

export const evaluateOcclusion = (
  hotspot: Hotspot,
  options: {
    distance?: number
    cameraAngle?: number
  },
): HotspotOcclusionState => {
  const occlusion = hotspot.occlusion
  if (!occlusion?.enabled && occlusion?.mode !== "auto") {
    return { hidden: false }
  }

  if (occlusion?.maxDistance !== undefined && options.distance !== undefined && options.distance > occlusion.maxDistance) {
    return { hidden: true, reason: "distance" }
  }

  if (occlusion?.mode === "manual") {
    return { hidden: false }
  }

  if (options.cameraAngle !== undefined && options.cameraAngle > 85) {
    return { hidden: true, reason: "angle" }
  }

  return { hidden: false }
}

