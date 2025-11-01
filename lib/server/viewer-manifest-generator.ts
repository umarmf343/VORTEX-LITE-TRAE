import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { getDataSnapshot, type StoredData } from "@/lib/server/data-store"
import type {
  Hotspot,
  MeasurementAccuracy,
  MeasurementAnnotationMeta,
  MeasurementKind,
  PanoramaSceneHotspot,
  PanoramaTourManifest,
  ShareViewMode,
  ViewerManifest,
  ViewerManifestEmbedParameter,
  ViewerManifestHotspotType,
} from "@/lib/types"
import { getPrimaryMedia, normalizeHotspotType as normalizeInteractiveHotspotType } from "@/lib/hotspot-utils"

const MANIFEST_VERSION = "v1.1.0"
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
  if (property.ownerName) {
    return property.ownerName
  }
  return property.ownerId ?? property.id
}

const ensureAbsoluteUrl = (url: string | undefined, spaceId: string) => {
  if (!url) {
    return `/spaces/${spaceId}/assets/missing.jpg`
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  if (url.startsWith("//")) {
    return `https:${url}`
  }
  return url.startsWith("/") ? url : `/${url}`
}

const PANORAMA_FALLBACK_URL = "/panorama-samples/living-room.jpg"

const ensurePanoramaAssetUrl = (
  source: string | null | undefined,
  property: StoredData["properties"][number],
): string => {
  const fallback =
    source && source.trim().length > 0
      ? source.trim()
      : property.thumbnail || property.images?.[0] || PANORAMA_FALLBACK_URL

  const trimmed = fallback.trim()
  if (!trimmed) {
    return PANORAMA_FALLBACK_URL
  }

  const [pathOnly] = trimmed.split(/[?#]/)
  if (pathOnly && /\.[a-zA-Z0-9]+$/.test(pathOnly)) {
    return trimmed
  }

  return `${trimmed}.jpg`
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

const normalizePanoramaHotspots = (
  sceneId: string,
  hotspots: PanoramaSceneHotspot[] | null | undefined,
) => {
  const normalized: PanoramaSceneHotspot[] = []
  if (!Array.isArray(hotspots)) {
    return normalized
  }

  hotspots.forEach((hotspot, index) => {
    if (!hotspot || typeof hotspot !== "object") {
      return
    }
    const target = hotspot.targetSceneId
    if (!target) {
      return
    }

    const id = hotspot.id && hotspot.id.trim().length > 0 ? hotspot.id : `${sceneId}-hotspot-${index}`
    const yaw = Number.isFinite(hotspot.yaw) ? hotspot.yaw : 0
    const pitch = Number.isFinite(hotspot.pitch) ? hotspot.pitch : 0
    const label = hotspot.label && hotspot.label.trim().length > 0 ? hotspot.label : id

    normalized.push({
      id,
      targetSceneId: target,
      yaw,
      pitch,
      label,
      autoAlignmentYaw: hotspot.autoAlignmentYaw,
      autoAlignmentPitch: hotspot.autoAlignmentPitch,
    })
  })

  return normalized
}

const normalizePanoramaManifest = (
  manifest: PanoramaTourManifest,
  property: StoredData["properties"][number],
): PanoramaTourManifest | null => {
  const cloned = JSON.parse(JSON.stringify(manifest)) as PanoramaTourManifest
  const fallbackCreatedAt = property.createdAt ?? new Date().toISOString()
  const fallbackUpdatedAt = property.updatedAt ?? fallbackCreatedAt

  cloned.id = cloned.id || `${property.id}-panorama`
  cloned.version = cloned.version ?? 2
  cloned.title = cloned.title || property.name || "Panorama Walkthrough"
  cloned.createdAt = cloned.createdAt || fallbackCreatedAt
  cloned.publishedAt = cloned.publishedAt || fallbackUpdatedAt
  cloned.initialSceneId = cloned.initialSceneId || cloned.scenes?.[0]?.id || ""
  cloned.property = cloned.property ?? {
    id: property.id,
    title: property.name,
    address: property.address,
    ownerId: property.ownerId ?? property.id,
    ownerName: property.ownerName ?? resolveOwner(property),
    ownerEmail: property.ownerEmail ?? property.branding?.contactEmail,
    privacy: property.privacy ?? "private",
    defaultLanguage: property.defaultLanguage ?? "en",
    defaultUnits: property.defaultUnits ?? "imperial",
    timezone: property.timezone ?? "America/Los_Angeles",
    tags: property.tags ?? [],
    primaryContact: property.primaryContact,
    createdAt: property.createdAt ?? fallbackCreatedAt,
    updatedAt: property.updatedAt ?? fallbackUpdatedAt,
  }

  if (!Array.isArray(cloned.scenes) || cloned.scenes.length === 0) {
    return null
  }

  const defaultFov = property.sphrSpace?.defaultFov ?? 90
  const navigationGraph: Record<string, PanoramaSceneHotspot[]> = {}
  const manifestHotspots: Array<PanoramaSceneHotspot & { sceneId: string }> = []

  cloned.scenes = cloned.scenes.map((scene, index) => {
    const sceneId = scene.id || `scene-${index}`
    const createdAt = scene.createdAt || cloned.createdAt
    const updatedAt = scene.updatedAt || cloned.publishedAt
    const initialView = scene.initialView ?? { yaw: 0, pitch: 0, fov: defaultFov }
    const imageUrl = ensurePanoramaAssetUrl(scene.imageUrl ?? property.images?.[0], property)
    const thumbnailUrl = ensurePanoramaAssetUrl(scene.thumbnailUrl ?? imageUrl, property)

    const hotspots = normalizePanoramaHotspots(sceneId, scene.hotspots)
    navigationGraph[sceneId] = hotspots
    hotspots.forEach((hotspot) => {
      manifestHotspots.push({ ...hotspot, sceneId })
    })

    return {
      ...scene,
      id: sceneId,
      sceneType: scene.sceneType ?? "interior",
      imageUrl,
      thumbnailUrl,
      createdAt,
      updatedAt,
      initialView: {
        yaw: initialView.yaw ?? 0,
        pitch: initialView.pitch ?? 0,
        fov: initialView.fov ?? defaultFov,
      },
      assets: scene.assets ?? {
        raw: imageUrl,
        preview: thumbnailUrl,
        web: imageUrl,
        print: imageUrl,
      },
      processing: scene.processing ?? {
        status: "READY",
        startedAt: createdAt,
        completedAt: updatedAt,
        accuracyEstimate: "medium",
        warnings: [],
        errors: [],
        depthEnabled: false,
      },
      measurement: scene.measurement ?? { enabled: false },
      hotspots,
    }
  })

  cloned.navigationGraph =
    cloned.navigationGraph && Object.keys(cloned.navigationGraph).length > 0
      ? cloned.navigationGraph
      : navigationGraph
  cloned.hotspots = cloned.hotspots && cloned.hotspots.length > 0 ? cloned.hotspots : manifestHotspots
  cloned.accuracyScores =
    cloned.accuracyScores && Object.keys(cloned.accuracyScores).length > 0
      ? cloned.accuracyScores
      : Object.fromEntries(cloned.scenes.map((scene) => [scene.id, "medium"]))
  cloned.accessControls = cloned.accessControls ?? {
    privacy: property.privacy ?? "private",
    tokens: property.sharing?.tokens?.map((token) => token.id) ?? [],
  }
  cloned.analyticsHooks = cloned.analyticsHooks ?? {
    events: ["scene_enter", "hotspot_click", "tour_complete"],
  }

  if (!cloned.initialSceneId && cloned.scenes.length > 0) {
    cloned.initialSceneId = cloned.scenes[0].id
  }

  if (!cloned.initialSceneId) {
    return null
  }

  return cloned
}

const buildPanoramaManifestFromSpace = (
  property: StoredData["properties"][number],
): PanoramaTourManifest | null => {
  const space = property.sphrSpace
  if (!space?.nodes?.length) {
    return null
  }

  const createdAt = property.createdAt ?? new Date().toISOString()
  const updatedAt = property.updatedAt ?? createdAt
  const defaultFov = space.defaultFov ?? 90

  const scenes = space.nodes.map((node, index) => {
    const sceneId = node.id || `node-${index}`
    const hotspots = (node.hotspots ?? []).filter((hotspot) => hotspot.type === "navigation" && hotspot.targetNodeId)

    const normalizedHotspots: PanoramaSceneHotspot[] = hotspots.map((hotspot, hotspotIndex) => ({
      id: hotspot.id || `${sceneId}-hotspot-${hotspotIndex}`,
      targetSceneId: hotspot.targetNodeId!,
      yaw: hotspot.yaw ?? 0,
      pitch: hotspot.pitch ?? 0,
      label: hotspot.title ?? hotspot.id ?? `Navigate to ${hotspot.targetNodeId}`,
      autoAlignmentYaw: undefined,
      autoAlignmentPitch: undefined,
    }))

    const panoramaUrl = ensurePanoramaAssetUrl(node.panoramaUrl, property)

    return {
      id: sceneId,
      name: node.name || `Node ${index + 1}`,
      imageUrl: panoramaUrl,
      thumbnailUrl: panoramaUrl,
      description: undefined,
      sceneType: "interior" as const,
      initialView: {
        yaw: node.initialYaw ?? 0,
        pitch: node.initialPitch ?? 0,
        fov: defaultFov,
      },
      hotspots: normalizedHotspots,
      createdAt,
      updatedAt,
      assets: {
        raw: panoramaUrl,
        preview: panoramaUrl,
        web: panoramaUrl,
        print: panoramaUrl,
      },
      processing: {
        status: "READY" as const,
        startedAt: createdAt,
        completedAt: updatedAt,
        accuracyEstimate: "medium" as const,
        warnings: [],
        errors: [],
        depthEnabled: false,
      },
      measurement: { enabled: false },
      tags: [],
    }
  })

  const manifest: PanoramaTourManifest = {
    id: `${property.id}-panorama`,
    version: 2,
    title: property.name || "Panorama Walkthrough",
    property: {
      id: property.id,
      title: property.name,
      address: property.address,
      ownerId: property.ownerId ?? property.id,
      ownerName: property.ownerName ?? resolveOwner(property),
      ownerEmail: property.ownerEmail ?? property.branding?.contactEmail,
      privacy: property.privacy ?? "private",
      defaultLanguage: property.defaultLanguage ?? "en",
      defaultUnits: property.defaultUnits ?? "imperial",
      timezone: property.timezone ?? "America/Los_Angeles",
      tags: property.tags ?? [],
      primaryContact: property.primaryContact,
      createdAt,
      updatedAt,
    },
    initialSceneId: space.initialNodeId || scenes[0]?.id || "",
    createdAt,
    publishedAt: updatedAt,
    scenes,
    hotspots: [],
    navigationGraph: {},
    accuracyScores: {},
    accessControls: {
      privacy: property.privacy ?? "private",
      tokens: property.sharing?.tokens?.map((token) => token.id) ?? [],
    },
    analyticsHooks: {
      events: ["scene_enter", "hotspot_click", "tour_complete"],
    },
  }

  return normalizePanoramaManifest(manifest, property)
}

const resolvePanoramaManifest = (
  property: StoredData["properties"][number],
): PanoramaTourManifest | null => {
  if (property.panoramaWalkthrough) {
    const normalized = normalizePanoramaManifest(property.panoramaWalkthrough, property)
    if (normalized) {
      return normalized
    }
  }
  return buildPanoramaManifestFromSpace(property)
}

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
        description: `${label} geometry`,
      })
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
      bounds: [0, 0, 0, width, height, depth],
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
    const fallback = property.thumbnail || property.images?.[0] || "/panorama-samples/living-room.jpg"
    textures.push({
      lod: 0,
      url: ensureAbsoluteUrl(fallback, property.id),
      resolution: deriveTextureResolution(fallback),
      format: deriveTextureFormat(fallback),
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
  const sceneZoneMap = new Map<string, string | undefined>()
  scenes.forEach((scene) => {
    if (scene.id) {
      sceneZoneMap.set(scene.id, scene.zoneId ?? undefined)
    }
  })
  scenes.forEach((scene, index) => {
    const yaw = toRadians((index / Math.max(1, scenes.length)) * 360)
    cameraNodes.push({
      id: scene.id ?? `scene_${index}`,
      position: [index * 2.5, 1.6, 0],
      rotation: [0, yaw, 0],
      fov: 75,
      thumbnail: ensureAbsoluteUrl(scene.thumbnail ?? scene.imageUrl, property.id),
      zone_id: scene.zoneId ?? undefined
    })

    scene.hotspots?.forEach((hotspot) => {
      if (typeof hotspot !== "object" || hotspot === null) return
      if ((hotspot.type ?? "").toString().toLowerCase() !== "link") return
      const target = (hotspot as Record<string, unknown>)["targetSceneId"]
      if (typeof target !== "string") return
      const fromZone = sceneZoneMap.get(scene.id ?? `scene_${index}`)
      const toZone = sceneZoneMap.get(target)
      connections.push({
        from: scene.id ?? `scene_${index}`,
        to: target,
        transition_type: "WALK",
        distance: 3.0,
        zone_transition: Boolean(fromZone && toZone && fromZone !== toZone)
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
      pathfinding_enabled: navigation.connections.length > 0,
      panorama_manifest: resolvePanoramaManifest(property)
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

const mapManifestHotspotType = (hotspot: Hotspot): ViewerManifestHotspotType => {
  const normalized = normalizeInteractiveHotspotType(hotspot.type)
  if (normalized === "media_embed") {
    const media = getPrimaryMedia(hotspot)
    if (media?.type === "audio") {
      return "AUDIO"
    }
    if (media?.type === "image") {
      return "IMAGE"
    }
    return "VIDEO"
  }
  if (normalized === "navigation_point") {
    return "NAVIGATION"
  }
  if (normalized === "external_link") {
    return "LINK"
  }
  if (normalized === "custom_action") {
    return "CUSTOM"
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
    scene.hotspots?.forEach((hotspotEntry) => {
      if (typeof hotspotEntry !== "object" || hotspotEntry === null) return
      const hotspot = hotspotEntry as Hotspot
      const primaryMedia = getPrimaryMedia(hotspot)
      hotspots.push({
        id: hotspot.id,
        type: mapManifestHotspotType(hotspot),
        title: hotspot.label ?? hotspot.title ?? "",
        content: hotspot.description ?? hotspot.label ?? hotspot.title ?? "",
        position: [
          Number(hotspot.x ?? 0) / 100,
          Number(hotspot.y ?? 0) / 100,
          Number(hotspot.z ?? 0),
        ],
        media_url: primaryMedia?.url ? ensureAbsoluteUrl(primaryMedia.url, property.id) : undefined,
        visible_in_views: ["walkthrough"],
        author: defaultAuthor,
        created_at: updatedAt,
      })
    })
  })

  return hotspots
}

const buildZones = (
  property: StoredData["properties"][number]
): ViewerManifest["zones"] | undefined => {
  const zones = property.zones ?? []
  if (!zones.length) {
    return undefined
  }

  const manifestZones: NonNullable<ViewerManifest["zones"]> = zones.map((zone) => ({
    zone_id: zone.zoneId,
    name: zone.name,
    space_ids: zone.spaceIds,
    default_space_id: zone.defaultSpaceId ?? zone.spaceIds[0],
    outdoor: zone.outdoor,
    site_zone_identifier: zone.siteZoneIdentifier,
    campus_map_icon_url: zone.campusMapIconUrl
      ? ensureAbsoluteUrl(zone.campusMapIconUrl, property.id)
      : undefined,
    gps_bounds: zone.gpsBounds
      ? {
          sw: zone.gpsBounds.sw,
          ne: zone.gpsBounds.ne,
          altitude_meters: zone.gpsBounds.altitudeMeters,
        }
      : undefined,
    capture_metadata: zone.captureMetadata
      ? {
          captureDate: zone.captureMetadata.captureDate,
          captureCrew: zone.captureMetadata.captureCrew,
          sunOrientation: zone.captureMetadata.sunOrientation
            ? {
                azimuthDegrees: zone.captureMetadata.sunOrientation.azimuthDegrees,
                elevationDegrees: zone.captureMetadata.sunOrientation.elevationDegrees,
                capturedAt: zone.captureMetadata.sunOrientation.capturedAt,
              }
            : undefined,
          weather: zone.captureMetadata.weather,
          gpsTrackUrl: zone.captureMetadata.gpsTrackUrl,
          measurementToleranceCm: zone.captureMetadata.measurementToleranceCm,
          calibrationMethod: zone.captureMetadata.calibrationMethod,
        }
      : undefined,
  }))

  return manifestZones
}

const buildZoneConnections = (
  property: StoredData["properties"][number]
): ViewerManifest["zone_connections"] | undefined => {
  const zones = property.zones ?? []
  if (!zones.length) {
    return undefined
  }

  const manifestConnections: NonNullable<ViewerManifest["zone_connections"]> = []
  zones.forEach((zone) => {
    zone.connections?.forEach((connection) => {
      manifestConnections.push({
        from_zone_id: zone.zoneId,
        to_zone_id: connection.targetZoneId,
        transition_type: connection.transitionType,
        description: connection.description,
        estimated_seconds: connection.estimatedSeconds,
        distance_meters: connection.distanceMeters,
      })
    })
  })

  return manifestConnections.length ? manifestConnections : undefined
}

const buildCampusMap = (
  property: StoredData["properties"][number]
): ViewerManifest["campus_map"] | undefined => {
  const campusMap = property.campusMap
  if (!campusMap) {
    return undefined
  }

  return {
    image_url: ensureAbsoluteUrl(campusMap.imageUrl, property.id),
    tile_url_template: campusMap.tileUrlTemplate
      ? ensureAbsoluteUrl(campusMap.tileUrlTemplate, property.id)
      : undefined,
    default_zone_id: campusMap.defaultZoneId,
    gps_bounds: campusMap.gpsBounds,
  }
}

const buildPerformanceProfile = (
  property: StoredData["properties"][number]
): ViewerManifest["performance"] => {
  const hasOutdoorZone = (property.zones ?? []).some((zone) => zone.outdoor)
  return {
    lod_target_triangle_budget: hasOutdoorZone ? 350_000 : 180_000,
    max_texture_resolution: hasOutdoorZone ? 8192 : 4096,
    mobile_max_texture_resolution: hasOutdoorZone ? 4096 : 2048,
    streaming_chunk_bytes: hasOutdoorZone ? 4 * 1024 * 1024 : 2 * 1024 * 1024,
  }
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
      const type = ((measurement as Record<string, unknown>)["measurementType"] ?? "distance") as string
      const rawDistance = Number((measurement as Record<string, unknown>)["distance"] ?? 0)
      const areaSquareMeters = Number(
        (measurement as Record<string, unknown>)["areaSquareMeters"] ?? NaN,
      )

      const points3d = Array.isArray((measurement as Record<string, unknown>)["points3d"])
        ? ((measurement as Record<string, unknown>)["points3d"] as Array<Record<string, unknown>>)
        : undefined

      const toManifestPoint = (point: Record<string, unknown> | null | undefined, fallback: number[]): number[] => {
        if (point && typeof point === "object") {
          const x = Number((point as Record<string, unknown>)["x"] ?? NaN)
          const y = Number((point as Record<string, unknown>)["y"] ?? NaN)
          const z = Number((point as Record<string, unknown>)["z"] ?? NaN)
          if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            return [x, y, z]
          }
        }
        return fallback
      }

      const legacyPointA = [
        Number((measurement as Record<string, unknown>)["startX"] ?? 0) / 10,
        0,
        Number((measurement as Record<string, unknown>)["startY"] ?? 0) / 10,
      ]
      const legacyPointB = [
        Number((measurement as Record<string, unknown>)["endX"] ?? 0) / 10,
        0,
        Number((measurement as Record<string, unknown>)["endY"] ?? 0) / 10,
      ]

      const pointA = points3d?.[0]
        ? toManifestPoint(points3d[0], legacyPointA)
        : legacyPointA
      const pointB = points3d && points3d.length > 0
        ? toManifestPoint(points3d[points3d.length - 1], legacyPointB)
        : legacyPointB

      const manifestPoints = points3d
        ?.map((point) => toManifestPoint(point, legacyPointA))
        .filter((point) => point.length === 3)

      const distanceMeters = Number.isFinite(rawDistance)
        ? Number((rawDistance * unitScale).toFixed(3))
        : null
      const accuracyValue = (measurement as Record<string, unknown>)["accuracy"]
      const annotation = (measurement as Record<string, unknown>)["annotation"]
      const accuracy =
        accuracyValue && typeof accuracyValue === "object"
          ? (accuracyValue as MeasurementAccuracy)
          : undefined
      const confidence =
        accuracy && typeof accuracy.confidence === "number" ? accuracy.confidence : undefined
      const createdAt = (measurement as Record<string, unknown>)["createdAt"]
      const redacted = Boolean((measurement as Record<string, unknown>)["redacted"])

      measurements.push({
        id: (measurement as Record<string, unknown>)["id"] as string,
        type: (type as string) as MeasurementKind,
        point_a: pointA,
        point_b: pointB,
        points: manifestPoints,
        distance_meters:
          type === "area" || type === "room" ? null : distanceMeters,
        area_m2: Number.isFinite(areaSquareMeters) ? areaSquareMeters : undefined,
        height_meters:
          type === "height" || type === "volume"
            ? Number(
                (measurement as Record<string, unknown>)["height"] ?? NaN,
              ) * unitScale
            : undefined,
        accuracy,
        redacted: redacted || undefined,
        annotation:
          annotation && typeof annotation === "object"
            ? (annotation as MeasurementAnnotationMeta)
            : undefined,
        confidence: typeof confidence === "number" ? confidence : undefined,
        created_by: author,
        created_at: typeof createdAt === "string" ? createdAt : undefined,
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

const shareViewModes = (
  property: StoredData["properties"][number],
  views: ViewerManifest["views"],
): ShareViewMode[] => {
  const supported = new Set<ShareViewMode>(["walkthrough"])
  if (views.floorplan?.projection_url) {
    supported.add("floorplan")
  }
  if (views.dollhouse?.model_url || (property.supportedViewModes ?? []).includes("dollhouse")) {
    supported.add("dollhouse")
  }
  if ((property.scenes ?? []).some((scene) => Array.isArray(scene.hotspots) && scene.hotspots.length > 0)) {
    supported.add("gallery")
  }
  return Array.from(supported)
}

const normalizeShareMode = (
  requested: ShareViewMode | undefined,
  fallback: ShareViewMode,
  available: ShareViewMode[],
): ShareViewMode => {
  if (requested && available.includes(requested)) {
    return requested
  }
  return fallback
}

const buildShareDetails = (
  property: StoredData["properties"][number],
  access: ViewerManifest["access"],
  navigation: ViewerManifest["navigation"],
  views: ViewerManifest["views"],
): Pick<ViewerManifest, "share_url" | "embed_allowed" | "embed_snippet_template"> => {
  const sharing = property.sharing
  const canonicalHost = sharing?.canonicalHost ?? "https://tour.virtualtour.ai"
  const shareBase = new URL(sharing?.sharePath ?? "/view", canonicalHost)
  const embedBase = new URL(sharing?.embedPath ?? "/embed", canonicalHost)
  const widgetSrc = new URL(sharing?.widgetPath ?? "/embed/widget.js", canonicalHost).toString()

  const availableModes = shareViewModes(property, views)
  const defaultMode = normalizeShareMode(sharing?.defaultMode ?? "walkthrough", "walkthrough", availableModes)
  const defaultToken = sharing?.tokens?.find((entry) => entry.id === sharing?.defaultTokenId) ?? sharing?.tokens?.[0]
  const shareToken = defaultToken?.token ?? access.token

  const manifestStartNode = navigation.camera_nodes[0]?.id
  const propertyStartNode = property.scenes?.[0]?.id
  const defaultStartNode = sharing?.embedDefaults?.startNode ?? manifestStartNode ?? propertyStartNode ?? null

  const shareUrl = new URL(shareBase)
  shareUrl.searchParams.set("space_id", property.id)
  shareUrl.searchParams.set("mode", defaultMode)
  if (shareToken) {
    shareUrl.searchParams.set("token", shareToken)
  }
  if (defaultStartNode) {
    shareUrl.searchParams.set("start", defaultStartNode)
  }
  shareUrl.searchParams.set("utm_source", "share-panel")
  shareUrl.searchParams.set("utm_medium", "link")

  const embedDefaults = sharing?.embedDefaults
  const embedUrl = new URL(embedBase)
  embedUrl.searchParams.set("space_id", property.id)
  embedUrl.searchParams.set(
    "mode",
    normalizeShareMode(embedDefaults?.viewMode ?? defaultMode, defaultMode, availableModes),
  )
  if (shareToken) {
    embedUrl.searchParams.set("token", shareToken)
  }
  if (defaultStartNode) {
    embedUrl.searchParams.set("start", defaultStartNode)
  }
  if (embedDefaults?.autoplay) {
    embedUrl.searchParams.set("autoplay", "1")
  }
  if (embedDefaults && !embedDefaults.branding) {
    embedUrl.searchParams.set("branding", "0")
  }
  if (embedDefaults && !embedDefaults.allowFloorplan) {
    embedUrl.searchParams.set("floorplan", "0")
  }
  if (embedDefaults && !embedDefaults.allowDollhouse) {
    embedUrl.searchParams.set("dollhouse", "0")
  }
  if (embedDefaults && !embedDefaults.allowFullscreen) {
    embedUrl.searchParams.set("fullscreen", "0")
  }
  if (embedDefaults && !embedDefaults.allowUiChrome) {
    embedUrl.searchParams.set("chromeless", "1")
  }
  embedUrl.searchParams.set("utm_source", "share-panel")
  embedUrl.searchParams.set("utm_medium", "embed")

  const aspectRatio = embedDefaults?.aspectRatio ?? "56.25%"

  const iframeSnippet = `<div class="virtualtour-embed" style="position:relative;width:100%;padding-top:${aspectRatio};"><iframe src="${embedUrl.toString()}" title="${property.name ?? property.id} virtual tour" loading="lazy" allow="fullscreen; xr-spatial-tracking" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;"></iframe></div>`

  const responsiveCss = [
    ".virtualtour-embed{position:relative;width:100%;padding-top:%%ASPECT%%;}",
    ".virtualtour-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.25);}",
  ]
    .join("\n")
    .replace("%%ASPECT%%", aspectRatio)

  const javascriptSnippetLines = [
    `<div class="virtualtour-widget" data-space-id="${property.id}" data-token="${shareToken ?? access.token}" data-mode="${embedUrl.searchParams.get("mode") ?? defaultMode}"${
      defaultStartNode ? ` data-start-node="${defaultStartNode}"` : ""
    } data-branding="${embedDefaults?.branding !== false ? "1" : "0"}" data-autoplay="${embedDefaults?.autoplay ? "1" : "0"}" data-floorplan="${embedDefaults?.allowFloorplan === false ? "0" : "1"}" data-dollhouse="${embedDefaults?.allowDollhouse ? "1" : "0"}" data-fullscreen="${embedDefaults?.allowFullscreen === false ? "0" : "1"}" data-chromeless="${embedDefaults?.allowUiChrome === false ? "1" : "0"}"></div>`,
    `<script async src="${widgetSrc}" data-space="${property.id}" data-token="${shareToken ?? access.token}" data-track-host="true"></script>`,
  ]
  const javascriptSnippet = javascriptSnippetLines.join("\n")

  const parameters: ViewerManifestEmbedParameter[] = [
    {
      key: "start",
      type: "string",
      default: defaultStartNode,
      description: "Initial camera node to focus when the tour loads.",
    },
    {
      key: "mode",
      type: "string",
      default: embedUrl.searchParams.get("mode") ?? defaultMode,
      options: availableModes,
      description: "Viewer mode to start in (walkthrough, floorplan, dollhouse, gallery).",
    },
    {
      key: "branding",
      type: "boolean",
      default: embedDefaults?.branding !== false,
      description: "Show platform chrome and branding overlay.",
    },
    {
      key: "autoplay",
      type: "boolean",
      default: !!embedDefaults?.autoplay,
      description: "Start the guided tour automatically when loaded.",
    },
    {
      key: "floorplan",
      type: "boolean",
      default: embedDefaults?.allowFloorplan !== false,
      description: "Enable the floorplan toggle inside the embed UI.",
    },
    {
      key: "dollhouse",
      type: "boolean",
      default: !!embedDefaults?.allowDollhouse,
      description: "Enable dollhouse mode in the embedded viewer.",
    },
    {
      key: "fullscreen",
      type: "boolean",
      default: embedDefaults?.allowFullscreen !== false,
      description: "Allow the fullscreen button inside the embed.",
    },
    {
      key: "chromeless",
      type: "boolean",
      default: embedDefaults?.allowUiChrome === false,
      description: "Hide navigation chrome for kiosk or signage setups.",
    },
  ]

  return {
    share_url: shareUrl.toString(),
    embed_allowed: sharing?.embedAllowed ?? true,
    embed_snippet_template: {
      iframe: iframeSnippet,
      javascript: javascriptSnippet,
      responsive_css: responsiveCss,
      parameters,
    },
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
  const zones = buildZones(property)
  const zoneConnections = buildZoneConnections(property)
  const campusMap = buildCampusMap(property)
  const outdoorFlag = (property.zones ?? []).some((zone) => zone.outdoor)
  const performance = buildPerformanceProfile(property)
  const shareDetails = buildShareDetails(property, access, navigation, views)

  return {
    space_id: property.id,
    version: MANIFEST_VERSION,
    owner,
    created_at: property.createdAt ?? new Date().toISOString(),
    ...shareDetails,
    geometry,
    textures,
    navigation,
    views,
    hotspots,
    measurements,
    analytics,
    access,
    zones,
    zone_connections: zoneConnections,
    campus_map: campusMap,
    outdoor_flag: outdoorFlag,
    performance
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
