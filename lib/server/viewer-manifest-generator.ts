import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { getDataSnapshot, type StoredData } from "@/lib/server/data-store"
import type { ViewerManifest, ViewerManifestHotspotType } from "@/lib/types"

const MANIFEST_VERSION = "v1.0.0"
const CDN_ROOT = path.join(process.cwd(), "public", "cdn", "spaces")

const ensureDirectory = async (directory: string) => {
  await fs.mkdir(directory, { recursive: true })
}

const sanitizeSpaceId = (spaceId: string) => spaceId.replace(/[^a-zA-Z0-9-_]/g, "_")

const resolveOwner = (property: StoredData["properties"][number]) => {
  if (property.branding?.companyName) {
    return property.branding.companyName
  }
  if (property.branding?.contactEmail) {
    return property.branding.contactEmail
  }
  return property.owner ?? property.id
}

const ensureAbsoluteUrl = (url: string | undefined, spaceId: string) => {
  if (!url) {
    return `https://cdn.virtualtour.ai/spaces/${spaceId}/assets/missing`
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("//")) {
    return `https:${url}`
  }
  if (url.startsWith("/")) {
    return `https://cdn.virtualtour.ai${url}`
  }
  return url
}

const deriveTextureFormat = (url: string | undefined): ViewerManifest["textures"][number]["format"] => {
  if (!url) return "jpg"
  const extension = url.split("?")[0]?.split("#")[0]?.split(".").pop()?.toLowerCase()
  if (!extension) return "jpg"
  if (extension === "jpg" || extension === "jpeg") return "jpg"
  if (extension === "png") return "png"
  if (extension === "ktx2") return "ktx2"
  if (extension === "basis" || extension === "basisu") return "basisu"
  return "jpg"
}

const deriveTextureResolution = (url: string | undefined) => {
  if (!url) return "4096x4096"
  const match = url.match(/([0-9]{3,4})x([0-9]{3,4})/i)
  if (match) {
    return `${match[1]}x${match[2]}`
  }
  const widthMatch = url.match(/w=([0-9]{3,4})/i)
  if (widthMatch) {
    const width = widthMatch[1]
    return `${width}x${width}`
  }
  return "4096x4096"
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const buildGeometry = (property: StoredData["properties"][number]) => {
  const lodLevels: ViewerManifest["geometry"]["lod_levels"] = []
  const meshTiles: ViewerManifest["geometry"]["mesh_tiles"] = []

  const dollhouse = property.dollhouseModel
  if (dollhouse?.lodLevels && dollhouse.lodLevels.length > 0) {
    dollhouse.lodLevels.forEach((label, index) => {
      lodLevels.push({
        level: index,
        triangle_count: 50000 * Math.max(1, index + 1),
        tile_size: index === 0 ? 256 : 512,
        description: `${label} geometry`
      })
    })
  } else {
    lodLevels.push({
      level: 0,
      triangle_count: 75000,
      tile_size: 256,
      description: "Default reconstruction geometry"
    })
  }

  if (dollhouse?.meshUrl) {
    const bounds = dollhouse.boundingBox
    const width = bounds?.width ?? 10
    const depth = bounds?.depth ?? 10
    const height = bounds?.height ?? 3
    meshTiles.push({
      tile_id: `${property.id}_dollhouse_0`,
      url: ensureAbsoluteUrl(dollhouse.meshUrl, property.id),
      lod: 0,
      bounds: [0, 0, 0, width, height, depth]
    })
  } else {
    meshTiles.push({
      tile_id: `${property.id}_mesh_0`,
      url: `https://cdn.virtualtour.ai/spaces/${property.id}/mesh/mesh_0.glb`,
      lod: 0,
      bounds: [0, 0, 0, 10, 3, 10]
    })
  }

  return { lod_levels: lodLevels, mesh_tiles: meshTiles }
}

const buildTextures = (
  property: StoredData["properties"][number],
  state: StoredData
): ViewerManifest["textures"] => {
  const textures: ViewerManifest["textures"] = []
  const relatedSceneTypes = state.sceneTypeConfigs?.filter((config) => config.propertyId === property.id) ?? []
  const sources = relatedSceneTypes.length > 0 ? relatedSceneTypes.map((config) => config.imageUrl) : property.images ?? []

  sources.slice(0, 4).forEach((source, index) => {
    textures.push({
      lod: index,
      url: ensureAbsoluteUrl(source, property.id),
      resolution: deriveTextureResolution(source),
      format: deriveTextureFormat(source)
    })
  })

  if (textures.length === 0) {
    textures.push({
      lod: 0,
      url: `https://cdn.virtualtour.ai/spaces/${property.id}/textures/base_diffuse.jpg`,
      resolution: "2048x2048",
      format: "jpg"
    })
  }

  return textures
}

const buildNavigation = (
  property: StoredData["properties"][number]
): ViewerManifest["navigation"] => {
  const cameraNodes: ViewerManifest["navigation"]["camera_nodes"] = []
  const connections: ViewerManifest["navigation"]["connections"] = []

  const scenes = property.scenes ?? []
  scenes.forEach((scene, index) => {
    const yaw = toRadians((index / Math.max(1, scenes.length)) * 360)
    cameraNodes.push({
      id: scene.id ?? `scene_${index}`,
      position: [index * 2.5, 1.6, 0],
      rotation: [0, yaw, 0],
      fov: 75,
      thumbnail: ensureAbsoluteUrl(scene.thumbnail ?? scene.imageUrl, property.id)
    })

    scene.hotspots?.forEach((hotspot) => {
      if (typeof hotspot !== "object" || hotspot === null) return
      if ((hotspot.type ?? "").toString().toLowerCase() !== "link") return
      const target = (hotspot as Record<string, unknown>)["targetSceneId"]
      if (typeof target !== "string") return
      connections.push({
        from: scene.id ?? `scene_${index}`,
        to: target,
        transition_type: "WALK",
        distance: 3.0
      })
    })
  })

  if (cameraNodes.length === 0) {
    cameraNodes.push({
      id: `${property.id}_origin`,
      position: [0, 1.6, 0],
      rotation: [0, 0, 0],
      fov: 75,
      thumbnail: ensureAbsoluteUrl(property.thumbnail ?? property.images?.[0], property.id)
    })
  }

  return { camera_nodes: cameraNodes, connections }
}

const buildViews = (
  property: StoredData["properties"][number],
  navigation: ViewerManifest["navigation"],
  state: StoredData
): ViewerManifest["views"] => {
  const defaultNode = navigation.camera_nodes[0]?.id ?? `${property.id}_origin`
  const dollhouse = property.dollhouseModel
  const floorPlan = state.floorPlans?.find((plan) => plan.id === property.floorPlanId)

  return {
    walkthrough: {
      default_node: defaultNode,
      pathfinding_enabled: navigation.connections.length > 0
    },
    dollhouse: {
      model_url: ensureAbsoluteUrl(dollhouse?.meshUrl, property.id),
      scale_factor: typeof dollhouse?.floorGap === "number" ? Math.max(0.1, dollhouse.floorGap / 5) : 1,
      supports_floor_toggle: Boolean(dollhouse?.floors && dollhouse.floors.length > 1)
    },
    floorplan: {
      projection_url: ensureAbsoluteUrl(floorPlan?.imageUrl, property.id),
      room_polygons:
        floorPlan?.rooms?.map((room) => ({
          room_id: room.id,
          name: room.name,
          points: [
            [room.x, room.y],
            [room.x + room.width, room.y],
            [room.x + room.width, room.y + room.height],
            [room.x, room.y + room.height]
          ]
        })) ?? []
    }
  }
}

const normalizeHotspotType = (type: unknown): ViewerManifestHotspotType => {
  const value = typeof type === "string" ? type.toUpperCase() : "INFO"
  if (value === "INFO" || value === "LINK" || value === "VIDEO" || value === "IMAGE" || value === "AUDIO" || value === "PRODUCT") {
    return value
  }
  return "INFO"
}

const buildHotspots = (
  property: StoredData["properties"][number],
  defaultAuthor: string
): ViewerManifest["hotspots"] => {
  const hotspots: ViewerManifest["hotspots"] = []
  const updatedAt = property.updatedAt ?? new Date().toISOString()
  const scenes = property.scenes ?? []

  scenes.forEach((scene) => {
    scene.hotspots?.forEach((rawHotspot) => {
      if (typeof rawHotspot !== "object" || rawHotspot === null) return
      const hotspot = rawHotspot as Record<string, unknown>
      hotspots.push({
        id: typeof hotspot["id"] === "string" ? hotspot["id"] : `${scene.id}_${hotspots.length}`,
        type: normalizeHotspotType(hotspot["type"]),
        title: (hotspot["title"] as string) ?? "",
        content: (hotspot["description"] as string) ?? (hotspot["title"] as string) ?? "",
        position: [
          Number(hotspot["x"] ?? 0) / 10,
          Number(hotspot["y"] ?? 0) / 10,
          Number(hotspot["z"] ?? 0)
        ],
        media_url: hotspot["mediaUrl"] ? ensureAbsoluteUrl(hotspot["mediaUrl"] as string, property.id) : undefined,
        visible_in_views: ["walkthrough"],
        author: defaultAuthor,
        created_at: updatedAt
      })
    })
  })

  return hotspots
}

const unitToMeters = (unit: string | undefined) => {
  switch ((unit ?? "").toLowerCase()) {
    case "ft":
    case "feet":
      return 0.3048
    case "in":
    case "inch":
    case "inches":
      return 0.0254
    case "m":
    case "meter":
    case "meters":
      return 1
    default:
      return 1
  }
}

const buildMeasurements = (
  property: StoredData["properties"][number],
  author: string
): ViewerManifest["measurements"] => {
  const measurements: ViewerManifest["measurements"] = []
  const scenes = property.scenes ?? []

  scenes.forEach((scene) => {
    scene.measurements?.forEach((measurement) => {
      if (typeof measurement !== "object" || measurement === null) return
      const unitScale = unitToMeters((measurement as Record<string, unknown>)["unit"] as string | undefined)
      const distance = Number((measurement as Record<string, unknown>)["distance"] ?? 0) * unitScale
      measurements.push({
        id: (measurement as Record<string, unknown>)["id"] as string,
        point_a: [
          Number((measurement as Record<string, unknown>)["startX"] ?? 0) / 10,
          0,
          Number((measurement as Record<string, unknown>)["startY"] ?? 0) / 10
        ],
        point_b: [
          Number((measurement as Record<string, unknown>)["endX"] ?? 0) / 10,
          0,
          Number((measurement as Record<string, unknown>)["endY"] ?? 0) / 10
        ],
        distance_meters: Number.isFinite(distance) ? Number(distance.toFixed(2)) : 0,
        created_by: author
      })
    })
  })

  return measurements
}

const buildAnalytics = (property: StoredData["properties"][number]): ViewerManifest["analytics"] => {
  const stats = property.stats
  if (!stats) {
    return {
      views_count: 0,
      average_dwell_time: 0,
      click_heatmap_url: ""
    }
  }

  return {
    views_count: stats.totalVisits ?? 0,
    average_dwell_time: stats.avgDuration ?? 0,
    click_heatmap_url: `https://analytics.virtualtour.ai/heatmaps/${property.id}`
  }
}

const buildAccess = (property: StoredData["properties"][number], owner: string): ViewerManifest["access"] => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const tokenSeed = `${property.id}:${property.updatedAt ?? property.createdAt ?? new Date().toISOString()}:${owner}`
  const token = createHash("sha256").update(tokenSeed).digest("base64url")

  const permissions: ViewerManifest["access"]["permissions"] = ["view"]
  if ((property.scenes ?? []).some((scene) => Array.isArray(scene.measurements) && scene.measurements.length > 0)) {
    permissions.push("measure")
  }

  return {
    token,
    permissions,
    expiry: expiresAt.toISOString()
  }
}

const buildManifest = (
  property: StoredData["properties"][number],
  state: StoredData
): ViewerManifest => {
  const owner = resolveOwner(property)
  const geometry = buildGeometry(property)
  const navigation = buildNavigation(property)
  const views = buildViews(property, navigation, state)
  const hotspots = buildHotspots(property, owner)
  const measurements = buildMeasurements(property, owner)
  const analytics = buildAnalytics(property)
  const access = buildAccess(property, owner)
  const textures = buildTextures(property, state)

  return {
    space_id: property.id,
    version: MANIFEST_VERSION,
    owner,
    created_at: property.createdAt ?? new Date().toISOString(),
    geometry,
    textures,
    navigation,
    views,
    hotspots,
    measurements,
    analytics,
    access
  }
}

export interface GeneratedManifestResult {
  spaceId: string
  manifest: ViewerManifest
  outputPath: string
}

export const generateManifestForProperty = async (
  property: StoredData["properties"][number],
  state: StoredData
): Promise<GeneratedManifestResult> => {
  const manifest = buildManifest(property, state)
  const sanitizedId = sanitizeSpaceId(property.id)
  const outputDirectory = path.join(CDN_ROOT, sanitizedId)
  await ensureDirectory(outputDirectory)
  const outputPath = path.join(outputDirectory, "manifest.json")
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8")
  return { spaceId: property.id, manifest, outputPath }
}

export const generateManifestForSpace = async (
  spaceId: string
): Promise<GeneratedManifestResult | null> => {
  const state = await getDataSnapshot()
  const property = state.properties.find((item) => item.id === spaceId)
  if (!property) {
    return null
  }
  return generateManifestForProperty(property, state)
}

export const generateViewerManifests = async (): Promise<GeneratedManifestResult[]> => {
  const state = await getDataSnapshot()
  const publishedProperties = state.properties.filter((property) => Array.isArray(property.scenes) && property.scenes.length > 0)

  const results: GeneratedManifestResult[] = []
  for (const property of publishedProperties) {
    const result = await generateManifestForProperty(property, state)
    results.push(result)
  }

  return results
}
