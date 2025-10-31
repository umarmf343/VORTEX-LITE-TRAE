import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

import type {
  PanoramaScene,
  PanoramaSceneHotspot,
  PanoramaSceneInitialView,
  PanoramaTourManifest,
} from "@/lib/types"

const MODULE_NAME = "PanoramaSceneEngine"
const DATA_DIR = path.join(process.cwd(), "tour_data")
const STORE_PATH = path.join(DATA_DIR, "panorama-scenes.json")
const PUBLISHED_PATH = path.join(DATA_DIR, "panorama-tour-manifest.json")

interface PanoramaSceneStore {
  module: typeof MODULE_NAME
  version: number
  title: string
  initialSceneId: string
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
  tags?: string[]
  initialView: PanoramaSceneInitialView
}

interface SceneLinkPayload {
  sourceSceneId: string
  targetSceneId: string
  yaw: number
  pitch: number
  label: string
  bidirectional?: boolean
  autoAlign?: boolean
}

interface SceneEngineSnapshot {
  title: string
  initialSceneId: string
  scenes: PanoramaScene[]
  manifest: PanoramaTourManifest | null
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const normalizeYaw = (value: number) => {
  const wrapped = ((value % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
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

function createSampleScenes(): PanoramaSceneStore {
  const seededAt = new Date().toISOString()
  const entranceHotspot: PanoramaSceneHotspot = {
    id: randomUUID(),
    targetSceneId: "living-room",
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
      yaw: 45,
      pitch: -4,
      label: "Walk to Kitchen",
      autoAlignmentYaw: 10,
      autoAlignmentPitch: 0,
    },
    {
      id: randomUUID(),
      targetSceneId: "entrance",
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
      yaw: -135,
      pitch: -4,
      label: "Return to Living Room",
      autoAlignmentYaw: 0,
      autoAlignmentPitch: 0,
    },
    {
      id: randomUUID(),
      targetSceneId: "backyard",
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
      yaw: -110,
      pitch: -6,
      label: "Inside Kitchen",
      autoAlignmentYaw: 0,
      autoAlignmentPitch: 0,
    },
  ]

  const scenes: PanoramaScene[] = [
    {
      id: "entrance",
      name: "Entrance",
      imageUrl: "/panorama-samples/entrance",
      thumbnailUrl: "/panorama-samples/entrance",
      description: "Warm entry foyer with natural light",
      ambientSound: undefined,
      sceneType: "interior",
      tags: ["foyer", "entry"],
      initialView: { yaw: 15, pitch: -2, fov: 85 },
      hotspots: [entranceHotspot],
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    {
      id: "living-room",
      name: "Living Room",
      imageUrl: "/panorama-samples/living-room",
      thumbnailUrl: "/panorama-samples/living-room",
      description: "Open concept living room",
      ambientSound: undefined,
      sceneType: "interior",
      tags: ["family", "lounge"],
      initialView: { yaw: 0, pitch: 0, fov: 90 },
      hotspots: livingHotspots,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    {
      id: "kitchen",
      name: "Kitchen",
      imageUrl: "/panorama-samples/kitchen",
      thumbnailUrl: "/panorama-samples/kitchen",
      description: "Chef-inspired kitchen with breakfast nook",
      ambientSound: undefined,
      sceneType: "interior",
      tags: ["kitchen", "gourmet"],
      initialView: { yaw: -10, pitch: -3, fov: 88 },
      hotspots: kitchenHotspots,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
    {
      id: "backyard",
      name: "Backyard",
      imageUrl: "/panorama-samples/backyard",
      thumbnailUrl: "/panorama-samples/backyard",
      description: "Outdoor space with lounge seating and greenery",
      ambientSound: undefined,
      sceneType: "exterior",
      tags: ["garden", "outdoor"],
      initialView: { yaw: 60, pitch: -4, fov: 92 },
      hotspots: backyardHotspots,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ]

  return {
    module: MODULE_NAME,
    version: 1,
    title: "Sample Panorama Residence",
    initialSceneId: "entrance",
    scenes,
  }
}

async function loadStore(): Promise<PanoramaSceneStore> {
  const existing = await readJsonFile<PanoramaSceneStore>(STORE_PATH)
  if (existing) {
    return existing
  }
  const seeded = createSampleScenes()
  await writeJsonFile(STORE_PATH, seeded)
  return seeded
}

async function saveStore(store: PanoramaSceneStore) {
  await writeJsonFile(STORE_PATH, store)
}

function updateScene(existing: PanoramaScene | undefined, payload: SceneUploadPayload, timestamp: string): PanoramaScene {
  if (!existing) {
    return {
      id: payload.id,
      name: payload.name,
      imageUrl: payload.imageUrl,
      thumbnailUrl: payload.thumbnailUrl ?? payload.imageUrl,
      description: payload.description,
      ambientSound: payload.ambientSound,
      sceneType: payload.sceneType,
      floor: payload.floor,
      tags: payload.tags,
      initialView: payload.initialView,
      hotspots: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  return {
    ...existing,
    name: payload.name,
    imageUrl: payload.imageUrl,
    thumbnailUrl: payload.thumbnailUrl ?? payload.imageUrl,
    description: payload.description,
    ambientSound: payload.ambientSound,
    sceneType: payload.sceneType,
    floor: payload.floor,
    tags: payload.tags,
    initialView: payload.initialView,
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
  if (existingIndex >= 0) {
    store.scenes[existingIndex] = updateScene(store.scenes[existingIndex], payload, timestamp)
  } else {
    store.scenes.push(updateScene(undefined, payload, timestamp))
    if (!store.initialSceneId) {
      store.initialSceneId = payload.id
    }
  }
  await saveStore(store)
  return findSceneOrThrow(store, payload.id)
}

export async function linkScenes(payload: SceneLinkPayload): Promise<PanoramaSceneHotspot> {
  const store = await loadStore()
  const source = findSceneOrThrow(store, payload.sourceSceneId)
  findSceneOrThrow(store, payload.targetSceneId)

  const timestamp = new Date().toISOString()
  const hotspot: PanoramaSceneHotspot = {
    id: randomUUID(),
    targetSceneId: payload.targetSceneId,
    yaw: normalizeYaw(payload.yaw),
    pitch: clamp(payload.pitch, -90, 90),
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
    const reverseHotspot: PanoramaSceneHotspot = {
      id: randomUUID(),
      targetSceneId: source.id,
      yaw: normalizeYaw(payload.yaw + 180),
      pitch: clamp(-payload.pitch, -90, 90),
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
  return hotspot
}

export async function publishTour(initialSceneId?: string): Promise<PanoramaTourManifest> {
  const store = await loadStore()
  const chosenInitialId = initialSceneId ?? store.initialSceneId ?? store.scenes[0]?.id
  if (!chosenInitialId) {
    throw new Error("No scenes available to publish")
  }
  const manifest: PanoramaTourManifest = {
    id: `${MODULE_NAME.toLowerCase()}-tour`,
    title: store.title,
    initialSceneId: chosenInitialId,
    publishedAt: new Date().toISOString(),
    scenes: store.scenes,
    navigationGraph: store.scenes.reduce<Record<string, PanoramaSceneHotspot[]>>((acc, scene) => {
      acc[scene.id] = scene.hotspots
      return acc
    }, {}),
  }
  await writeJsonFile(PUBLISHED_PATH, manifest)
  return manifest
}

export async function getPublishedManifest(): Promise<PanoramaTourManifest | null> {
  return readJsonFile<PanoramaTourManifest>(PUBLISHED_PATH)
}

export type {
  SceneUploadPayload as PanoramaSceneUploadPayload,
  SceneLinkPayload as PanoramaSceneLinkPayload,
  SceneEngineSnapshot as PanoramaSceneEngineSnapshot,
};
