import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

import type {
  BookingSlot,
  CaptureService,
  CrossPlatformShare,
  CSSCustomization,
  FloorPlan,
  Hotspot,
  Lead,
  MeasurementUnits,
  Model3DAsset,
  PanoramaTourManifest,
  Property,
  PropertyMerge,
  PropertyPrimaryContact,
  PropertyPrivacy,
  SceneTransition,
  SceneTypeConfig,
  SphrSpace,
  TechnicianProfile,
  Visitor,
} from "@/lib/types"
import { loadPanoramaTourManifest, loadScenePayload, loadTourManifest } from "@/lib/tour-data-loader"
import { normalizeHotspotType } from "@/lib/hotspot-utils"
import { recordAnalyticsEvent } from "@/lib/server/analytics-events"
import { upsertScenePropertyMetadata } from "@/lib/server/panorama-scene-engine"

interface RawStats {
  totalVisits: number
  uniqueVisitors: number
  avgDuration: number
  conversionRate: number
  leadsGenerated: number
  lastUpdated: string
  hotspotEngagement?: Record<string, number>
  scenePopularity?: Record<string, number>
}

interface RawProperty
  extends Omit<Property, "createdAt" | "updatedAt" | "stats" | "guidedTours"> {
  createdAt: string
  updatedAt: string
  stats: RawStats
  guidedTours?: Property["guidedTours"]
}

interface RawLead extends Omit<Lead, "createdAt"> {
  createdAt: string
}

interface RawVisitor extends Omit<Visitor, "visitedAt"> {
  visitedAt: string
}

interface RawCaptureService
  extends Omit<CaptureService, "createdAt" | "scheduledDate"> {
  createdAt: string
  scheduledDate?: string
}

interface RawBookingSlot extends Omit<BookingSlot, "date"> {
  date: string
}

interface RawPropertyMerge extends Omit<PropertyMerge, "createdAt"> {
  createdAt: string
}

interface RawTechnicianProfile extends Omit<TechnicianProfile, "availability"> {
  availability: string[]
}

export interface StoredData {
  properties: RawProperty[]
  leads: RawLead[]
  visitors: RawVisitor[]
  captureServices: RawCaptureService[]
  bookingSlots: RawBookingSlot[]
  propertyMerges: RawPropertyMerge[]
  crossPlatformShares: CrossPlatformShare[]
  floorPlans: FloorPlan[]
  modelAssets: Model3DAsset[]
  sceneTypeConfigs: SceneTypeConfig[]
  technicians: RawTechnicianProfile[]
  brandingSettings: Record<string, CSSCustomization>
}

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIRECTORY, "app-state.json")
const MOCK_FILE = path.join(process.cwd(), "public", "mock-data.json")

let statePromise: Promise<StoredData> | null = null

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readJsonFile = async (filePath: string) => {
  const contents = await fs.readFile(filePath, "utf8")
  return JSON.parse(contents) as StoredData
}

const writeState = async (data: StoredData) => {
  await ensureDirectory()
  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf8")
}

const loadState = async (): Promise<StoredData> => {
  try {
    await ensureDirectory()
    const state = await readJsonFile(STATE_FILE)
    await mergeTourData(state)
    state.properties.forEach(ensurePropertyDefaults)
    return state
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error
    }
    const mock = await readJsonFile(MOCK_FILE)
    await mergeTourData(mock)
    mock.properties.forEach(ensurePropertyDefaults)
    await writeState(mock)
    return mock
  }
}

const getState = async () => {
  if (!statePromise) {
    statePromise = loadState()
  }
  const snapshot = await statePromise
  return snapshot
}

const updateState = async <Result>(updater: (state: StoredData) => Result): Promise<Result> => {
  const state = await getState()
  const result = updater(state)
  await writeState(state)
  return result
}

const isoNow = () => new Date().toISOString()

const defaultBranding = (propertyId: string): CSSCustomization => ({
  propertyId,
  customCSS: "",
  whiteLabel: false,
  removeBranding: false,
})

const ensurePropertyDefaults = (property: RawProperty) => {
  if (!property.timezone) {
    property.timezone = "America/Los_Angeles"
  }
  property.ownerId = property.ownerId || "owner-default"
  property.ownerName = property.ownerName || "Portfolio Admin"
  if (!property.privacy) {
    property.privacy = "private"
  }
  property.defaultLanguage = property.defaultLanguage || "en"
  property.defaultUnits = property.defaultUnits || "imperial"
  property.tags = Array.isArray(property.tags) ? property.tags : []
  if (!property.primaryContact) {
    property.primaryContact = {
      name: property.branding.companyName || "Operations Team",
      email: property.branding.contactEmail || "info@baladshelter.com",
    }
  } else {
    property.primaryContact = {
      name: property.primaryContact.name || property.branding.companyName || "Operations Team",
      email:
        property.primaryContact.email || property.branding.contactEmail || "info@baladshelter.com",
      phone: property.primaryContact.phone,
    }
  }
  property.ownerEmail = property.ownerEmail || property.branding.contactEmail
}

export const getDataSnapshot = async (): Promise<StoredData> => {
  const state = await getState()
  return JSON.parse(JSON.stringify(state)) as StoredData
}

const normalizeSceneHotspot = (hotspot: Hotspot): Hotspot => {
  const metadata = hotspot.metadata ?? {}
  const normalizedType = normalizeHotspotType(hotspot.type)
  return {
    ...hotspot,
    type: normalizedType,
    label: hotspot.label ?? hotspot.title ?? hotspot.description,
    title: hotspot.title ?? hotspot.label ?? hotspot.description ?? hotspot.id,
    metadata,
  }
}

const mergeHotspotRecords = (existing: Hotspot, incoming: Hotspot): Hotspot => ({
  ...existing,
  ...incoming,
  type: normalizeHotspotType(incoming.type ?? existing.type),
  label: incoming.label ?? existing.label,
  title: incoming.title ?? existing.title,
  description: incoming.description ?? existing.description,
  linkUrl: incoming.linkUrl ?? existing.linkUrl,
  actionUrl: incoming.actionUrl ?? existing.actionUrl,
  media: incoming.media ?? existing.media,
  mediaUrl: incoming.mediaUrl ?? existing.mediaUrl,
  targetSceneId: incoming.targetSceneId ?? existing.targetSceneId,
  metadata: { ...existing.metadata, ...incoming.metadata },
})

const ensurePanoramaAssetUrl = (value?: string): string => {
  if (!value) {
    return ""
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  const [pathOnly] = trimmed.split(/[?#]/)
  if (pathOnly && /\.[a-zA-Z0-9]+$/.test(pathOnly)) {
    return trimmed
  }
  return `${trimmed}.jpg`
}

const buildSphrSpaceFromManifest = (manifest: PanoramaTourManifest): SphrSpace => {
  const nodes = manifest.scenes.map((scene) => {
    const manifestHotspots = scene.hotspots?.length
      ? scene.hotspots
      : manifest.navigationGraph[scene.id] ?? []

    return {
      id: scene.id,
      name: scene.name,
      panoramaUrl: ensurePanoramaAssetUrl(scene.imageUrl),
      initialYaw: scene.initialView?.yaw,
      initialPitch: scene.initialView?.pitch,
      hotspots: manifestHotspots.map((hotspot) => ({
        id: hotspot.id,
        title: hotspot.label ?? hotspot.id,
        description:
          hotspot.autoAlignmentYaw !== undefined || hotspot.autoAlignmentPitch !== undefined
            ? "Auto-align navigation"
            : undefined,
        type: "navigation" as const,
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        targetNodeId: hotspot.targetSceneId,
      })),
    }
  })

  const initialScene = manifest.scenes.find((scene) => scene.id === manifest.initialSceneId)

  return {
    nodes,
    initialNodeId: manifest.initialSceneId,
    defaultFov: initialScene?.initialView?.fov ?? 90,
    description: manifest.title,
  }
}

const mergeTourData = async (state: StoredData) => {
  const [manifest, panoramaManifest] = await Promise.all([
    loadTourManifest(),
    loadPanoramaTourManifest(),
  ])

  if (manifest) {
    const sceneCache = new Map<string, { hotspots: Hotspot[]; transitions: SceneTransition[] }>()

    const resolveScenePayload = async (sceneId: string) => {
      if (!sceneCache.has(sceneId)) {
        const payload = await loadScenePayload(sceneId)
        sceneCache.set(sceneId, payload)
      }
      return sceneCache.get(sceneId) ?? { hotspots: [], transitions: [] }
    }

    for (const property of state.properties) {
      if (!Array.isArray(property.scenes)) continue
      for (const scene of property.scenes) {
        const payload = await resolveScenePayload(scene.id)
        if (!payload.hotspots.length && !payload.transitions.length) {
          continue
        }

        const hotspotMap = new Map<string, Hotspot>()
        const existingHotspots = Array.isArray(scene.hotspots) ? scene.hotspots : []
        for (const hotspot of existingHotspots) {
          const normalized = normalizeSceneHotspot(hotspot)
          hotspotMap.set(normalized.id, normalized)
        }

        for (const incoming of payload.hotspots) {
          const normalizedIncoming = normalizeSceneHotspot(incoming)
          const current = hotspotMap.get(normalizedIncoming.id)
          hotspotMap.set(
            normalizedIncoming.id,
            current ? mergeHotspotRecords(current, normalizedIncoming) : normalizedIncoming,
          )
        }

        scene.hotspots = Array.from(hotspotMap.values())
        if (payload.transitions.length) {
          scene.transitions = payload.transitions.map((transition) => ({ ...transition }))
        }
      }
    }
  }

  if (panoramaManifest) {
    const importedSpace = buildSphrSpaceFromManifest(panoramaManifest)
    if (importedSpace.nodes.length) {
      for (const property of state.properties) {
        if (property.sphrSpace?.nodes?.length) {
          continue
        }
        property.sphrSpace = JSON.parse(JSON.stringify(importedSpace)) as SphrSpace
        break
      }
    }
  }
}

export interface CreatePropertyInput {
  name: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  description?: string
  thumbnail?: string
  timezone: string
  ownerId: string
  ownerName: string
  ownerEmail?: string
  privacy: PropertyPrivacy
  defaultLanguage: string
  defaultUnits: MeasurementUnits
  primaryContact: PropertyPrimaryContact
  tags?: string[]
}

const createBaseStats = (): RawStats => ({
  totalVisits: 0,
  uniqueVisitors: 0,
  avgDuration: 0,
  conversionRate: 0,
  leadsGenerated: 0,
  lastUpdated: isoNow(),
})

export const createProperty = async (input: CreatePropertyInput): Promise<RawProperty> => {
  const id = `prop-${randomUUID()}`
  const now = isoNow()
  const normalizedTags = input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? []
  const property: RawProperty = {
    id,
    name: input.name,
    address: input.address,
    price: input.price,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    sqft: input.sqft,
    description:
      input.description ||
      "Newly added property awaiting full media package and tour configuration.",
    images: [],
    thumbnail: input.thumbnail || "/placeholder.jpg",
    createdAt: now,
    updatedAt: now,
    timezone: input.timezone,
    primaryContact: input.primaryContact,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    privacy: input.privacy,
    defaultLanguage: input.defaultLanguage,
    defaultUnits: input.defaultUnits,
    branding: {
      primaryColor: "#1f2937",
      secondaryColor: "#f97316",
      logo: "/placeholder-logo.svg",
      companyName: "BaladShelter",
      contactEmail: "info@baladshelter.com",
      contactPhone: "+1 (555) 010-0000",
    },
    scenes: [],
    stats: createBaseStats(),
    floorPlanId: undefined,
    dayNightImages: undefined,
    isFavorite: false,
    tags: normalizedTags,
    sceneTransition: "fade",
    supportedViewModes: ["walkthrough", "360"],
    matterportModelId: undefined,
    matterportExperienceLabel: undefined,
    guidedTours: [],
    sphrSpace: undefined,
    zones: [],
    campusMap: undefined,
  }

  ensurePropertyDefaults(property)

  await updateState((state) => {
    state.properties.push(property)
    if (!state.brandingSettings[id]) {
      state.brandingSettings[id] = defaultBranding(id)
    }
  })

  await upsertScenePropertyMetadata({
    id: property.id,
    title: property.name,
    address: property.address,
    ownerId: property.ownerId,
    ownerName: property.ownerName,
    ownerEmail: property.ownerEmail,
    privacy: property.privacy,
    defaultLanguage: property.defaultLanguage,
    defaultUnits: property.defaultUnits,
    timezone: property.timezone,
    tags: property.tags,
    primaryContact: property.primaryContact,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
  })

  await recordAnalyticsEvent("property_created", {
    property_id: property.id,
    owner_id: property.ownerId,
    privacy: property.privacy,
    default_units: property.defaultUnits,
  })

  return property
}

export const updateProperty = async (
  id: string,
  updates: Partial<Omit<RawProperty, "id" | "createdAt" | "stats" | "scenes">> & {
    stats?: Partial<RawStats>
  },
): Promise<RawProperty | null> => {
  let updated: RawProperty | null = null
  await updateState((state) => {
    const property = state.properties.find((item) => item.id === id)
    if (!property) {
      return
    }
    if (updates.tags) {
      property.tags = updates.tags.filter((tag): tag is string => Boolean(tag))
    }
    Object.assign(property, updates)
    if (updates.stats) {
      property.stats = { ...property.stats, ...updates.stats }
    }
    property.updatedAt = isoNow()
    ensurePropertyDefaults(property)
    updated = property
  })
  if (updated) {
    await upsertScenePropertyMetadata({
      id: updated.id,
      title: updated.name,
      address: updated.address,
      ownerId: updated.ownerId,
      ownerName: updated.ownerName,
      ownerEmail: updated.ownerEmail,
      privacy: updated.privacy,
      defaultLanguage: updated.defaultLanguage,
      defaultUnits: updated.defaultUnits,
      timezone: updated.timezone,
      tags: updated.tags,
      primaryContact: updated.primaryContact,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
    await recordAnalyticsEvent("property_updated", {
      property_id: updated.id,
      privacy: updated.privacy,
      default_units: updated.defaultUnits,
    })
  }
  return updated
}

export const deleteProperty = async (id: string): Promise<boolean> => {
  let deleted = false
  await updateState((state) => {
    const initialLength = state.properties.length
    state.properties = state.properties.filter((item) => item.id !== id)
    deleted = state.properties.length !== initialLength
    if (deleted) {
      state.brandingSettings = Object.fromEntries(
        Object.entries(state.brandingSettings).filter(([key]) => key !== id),
      )
      state.crossPlatformShares = state.crossPlatformShares.filter(
        (share) => share.propertyId !== id,
      )
      state.modelAssets = state.modelAssets.filter((asset) => asset.propertyId !== id)
      state.sceneTypeConfigs = state.sceneTypeConfigs.filter(
        (config) => config.propertyId !== id,
      )
    }
  })
  if (deleted) {
    await recordAnalyticsEvent("property_deleted", { property_id: id })
  }
  return deleted
}

export const createLead = async (lead: Lead): Promise<RawLead> => {
  const record: RawLead = { ...lead, createdAt: lead.createdAt.toISOString() }
  await updateState((state) => {
    state.leads.push(record)
  })
  return record
}

export const patchLead = async (
  id: string,
  updates: Partial<Lead>,
): Promise<RawLead | null> => {
  let updated: RawLead | null = null
  await updateState((state) => {
    const lead = state.leads.find((item) => item.id === id)
    if (!lead) {
      return
    }
    Object.assign(lead, updates)
    if (updates.createdAt instanceof Date) {
      lead.createdAt = updates.createdAt.toISOString()
    }
    updated = lead
  })
  return updated
}

export const recordVisitor = async (visitor: Visitor): Promise<RawVisitor> => {
  const stored: RawVisitor = {
    ...visitor,
    visitedAt: visitor.visitedAt.toISOString(),
  }
  await updateState((state) => {
    state.visitors.push(stored)
  })
  return stored
}

export const patchCaptureService = async (
  id: string,
  updates: Partial<CaptureService>,
): Promise<RawCaptureService | null> => {
  let updated: RawCaptureService | null = null
  await updateState((state) => {
    const service = state.captureServices.find((item) => item.id === id)
    if (!service) {
      return
    }
    Object.assign(service, updates)
    if (updates.createdAt instanceof Date) {
      service.createdAt = updates.createdAt.toISOString()
    }
    if (updates.scheduledDate instanceof Date) {
      service.scheduledDate = updates.scheduledDate.toISOString()
    }
    updated = service
  })
  return updated
}

export const addCaptureService = async (
  service: CaptureService,
): Promise<RawCaptureService> => {
  const stored: RawCaptureService = {
    ...service,
    createdAt: service.createdAt.toISOString(),
    scheduledDate: service.scheduledDate?.toISOString(),
  }
  await updateState((state) => {
    state.captureServices.push(stored)
  })
  return stored
}

export const assignTechnicianToService = async (
  serviceId: string,
  technicianId: string,
): Promise<RawCaptureService | null> =>
  patchCaptureService(serviceId, {
    assignedTechnicianId: technicianId,
    status: "scheduled",
  })

export const bookSlot = async (
  slotId: string,
  booking: { name: string; email: string; phone?: string },
): Promise<{ slot: RawBookingSlot | null; lead?: RawLead }> => {
  let storedLead: RawLead | undefined
  let updatedSlot: RawBookingSlot | null = null
  await updateState((state) => {
    const slot = state.bookingSlots.find((item) => item.id === slotId)
    if (!slot) {
      return
    }
    slot.available = false
    slot.bookedBy = booking.name
    updatedSlot = slot

    const propertyId = slot.propertyId
    const lead: RawLead = {
      id: `lead-${randomUUID()}`,
      propertyId,
      name: booking.name,
      email: booking.email,
      phone: booking.phone ?? "",
      message: "Scheduled a property viewing via booking system.",
      visitDuration: 0,
      scenesViewed: 0,
      createdAt: isoNow(),
      status: "contacted",
      notes: "Auto-generated from booking",
      source: "booking",
    }
    state.leads.push(lead)
    storedLead = lead
  })

  return { slot: updatedSlot, lead: storedLead }
}

export const addPropertyMerge = async (merge: PropertyMerge): Promise<RawPropertyMerge> => {
  const record: RawPropertyMerge = {
    ...merge,
    createdAt: merge.createdAt.toISOString(),
  }
  await updateState((state) => {
    state.propertyMerges.push(record)
  })
  return record
}

export const removePropertyMerge = async (mergeId: string): Promise<boolean> => {
  let deleted = false
  await updateState((state) => {
    const count = state.propertyMerges.length
    state.propertyMerges = state.propertyMerges.filter((merge) => merge.id !== mergeId)
    deleted = state.propertyMerges.length !== count
  })
  return deleted
}

export const upsertShare = async (share: CrossPlatformShare): Promise<CrossPlatformShare> => {
  await updateState((state) => {
    const existingIndex = state.crossPlatformShares.findIndex(
      (item) => item.propertyId === share.propertyId,
    )
    if (existingIndex >= 0) {
      state.crossPlatformShares[existingIndex] = {
        ...state.crossPlatformShares[existingIndex],
        ...share,
      }
    } else {
      state.crossPlatformShares.push(share)
    }
  })
  return share
}

export const addModel = async (model: Model3DAsset): Promise<Model3DAsset> => {
  await updateState((state) => {
    state.modelAssets.push(model)
  })
  return model
}

export const deleteModel = async (modelId: string): Promise<boolean> => {
  let deleted = false
  await updateState((state) => {
    const count = state.modelAssets.length
    state.modelAssets = state.modelAssets.filter((model) => model.id !== modelId)
    deleted = state.modelAssets.length !== count
  })
  return deleted
}

export const addSceneType = async (config: SceneTypeConfig): Promise<SceneTypeConfig> => {
  await updateState((state) => {
    state.sceneTypeConfigs.push(config)
  })
  return config
}

export const deleteSceneType = async (configId: string): Promise<boolean> => {
  let deleted = false
  await updateState((state) => {
    const count = state.sceneTypeConfigs.length
    state.sceneTypeConfigs = state.sceneTypeConfigs.filter((config) => config.id !== configId)
    deleted = state.sceneTypeConfigs.length !== count
  })
  return deleted
}

export const updateBrandingSettings = async (
  propertyId: string,
  branding: CSSCustomization,
): Promise<CSSCustomization> => {
  await updateState((state) => {
    state.brandingSettings[propertyId] = branding
  })
  return branding
}
