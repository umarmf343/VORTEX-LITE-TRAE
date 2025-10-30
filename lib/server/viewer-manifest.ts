import { randomBytes } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import type {
  FloorPlan,
  Hotspot,
  Property,
  ViewerManifest,
  ViewerManifestAccess,
  ViewerManifestControlPlaneState,
  ViewerManifestGeometry,
  ViewerManifestHotspot,
  ViewerManifestMeasurement,
  ViewerManifestNavigation,
  ViewerManifestViews,
} from "@/lib/types"
import {
  VIEWER_MANIFEST_SCHEMA_ID,
  VIEWER_MANIFEST_VERSION,
  buildViewerManifestUrl,
  getViewerCdnOrigin,
} from "@/lib/viewer-manifest"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const CONTROL_PLANE_FILE = path.join(DATA_DIRECTORY, "viewer-control-plane.json")
const SCHEMA_PATH = path.join(process.cwd(), "docs", "pipeline", "viewer-manifest-schema.json")
const CDN_DIRECTORY = path.join(process.cwd(), "public", "spaces")

const toIsoString = (value: Date | string | undefined) => {
  if (!value) {
    return new Date().toISOString()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

const ensureDirectory = async (directory: string) => {
  await fs.mkdir(directory, { recursive: true })
}

const readJson = async (filePath: string) => {
  const contents = await fs.readFile(filePath, "utf8")
  return JSON.parse(contents) as Record<string, unknown>
}

const writeJson = async (filePath: string, payload: unknown) => {
  await ensureDirectory(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8")
}

const readSchema = async () => {
  const schema = (await readJson(SCHEMA_PATH)) as { [key: string]: unknown; $id?: unknown }
  if (schema.$id !== VIEWER_MANIFEST_SCHEMA_ID) {
    schema.$id = VIEWER_MANIFEST_SCHEMA_ID
  }
  return schema as Record<string, unknown>
}

const loadExistingControlPlane = async (): Promise<ViewerManifestControlPlaneState | null> => {
  try {
    const payload = await readJson(CONTROL_PLANE_FILE)
    return payload as ViewerManifestControlPlaneState
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

const CONTROL_PLANE_NOTES =
  "Viewer manifest schema registered for immersive viewer consumption."

export const registerViewerManifestSchema = async (): Promise<ViewerManifestControlPlaneState> => {
  const schema = await readSchema()
  const existing = await loadExistingControlPlane()
  if (existing && existing.schemaVersion === VIEWER_MANIFEST_SCHEMA_ID) {
    return existing
  }

  const state: ViewerManifestControlPlaneState = {
    schemaVersion: VIEWER_MANIFEST_SCHEMA_ID,
    registeredAt: new Date().toISOString(),
    schema,
    notes: CONTROL_PLANE_NOTES,
  }

  await writeJson(CONTROL_PLANE_FILE, state)
  return state
}

let controlPlanePromise: Promise<ViewerManifestControlPlaneState> | null = null

export const ensureViewerManifestControlPlane = () => {
  if (!controlPlanePromise) {
    controlPlanePromise = registerViewerManifestSchema().catch((error) => {
      controlPlanePromise = null
      throw error
    })
  }

  return controlPlanePromise
}

const toCdnUrl = (spaceId: string, assetUrl?: string) => {
  if (!assetUrl) {
    return undefined
  }
  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl
  }
  const trimmed = assetUrl.replace(/^\/+/, "")
  return `${getViewerCdnOrigin()}/spaces/${spaceId}/${trimmed}`
}

const deriveGeometry = (spaceId: string, property: Property): ViewerManifestGeometry => {
  const lodLevels = (property.dollhouseModel?.lodLevels ?? ["preview", "high"]).map((_, index) => ({
    level: index,
    triangle_count: 50000 * (index + 1),
    tile_size: index === 0 ? 256 : 512,
    description: index === 0 ? "Preview geometry" : "Refined photogrammetry mesh",
  }))

  const boundsSource = property.dollhouseModel?.boundingBox
  const bounds: [number, number, number, number, number, number] = [
    0,
    0,
    0,
    boundsSource?.width ?? 12,
    boundsSource?.height ?? 6,
    boundsSource?.depth ?? 8,
  ]

  const meshTiles = [
    {
      tile_id: `${spaceId}-lod0`,
      url: toCdnUrl(spaceId, property.dollhouseModel?.meshUrl) ??
        `${getViewerCdnOrigin()}/spaces/${spaceId}/dollhouse.glb`,
      lod: 0,
      bounds,
    },
  ]

  return {
    lod_levels: lodLevels,
    mesh_tiles: meshTiles,
  }
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const deriveNavigation = (spaceId: string, property: Property): ViewerManifestNavigation => {
  const sceneCount = property.scenes.length || 1
  const radius = Math.max(property.dollhouseModel?.boundingBox.width ?? 12, 8) / 3

  const camera_nodes = property.scenes.map((scene, index) => {
    const angleDegrees = (360 / sceneCount) * index
    const angle = toRadians(angleDegrees)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    return {
      id: scene.id,
      position: [Number(x.toFixed(2)), 1.6, Number(z.toFixed(2))],
      rotation: [0, Number(angle.toFixed(3)), 0],
      fov: 75,
      thumbnail: toCdnUrl(spaceId, scene.thumbnail ?? scene.imageUrl) ?? scene.thumbnail ?? scene.imageUrl,
    }
  })

  const connections = property.scenes.flatMap((scene) =>
    (scene.hotspots ?? [])
      .filter((hotspot) => hotspot.targetSceneId)
      .map((hotspot) => ({
        from: scene.id,
        to: hotspot.targetSceneId as string,
        transition_type: "WALK" as const,
        distance: 3,
      })),
  )

  return {
    camera_nodes,
    connections,
  }
}

const deriveViews = (spaceId: string, property: Property, floorPlan?: FloorPlan | null): ViewerManifestViews => {
  const defaultNode = property.scenes[0]?.id
  const dollhouseModel = property.dollhouseModel
  const floors = dollhouseModel?.floors?.length ?? 0

  const walkthrough = {
    default_node: defaultNode,
    pathfinding_enabled: (property.scenes[0]?.hotspots ?? []).some((hotspot) => Boolean(hotspot.targetSceneId)),
  }

  const dollhouse = {
    model_url: toCdnUrl(spaceId, dollhouseModel?.meshUrl) ?? `${getViewerCdnOrigin()}/spaces/${spaceId}/dollhouse.glb`,
    scale_factor: 1,
    supports_floor_toggle: floors > 1,
  }

  const room_polygons = floorPlan?.rooms?.map((room) => {
    const x2 = room.x + room.width
    const y2 = room.y + room.height
    return {
      room_id: room.id,
      name: room.name,
      points: [
        [room.x, room.y],
        [x2, room.y],
        [x2, y2],
        [room.x, y2],
      ],
    }
  })

  const floorplan = {
    projection_url: toCdnUrl(spaceId, floorPlan?.imageUrl) ?? `${getViewerCdnOrigin()}/spaces/${spaceId}/floorplan.svg`,
    room_polygons: room_polygons ?? [],
  }

  return {
    walkthrough,
    dollhouse,
    floorplan,
  }
}

const mapHotspotType = (hotspot: Hotspot): ViewerManifestHotspot["type"] => {
  switch (hotspot.type) {
    case "link":
      return "LINK"
    case "video":
      return "VIDEO"
    case "image":
      return "IMAGE"
    case "audio":
      return "AUDIO"
    case "cta":
      return "PRODUCT"
    default:
      return "INFO"
  }
}

const deriveHotspots = (property: Property): ViewerManifestHotspot[] => {
  const company = property.branding.companyName ?? property.owner ?? property.name
  return property.scenes.flatMap((scene) =>
    (scene.hotspots ?? []).map((hotspot) => ({
      id: hotspot.id,
      type: mapHotspotType(hotspot),
      title: hotspot.title,
      content: hotspot.description || hotspot.actionUrl || hotspot.mediaUrl,
      position: [Number(hotspot.x ?? 0), Number(hotspot.y ?? 0), 0],
      media_url: hotspot.mediaUrl,
      visible_in_views: ["walkthrough"],
      author: company,
      created_at: property.updatedAt.toISOString(),
    })),
  )
}

const toMeters = (value: number, unit: Measurement["unit"]) => {
  switch (unit) {
    case "ft":
      return value * 0.3048
    case "in":
      return value * 0.0254
    default:
      return value
  }
}

const deriveMeasurements = (property: Property): ViewerManifestMeasurement[] => {
  const measurements: ViewerManifestMeasurement[] = []
  for (const scene of property.scenes) {
    for (const measurement of scene.measurements ?? []) {
      measurements.push({
        id: measurement.id,
        point_a: [measurement.startX, measurement.startY, 0],
        point_b: [measurement.endX, measurement.endY, 0],
        distance_meters: Number(toMeters(measurement.distance, measurement.unit).toFixed(3)),
        created_by: property.branding.companyName,
      })
    }
  }
  return measurements
}

const deriveTextures = (spaceId: string, property: Property) => {
  const uniqueImages = Array.from(new Set(property.images ?? [])).slice(0, 4)
  if (uniqueImages.length === 0) {
    uniqueImages.push(`${getViewerCdnOrigin()}/spaces/${spaceId}/textures/base_diffuse.ktx2`)
  }

  return uniqueImages.map((image, index) => ({
    lod: index,
    url: toCdnUrl(spaceId, image) ?? image,
    resolution: index === 0 ? "4096x4096" : "2048x2048",
    format: image.endsWith(".png") ? "png" : image.endsWith(".ktx2") ? "ktx2" : "jpg",
  }))
}

const deriveAnalytics = (property: Property) => ({
  views_count: property.stats.totalVisits,
  average_dwell_time: property.stats.avgDuration,
  click_heatmap_url: `${getViewerCdnOrigin()}/spaces/${property.id}/analytics/heatmap.png`,
})

const deriveAccess = (spaceId: string): ViewerManifestAccess => {
  const token = randomBytes(24).toString("base64url")
  const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  return {
    token: `${spaceId}.${token}`,
    permissions: ["view", "measure"],
    expiry: expiry.toISOString(),
  }
}

const normalizeSpaceId = (spaceId: string) => spaceId.replace(/\s+/g, "_")

const getManifestPath = (spaceId: string) =>
  path.join(CDN_DIRECTORY, normalizeSpaceId(spaceId), "manifest.json")

export interface ViewerManifestGenerationInput {
  property: Property
  floorPlan?: FloorPlan | null
}

export const generateViewerManifest = ({
  property,
  floorPlan,
}: ViewerManifestGenerationInput): ViewerManifest => {
  const spaceId = normalizeSpaceId(property.id)
  const manifest: ViewerManifest = {
    space_id: spaceId,
    version: VIEWER_MANIFEST_VERSION,
    owner: property.branding.companyName ?? property.name,
    created_at: toIsoString(property.createdAt),
    geometry: deriveGeometry(spaceId, property),
    textures: deriveTextures(spaceId, property),
    navigation: deriveNavigation(spaceId, property),
    views: deriveViews(spaceId, property, floorPlan ?? undefined),
    hotspots: deriveHotspots(property),
    measurements: deriveMeasurements(property),
    analytics: deriveAnalytics(property),
    access: deriveAccess(spaceId),
  }

  return manifest
}

export const writeViewerManifest = async (manifest: ViewerManifest) => {
  const filePath = getManifestPath(manifest.space_id)
  await writeJson(filePath, manifest)
}

export const generateViewerManifestArtifact = async (
  input: ViewerManifestGenerationInput,
): Promise<ViewerManifest> => {
  const manifest = generateViewerManifest(input)
  await writeViewerManifest(manifest)
  return manifest
}

export const removeViewerManifestArtifact = async (spaceId: string) => {
  const filePath = getManifestPath(spaceId)
  try {
    await fs.unlink(filePath)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
  }
}

export const ensureViewerManifestForState = async (
  properties: Property[],
  floorPlans: FloorPlan[],
) => {
  await Promise.all(
    properties.map((property) => {
      const floorPlan = property.floorPlanId
        ? floorPlans.find((item) => item.id === property.floorPlanId)
        : undefined
      return generateViewerManifestArtifact({ property, floorPlan })
    }),
  )
}

export const ensureViewerManifestUrl = (spaceId: string) => buildViewerManifestUrl(spaceId)

void ensureViewerManifestControlPlane()
