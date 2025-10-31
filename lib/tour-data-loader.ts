import { readFile } from "node:fs/promises"
import { join } from "node:path"

import type { Hotspot, HotspotMedia, SceneTransition } from "./types"
import { normalizeHotspotType } from "./hotspot-utils"

interface RawHotspotRecord {
  id: string
  type: string
  position: { x: number; y: number; z?: number }
  label?: string
  description?: string
  media_url?: string | null
  media?: unknown
  target_scene?: string | null
  link?: string | null
  metadata?: Record<string, unknown>
  custom_action?: string | null
}

interface SceneHotspotFile {
  hotspots: RawHotspotRecord[]
  version?: number
  updated_at?: string
}

interface RawTransitionRecord {
  target_scene: string
  transition_type?: string
  duration_ms?: number
  easing?: string
  preload?: boolean
  metadata?: Record<string, unknown>
}

interface SceneTransitionFile {
  transitions: RawTransitionRecord[]
  version?: number
}

interface ManifestSceneEntry {
  scene_id: string
  name?: string
  path: string
}

interface ManifestIndexFile {
  version: number
  scenes: ManifestSceneEntry[]
  default_transition?: {
    type?: string
    duration_ms?: number
  }
}

const TOUR_DATA_ROOT = join(process.cwd(), "tour_data")

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await readFile(filePath, "utf-8")
    return JSON.parse(raw) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

const mapHotspotRecord = (sceneId: string, record: RawHotspotRecord): Hotspot => {
  const base: Hotspot = {
    id: record.id,
    x: record.position?.x ?? 0,
    y: record.position?.y ?? 0,
    z: record.position?.z,
    type: normalizeHotspotType(record.type as Hotspot["type"]),
    label: record.label ?? undefined,
    description: record.description ?? undefined,
    targetSceneId: record.target_scene ?? undefined,
    linkUrl: record.link ?? undefined,
    mediaUrl: record.media_url ?? undefined,
    metadata: record.metadata ?? {},
    customActionId: record.custom_action ?? undefined,
  }

  if (typeof base.metadata?.scene !== "string" && base.targetSceneId === undefined) {
    base.metadata = { ...base.metadata, scene: sceneId }
  }

  if (record.media) {
    const buildMedia = (entry: unknown): HotspotMedia | null => {
      if (!entry || typeof entry !== "object") return null
      const mediaRecord = entry as Record<string, unknown>
      const url = typeof mediaRecord.url === "string" ? mediaRecord.url : base.mediaUrl
      if (!url) {
        return null
      }
      const media: HotspotMedia = {
        url,
        type: (mediaRecord.type as HotspotMedia["type"]) ?? "video",
        posterUrl: typeof mediaRecord.poster === "string" ? mediaRecord.poster : undefined,
        title: typeof mediaRecord.title === "string" ? mediaRecord.title : base.label,
        description: typeof mediaRecord.description === "string" ? mediaRecord.description : base.description,
        autoplay: mediaRecord.autoplay === true,
        loop: mediaRecord.loop === true,
        metadata:
          typeof mediaRecord.metadata === "object" && mediaRecord.metadata !== null
            ? (mediaRecord.metadata as Record<string, unknown>)
            : undefined,
      }
      return media
    }

    if (Array.isArray(record.media)) {
      const parsed = record.media.map((entry) => buildMedia(entry)).filter((entry): entry is HotspotMedia => Boolean(entry))
      if (parsed.length) {
        base.media = parsed
        base.mediaUrl = base.mediaUrl ?? parsed[0].url
      }
    } else {
      const parsed = buildMedia(record.media)
      if (parsed) {
        base.media = parsed
        base.mediaUrl = base.mediaUrl ?? parsed.url
      }
    }
  }

  return base
}

const mapTransitionRecord = (
  sceneId: string,
  record: RawTransitionRecord,
  defaults?: { type?: SceneTransition["type"]; duration?: number },
): SceneTransition => ({
  fromSceneId: sceneId,
  toSceneId: record.target_scene,
  type: (record.transition_type as SceneTransition["type"]) ?? defaults?.type ?? "walkthrough",
  duration: record.duration_ms ?? defaults?.duration ?? 1400,
  easing:
    record.easing === "linear" || record.easing === "cubic" || record.easing === "smoothstep"
      ? record.easing
      : undefined,
  preload: record.preload ?? true,
  metadata: record.metadata,
})

export const loadSceneHotspots = async (sceneId: string): Promise<Hotspot[]> => {
  const filePath = join(TOUR_DATA_ROOT, "scenes", sceneId, "hotspots.json")
  const payload = await readJson<SceneHotspotFile>(filePath)
  if (!payload?.hotspots?.length) {
    return []
  }
  return payload.hotspots.map((record) => mapHotspotRecord(sceneId, record))
}

export const loadSceneTransitions = async (sceneId: string): Promise<SceneTransition[]> => {
  const filePath = join(TOUR_DATA_ROOT, "scenes", sceneId, "transitions.json")
  const payload = await readJson<SceneTransitionFile>(filePath)
  if (!payload?.transitions?.length) {
    return []
  }
  const defaults = await loadManifestDefaults()
  return payload.transitions.map((record) =>
    mapTransitionRecord(sceneId, record, defaults?.defaultTransition),
  )
}

export interface TourDataManifest {
  scenes: ManifestSceneEntry[]
  defaultTransition?: { type?: SceneTransition["type"]; duration?: number }
}

let manifestCache: TourDataManifest | null = null

const loadManifestDefaults = async (): Promise<TourDataManifest | null> => {
  if (manifestCache) {
    return manifestCache
  }
  const filePath = join(TOUR_DATA_ROOT, "manifest_index.json")
  const payload = await readJson<ManifestIndexFile>(filePath)
  if (!payload) {
    return null
  }
  manifestCache = {
    scenes: payload.scenes,
    defaultTransition: payload.default_transition
      ? {
          type: payload.default_transition.type as SceneTransition["type"],
          duration: payload.default_transition.duration_ms ?? undefined,
        }
      : undefined,
  }
  return manifestCache
}

export const loadTourManifest = async (): Promise<TourDataManifest | null> => {
  return loadManifestDefaults()
}

export const loadScenePayload = async (
  sceneId: string,
): Promise<{ hotspots: Hotspot[]; transitions: SceneTransition[] }> => {
  const [hotspots, transitions] = await Promise.all([
    loadSceneHotspots(sceneId),
    loadSceneTransitions(sceneId),
  ])
  return { hotspots, transitions }
}
