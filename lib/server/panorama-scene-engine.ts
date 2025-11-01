import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

import type {
  MeasurementUnits,
  PanoramaScene,
  PanoramaSceneHotspot,
  PanoramaSceneInitialView,
  PanoramaTourManifest,
  PropertyPrimaryContact,
  PropertyPrivacy,
} from "@/lib/types"
import { recordAnalyticsEvent } from "@/lib/server/analytics-events"

const MODULE_NAME = "PanoramaSceneEngine"
const DATA_DIR = path.join(process.cwd(), "tour_data")
const STORE_PATH = path.join(DATA_DIR, "panorama-scenes.json")
const PUBLISHED_PATH = path.join(DATA_DIR, "panorama-tour-manifest.json")

interface SceneEnginePropertyMetadata {
  id: string
  title: string
  address: string
  ownerId: string
  ownerName: string
  ownerEmail?: string
  privacy: PropertyPrivacy
  defaultLanguage: string
  defaultUnits: MeasurementUnits
  timezone: string
  tags: string[]
  primaryContact?: PropertyPrimaryContact
  createdAt: string
  updatedAt: string
}

interface PanoramaSceneStore {
  module: typeof MODULE_NAME
  version: number
  title: string
  initialSceneId: string
  property: SceneEnginePropertyMetadata
  scenes: PanoramaScene[]
}

interface SceneUploadPayload {
  id: string
  name: string
  imageUrl: string
  thumbnailUrl?: string
  description?: string
  ambientSound?: string
  sceneType: PanoramaScene["sceneType"]
  floor?: string
  orientationHint?: string
  tags?: string[]
  depthMapUrl?: string
  pointCloudUrl?: string
  initialView: PanoramaSceneInitialView
}

interface SceneLinkPayload {
  sourceSceneId: string
  targetSceneId: string
  x: number
  y: number
  label: string
  bidirectional?: boolean
  autoAlign?: boolean
}

interface SceneEngineSnapshot {
  title: string
  initialSceneId: string
  property: SceneEnginePropertyMetadata
  scenes: PanoramaScene[]
  manifest: PanoramaTourManifest | null
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const normalizeYaw = (value: number) => {
  const wrapped = ((value % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

const clampPercentage = (value: number) => clamp(value, 0, 100)

const percentageToYawPitch = (xPercent: number, yPercent: number) => {
  const clampedX = clampPercentage(xPercent)
  const clampedY = clampPercentage(yPercent)
  const yaw = normalizeYaw((clampedX / 100) * 360 - 180)
  const pitch = clamp(90 - (clampedY / 100) * 180, -90, 90)
  return { yaw, pitch }
}

const yawPitchToPercentage = (yaw: number, pitch: number) => {
  const normalizedYaw = normalizeYaw(yaw)
  const clampedPitch = clamp(pitch, -90, 90)
  const x = ((normalizedYaw + 180) / 360) * 100
  const y = ((90 - clampedPitch) / 180) * 100
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

async function ensureDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8")
    return JSON.parse(content) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await ensureDirectory()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}

function createAssetPath(
  propertyId: string,
  sceneId: string,
  variant: "preview" | "web" | "print",
) {
  return `/properties/${propertyId}/scenes/${sceneId}/processed/${variant}/${sceneId}.jpg`
}

function ensureSceneStructure(
  scene: Partial<PanoramaScene> & { id: string; name: string; imageUrl: string },
  propertyId: string,
): PanoramaScene {
  const timestamp = scene.createdAt ?? new Date().toISOString()
  const updatedAt = scene.updatedAt ?? timestamp
  const initialView = scene.initialView ?? { yaw: 0, pitch: 0, fov: 90 }
  const assets = scene.assets ?? {
    raw: scene.imageUrl,
    preview: createAssetPath(propertyId, scene.id, "preview"),
    web: createAssetPath(propertyId, scene.id, "web"),
    print: createAssetPath(propertyId, scene.id, "print"),
    depthMap: scene.assets?.depthMap,
    pointCloud: scene.assets?.pointCloud,
  }
  const depthEnabled = Boolean(
    scene.processing?.depthEnabled || assets.depthMap || assets.pointCloud,
  )
  const processing = scene.processing ?? {
    status: "READY" as const,
    startedAt: timestamp,
    completedAt: updatedAt,
    accuracyEstimate: depthEnabled ? ("high" as const) : ("medium" as const),
    warnings: depthEnabled
      ? []
      : ["Depth data missing — measurement accuracy limited"],
    errors: [],
    depthEnabled,
  }
  const measurement = scene.measurement ?? {
    enabled: depthEnabled,
    accuracyCm: depthEnabled ? 2 : undefined,
    notes: depthEnabled ? undefined : "Using visual alignment only.",
  }

  const hotspots: PanoramaSceneHotspot[] = Array.isArray(scene.hotspots)
    ? scene.hotspots.map((hotspot) => {
        const base: PanoramaSceneHotspot = {
          ...hotspot,
          id: hotspot.id ?? randomUUID(),
          targetSceneId: hotspot.targetSceneId,
          label: hotspot.label ?? `Hotspot to ${hotspot.targetSceneId}`,
        }

        if (typeof base.x !== "number" || typeof base.y !== "number") {
          const { x, y } = yawPitchToPercentage(base.yaw ?? 0, base.pitch ?? 0)
          base.x = clampPercentage(typeof base.x === "number" ? base.x : x)
          base.y = clampPercentage(typeof base.y === "number" ? base.y : y)
        } else {
          base.x = clampPercentage(base.x)
          base.y = clampPercentage(base.y)
        }

        if (typeof base.yaw !== "number" || typeof base.pitch !== "number") {
          const { yaw, pitch } = percentageToYawPitch(base.x ?? 0, base.y ?? 0)
          base.yaw = yaw
          base.pitch = pitch
        } else {
          base.yaw = normalizeYaw(base.yaw)
          base.pitch = clamp(base.pitch, -90, 90)
        }

        return base
      })
    : []

  return {
    id: scene.id,
    name: scene.name,
    imageUrl: scene.imageUrl,
    thumbnailUrl: scene.thumbnailUrl ?? scene.imageUrl,
    description: scene.description,
    ambientSound: scene.ambientSound,
    sceneType: scene.sceneType ?? "interior",
    floor: scene.floor ?? "1",
    orientationHint: scene.orientationHint ?? "north",
    tags: Array.isArray(scene.tags) ? scene.tags : [],
    initialView,
    hotspots,
    createdAt: timestamp,
    updatedAt,
    assets,
    processing: {
      ...processing,
      warnings: processing.warnings ?? [],
      errors: processing.errors ?? [],
      depthEnabled: processing.depthEnabled ?? depthEnabled,
      accuracyEstimate:
        processing.accuracyEstimate ?? (depthEnabled ? "high" : "medium"),
      startedAt: processing.startedAt ?? timestamp,
      completedAt:
        processing.completedAt ??
        (processing.status === "READY" ? updatedAt : undefined),
    },
    measurement: {
      ...measurement,
      enabled: measurement.enabled ?? depthEnabled,
      accuracyCm: measurement.accuracyCm ?? (depthEnabled ? 2 : undefined),
    },
  }
}

function createSampleProperty(): SceneEnginePropertyMetadata {
  const now = new Date().toISOString()
  return {
    id: "prop-sample-panorama",
    title: "Sample Panorama Residence",
    address: "123 Panorama Way, Immersion City",
    ownerId: "owner-sample",
    ownerName: "Experience Director",
    ownerEmail: "director@baladshelter.com",
    privacy: "private",
    defaultLanguage: "en",
    defaultUnits: "imperial",
    timezone: "America/Los_Angeles",
    tags: ["sample", "residential"],
    primaryContact: {
      name: "Jamie Rivera",
      email: "jamie.rivera@baladshelter.com",
      phone: "+1 (555) 010-2025",
    },
    createdAt: now,
    updatedAt: now,
  }
}

function createSampleScenes(): PanoramaSceneStore {
  const property = createSampleProperty()
  const seededAt = property.createdAt
  const entranceHotspot: PanoramaSceneHotspot = {
    id: randomUUID(),
    targetSceneId: "living-room",
    ...yawPitchToPercentage(20, -2),
    yaw: 20,
    pitch: -2,
    label: "Enter Living Room",
    autoAlignmentYaw: 0,
    autoAlignmentPitch: 0,
  }
  const livingHotspots: PanoramaSceneHotspot[] = [
    {
      id: randomUUID(),
      targetSceneId: "kitchen",
      ...yawPitchToPercentage(45, -4),
      yaw: 45,
      pitch: -4,
      label: "Walk to Kitchen",
      autoAlignmentYaw: 10,
      autoAlignmentPitch: 0,
    },
    {
      id: randomUUID(),
      targetSceneId: "entrance",
      ...yawPitchToPercentage(-130, -6),
      yaw: -130,
      pitch: -6,
      label: "Back to Entrance",
      autoAlignmentYaw: 5,
      autoAlignmentPitch: 0,
    },
  ]
  const kitchenHotspots: PanoramaSceneHotspot[] = [
    {
      id: randomUUID(),
      targetSceneId: "living-room",
      ...yawPitchToPercentage(-135, -4),
      yaw: -135,
      pitch: -4,
      label: "Return to Living Room",
      autoAlignmentYaw: 0,
      autoAlignmentPitch: 0,
    },
    {
      id: randomUUID(),
      targetSceneId: "backyard",
      ...yawPitchToPercentage(60, -5),
      yaw: 60,
      pitch: -5,
      label: "Open Backyard",
      autoAlignmentYaw: -5,
      autoAlignmentPitch: 0,
    },
  ]
  const backyardHotspots: PanoramaSceneHotspot[] = [
    {
      id: randomUUID(),
      targetSceneId: "kitchen",
      ...yawPitchToPercentage(-110, -6),
      yaw: -110,
      pitch: -6,
      label: "Inside Kitchen",
      autoAlignmentYaw: 0,
      autoAlignmentPitch: 0,
    },
  ]

  const scenes: PanoramaScene[] = [
    ensureSceneStructure(
      {
        id: "entrance",
        name: "Entrance",
        imageUrl: "/panorama-samples/entrance",
        thumbnailUrl: "/panorama-samples/entrance",
        description: "Warm entry foyer with natural light",
        sceneType: "interior",
        tags: ["foyer", "entry"],
        initialView: { yaw: 15, pitch: -2, fov: 85 },
        hotspots: [entranceHotspot],
        floor: "1",
        orientationHint: "faces courtyard",
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      property.id,
    ),
    ensureSceneStructure(
      {
        id: "living-room",
        name: "Living Room",
        imageUrl: "/panorama-samples/living-room",
        thumbnailUrl: "/panorama-samples/living-room",
        description: "Open concept living room",
        sceneType: "interior",
        tags: ["family", "lounge"],
        initialView: { yaw: 0, pitch: 0, fov: 90 },
        hotspots: livingHotspots,
        floor: "1",
        orientationHint: "faces skyline",
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      property.id,
    ),
    ensureSceneStructure(
      {
        id: "kitchen",
        name: "Kitchen",
        imageUrl: "/panorama-samples/kitchen",
        thumbnailUrl: "/panorama-samples/kitchen",
        description: "Chef-inspired kitchen with breakfast nook",
        sceneType: "interior",
        tags: ["kitchen", "gourmet"],
        initialView: { yaw: -10, pitch: -3, fov: 88 },
        hotspots: kitchenHotspots,
        floor: "1",
        orientationHint: "faces dining gallery",
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      property.id,
    ),
    ensureSceneStructure(
      {
        id: "backyard",
        name: "Backyard",
        imageUrl: "/panorama-samples/backyard",
        thumbnailUrl: "/panorama-samples/backyard",
        description: "Outdoor space with lounge seating and greenery",
        sceneType: "exterior",
        tags: ["garden", "outdoor"],
        initialView: { yaw: 60, pitch: -4, fov: 92 },
        hotspots: backyardHotspots,
        floor: "1",
        orientationHint: "faces pool",
        createdAt: seededAt,
        updatedAt: seededAt,
      },
      property.id,
    ),
  ]

  return {
    module: MODULE_NAME,
    version: 2,
    title: property.title,
    initialSceneId: "entrance",
    property,
    scenes,
  }
}

function migrateScene(scene: PanoramaScene, propertyId: string): PanoramaScene {
  return ensureSceneStructure(scene, propertyId)
}

async function loadStore(): Promise<PanoramaSceneStore> {
  const existing = await readJsonFile<PanoramaSceneStore>(STORE_PATH)
  if (!existing) {
    const seeded = createSampleScenes()
    await writeJsonFile(STORE_PATH, seeded)
    return seeded
  }

  let hasChanges = false
  const property = existing.property ?? createSampleProperty()
  if (!existing.property) {
    hasChanges = true
  }

  const scenes = existing.scenes.map((scene) => {
    const normalized = migrateScene(scene, property.id)
    if (normalized !== scene) {
      hasChanges = true
    }
    return normalized
  })

  const store: PanoramaSceneStore = {
    module: MODULE_NAME,
    version: existing.version ?? 2,
    title: existing.title ?? property.title,
    initialSceneId: existing.initialSceneId ?? scenes[0]?.id ?? "",
    property: {
      ...property,
      title: property.title ?? existing.title ?? "Panorama Property",
      updatedAt: property.updatedAt ?? new Date().toISOString(),
      tags: Array.isArray(property.tags) ? property.tags : [],
    },
    scenes,
  }

  if (hasChanges) {
    await writeJsonFile(STORE_PATH, store)
  }

  return store
}

async function saveStore(store: PanoramaSceneStore) {
  await writeJsonFile(STORE_PATH, store)
}

function updateScene(
  existing: PanoramaScene | undefined,
  payload: SceneUploadPayload,
  propertyId: string,
  timestamp: string,
): PanoramaScene {
  const depthEnabled = Boolean(
    payload.depthMapUrl ||
      payload.pointCloudUrl ||
      existing?.processing.depthEnabled,
  )
  const baseAssets = existing?.assets ?? ensureSceneStructure(existing ?? {
      id: payload.id,
      name: payload.name,
      imageUrl: payload.imageUrl,
    }, propertyId).assets

  const assets = {
    ...baseAssets,
    raw: payload.imageUrl,
    preview: baseAssets.preview ?? createAssetPath(propertyId, payload.id, "preview"),
    web: baseAssets.web ?? createAssetPath(propertyId, payload.id, "web"),
    print: baseAssets.print ?? createAssetPath(propertyId, payload.id, "print"),
    depthMap: payload.depthMapUrl ?? baseAssets.depthMap,
    pointCloud: payload.pointCloudUrl ?? baseAssets.pointCloud,
  }

  const measurementEnabled = depthEnabled || Boolean(assets.depthMap || assets.pointCloud)

  const baseScene: PanoramaScene = existing
    ? existing
    : {
        id: payload.id,
        name: payload.name,
        imageUrl: payload.imageUrl,
        thumbnailUrl: payload.thumbnailUrl ?? payload.imageUrl,
        description: payload.description,
        ambientSound: payload.ambientSound,
        sceneType: payload.sceneType,
        floor: payload.floor,
        orientationHint: payload.orientationHint ?? "orientation not set",
        tags: payload.tags ?? [],
        initialView: payload.initialView,
        hotspots: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        assets,
        processing: {
          status: "READY",
          startedAt: timestamp,
          completedAt: timestamp,
          accuracyEstimate: measurementEnabled ? "high" : "medium",
          warnings: measurementEnabled ? [] : ["Depth data not provided"],
          errors: [],
          depthEnabled: measurementEnabled,
        },
        measurement: {
          enabled: measurementEnabled,
          accuracyCm: measurementEnabled ? 2 : undefined,
          notes: measurementEnabled ? undefined : "Measurements limited to visual estimation",
        },
      }

  return {
    ...baseScene,
    name: payload.name,
    imageUrl: payload.imageUrl,
    thumbnailUrl: payload.thumbnailUrl ?? payload.imageUrl,
    description: payload.description,
    ambientSound: payload.ambientSound,
    sceneType: payload.sceneType,
    floor: payload.floor ?? baseScene.floor,
    orientationHint: payload.orientationHint ?? baseScene.orientationHint,
    tags: payload.tags ?? baseScene.tags,
    initialView: payload.initialView,
    assets,
    processing: {
      status: "READY",
      startedAt: baseScene.processing.startedAt ?? timestamp,
      completedAt: timestamp,
      accuracyEstimate: measurementEnabled ? "high" : baseScene.processing.accuracyEstimate ?? "medium",
      warnings: measurementEnabled ? [] : baseScene.processing.warnings?.length ? baseScene.processing.warnings : ["Depth data not provided"],
      errors: [],
      depthEnabled: measurementEnabled,
    },
    measurement: {
      enabled: measurementEnabled,
      accuracyCm: measurementEnabled ? baseScene.measurement.accuracyCm ?? 2 : undefined,
      notes: measurementEnabled ? undefined : "Measurements limited to visual estimation",
    },
    updatedAt: timestamp,
  }
}

function findSceneOrThrow(store: PanoramaSceneStore, sceneId: string) {
  const scene = store.scenes.find((item) => item.id === sceneId)
  if (!scene) {
    throw new Error(`Scene ${sceneId} not found`)
  }
  return scene
}

export async function registerPanoramaSceneModule() {
  await loadStore()
}

export async function getSceneEngineSnapshot(): Promise<SceneEngineSnapshot> {
  const [store, manifest] = await Promise.all([
    loadStore(),
    readJsonFile<PanoramaTourManifest>(PUBLISHED_PATH),
  ])
  return {
    title: store.title,
    initialSceneId: store.initialSceneId,
    property: store.property,
    scenes: store.scenes,
    manifest: manifest ?? null,
  }
}

export async function uploadScene(payload: SceneUploadPayload): Promise<PanoramaScene> {
  if (!payload.id || !payload.name) {
    throw new Error("Scene id and name are required")
  }
  if (!payload.imageUrl) {
    throw new Error("Scene imageUrl is required")
  }
  const timestamp = new Date().toISOString()
  const store = await loadStore()
  const existingIndex = store.scenes.findIndex((scene) => scene.id === payload.id)
  const scene = updateScene(
    existingIndex >= 0 ? store.scenes[existingIndex] : undefined,
    payload,
    store.property.id,
    timestamp,
  )

  if (existingIndex >= 0) {
    store.scenes[existingIndex] = scene
  } else {
    store.scenes.push(scene)
    if (!store.initialSceneId) {
      store.initialSceneId = scene.id
    }
  }

  await saveStore(store)

  await recordAnalyticsEvent("scene_uploaded", {
    scene_id: scene.id,
    property_id: store.property.id,
    scene_type: scene.sceneType,
  })
  await recordAnalyticsEvent("scene_processed", {
    scene_id: scene.id,
    property_id: store.property.id,
    status: scene.processing.status,
    accuracy: scene.processing.accuracyEstimate,
  })

  return findSceneOrThrow(store, payload.id)
}

export async function linkScenes(payload: SceneLinkPayload): Promise<PanoramaSceneHotspot> {
  const store = await loadStore()
  const source = findSceneOrThrow(store, payload.sourceSceneId)
  findSceneOrThrow(store, payload.targetSceneId)

  const timestamp = new Date().toISOString()
  const x = clampPercentage(payload.x)
  const y = clampPercentage(payload.y)
  const { yaw, pitch } = percentageToYawPitch(x, y)
  const hotspot: PanoramaSceneHotspot = {
    id: randomUUID(),
    targetSceneId: payload.targetSceneId,
    x,
    y,
    yaw,
    pitch,
    label: payload.label,
  }

  if (payload.autoAlign) {
    const target = findSceneOrThrow(store, payload.targetSceneId)
    hotspot.autoAlignmentYaw = target.initialView.yaw
    hotspot.autoAlignmentPitch = target.initialView.pitch
  }

  source.hotspots = [...source.hotspots, hotspot]
  source.updatedAt = timestamp

  if (payload.bidirectional) {
    const target = findSceneOrThrow(store, payload.targetSceneId)
    const reverseYaw = normalizeYaw(yaw + 180)
    const reversePitch = clamp(-pitch, -90, 90)
    const reversePercentages = yawPitchToPercentage(reverseYaw, reversePitch)
    const reverseHotspot: PanoramaSceneHotspot = {
      id: randomUUID(),
      targetSceneId: source.id,
      x: reversePercentages.x,
      y: reversePercentages.y,
      yaw: reverseYaw,
      pitch: reversePitch,
      label: `Back to ${source.name}`,
    }
    if (payload.autoAlign) {
      reverseHotspot.autoAlignmentYaw = source.initialView.yaw
      reverseHotspot.autoAlignmentPitch = source.initialView.pitch
    }
    target.hotspots = [...target.hotspots, reverseHotspot]
    target.updatedAt = timestamp
  }

  await saveStore(store)

  await recordAnalyticsEvent("hotspot_created", {
    hotspot_id: hotspot.id,
    source_scene: payload.sourceSceneId,
    target_scene: payload.targetSceneId,
    property_id: store.property.id,
  })

  return hotspot
}

export async function publishTour(initialSceneId?: string): Promise<PanoramaTourManifest> {
  const store = await loadStore()
  const chosenInitialId = initialSceneId ?? store.initialSceneId ?? store.scenes[0]?.id
  if (!chosenInitialId) {
    throw new Error("No scenes available to publish")
  }

  const publishedAt = new Date().toISOString()
  const hotspots = store.scenes.flatMap((scene) =>
    scene.hotspots.map((hotspot) => ({
      ...hotspot,
      sceneId: scene.id,
    })),
  )
  const accuracyScores = store.scenes.reduce<Record<string, string>>((acc, scene) => {
    acc[scene.id] = scene.processing.depthEnabled ? "high" : "medium"
    return acc
  }, {})

  const manifest: PanoramaTourManifest = {
    id: `${MODULE_NAME.toLowerCase()}-tour`,
    version: store.version,
    title: store.title,
    property: {
      id: store.property.id,
      title: store.property.title,
      address: store.property.address,
      ownerId: store.property.ownerId,
      ownerName: store.property.ownerName,
      ownerEmail: store.property.ownerEmail,
      privacy: store.property.privacy,
      defaultLanguage: store.property.defaultLanguage,
      defaultUnits: store.property.defaultUnits,
      timezone: store.property.timezone,
      tags: store.property.tags,
      primaryContact: store.property.primaryContact,
      createdAt: store.property.createdAt,
      updatedAt: publishedAt,
    },
    initialSceneId: chosenInitialId,
    createdAt: store.property.createdAt,
    publishedAt,
    scenes: store.scenes,
    hotspots,
    navigationGraph: store.scenes.reduce<Record<string, PanoramaSceneHotspot[]>>((acc, scene) => {
      acc[scene.id] = scene.hotspots
      return acc
    }, {}),
    accuracyScores,
    accessControls: {
      privacy: store.property.privacy,
      tokens: store.property.privacy === "private" ? [] : undefined,
    },
    analyticsHooks: {
      events: [
        "property_created",
        "scene_uploaded",
        "hotspot_created",
        "transition_started",
        "transition_completed",
      ],
    },
  }
  await writeJsonFile(PUBLISHED_PATH, manifest)

  await recordAnalyticsEvent("tour_published", {
    property_id: store.property.id,
    scene_count: store.scenes.length,
    hotspot_count: hotspots.length,
  })

  return manifest
}

export async function getPublishedManifest(): Promise<PanoramaTourManifest | null> {
  return readJsonFile<PanoramaTourManifest>(PUBLISHED_PATH)
}

export interface ScenePropertyMetadataInput {
  id: string
  title: string
  address: string
  ownerId: string
  ownerName: string
  ownerEmail?: string
  privacy: PropertyPrivacy
  defaultLanguage: string
  defaultUnits: MeasurementUnits
  timezone: string
  tags?: string[]
  primaryContact?: PropertyPrimaryContact
  createdAt: string
  updatedAt: string
}

export async function upsertScenePropertyMetadata(
  metadata: ScenePropertyMetadataInput,
) {
  const store = await loadStore()
  const now = new Date().toISOString()
  const createdAt = store.property.id === metadata.id ? store.property.createdAt : metadata.createdAt

  store.property = {
    id: metadata.id,
    title: metadata.title,
    address: metadata.address,
    ownerId: metadata.ownerId,
    ownerName: metadata.ownerName,
    ownerEmail: metadata.ownerEmail,
    privacy: metadata.privacy,
    defaultLanguage: metadata.defaultLanguage,
    defaultUnits: metadata.defaultUnits,
    timezone: metadata.timezone,
    tags: metadata.tags ?? [],
    primaryContact: metadata.primaryContact,
    createdAt,
    updatedAt: metadata.updatedAt ?? now,
  }
  store.title = metadata.title

  await saveStore(store)
}

export type {
  SceneUploadPayload as PanoramaSceneUploadPayload,
  SceneLinkPayload as PanoramaSceneLinkPayload,
  SceneEngineSnapshot as PanoramaSceneEngineSnapshot,
  ScenePropertyMetadataInput as PanoramaScenePropertyMetadataInput,
}
