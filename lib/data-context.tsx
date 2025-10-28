"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type {
  Property,
  Lead,
  Visitor,
  CaptureService,
  BookingSlot,
  PropertyMerge,
  CrossPlatformShare,
  FloorPlan,
  Model3DAsset,
  SceneTypeConfig,
  TechnicianProfile,
  CSSCustomization,
  PropertyStats,
  GuidedTour,
  PropertyStatsSummary,
} from "./types"

type RawProperty = Omit<Property, "createdAt" | "updatedAt" | "stats"> & {
  createdAt: string
  updatedAt: string
  stats: Omit<PropertyStats, "lastUpdated"> & { lastUpdated: string }
  guidedTours?: GuidedTour[]
}

type RawLead = Omit<Lead, "createdAt"> & { createdAt: string }

type RawVisitor = Omit<Visitor, "visitedAt"> & { visitedAt: string }

type RawCaptureService = Omit<CaptureService, "createdAt" | "scheduledDate"> & {
  createdAt: string
  scheduledDate?: string
}

type RawBookingSlot = Omit<BookingSlot, "date"> & { date: string }

type RawPropertyMerge = Omit<PropertyMerge, "createdAt"> & { createdAt: string }

type RawTechnicianProfile = Omit<TechnicianProfile, "availability"> & { availability: string[] }

interface RawMockData {
  properties?: RawProperty[]
  leads?: RawLead[]
  visitors?: RawVisitor[]
  captureServices?: RawCaptureService[]
  bookingSlots?: RawBookingSlot[]
  propertyMerges?: RawPropertyMerge[]
  crossPlatformShares?: CrossPlatformShare[]
  floorPlans?: FloorPlan[]
  modelAssets?: Model3DAsset[]
  sceneTypeConfigs?: SceneTypeConfig[]
  technicians?: RawTechnicianProfile[]
  brandingSettings?: Record<string, CSSCustomization>
}

const parseProperty = (raw: RawProperty): Property => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt),
  stats: {
    ...raw.stats,
    lastUpdated: new Date(raw.stats.lastUpdated),
  },
})

const parseLead = (raw: RawLead): Lead => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
})

const parseVisitor = (raw: RawVisitor): Visitor => ({
  ...raw,
  visitedAt: new Date(raw.visitedAt),
})

const parseCaptureService = (raw: RawCaptureService): CaptureService => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  scheduledDate: raw.scheduledDate ? new Date(raw.scheduledDate) : undefined,
})

const parseBookingSlot = (raw: RawBookingSlot): BookingSlot => ({
  ...raw,
  date: new Date(raw.date),
})

const parsePropertyMerge = (raw: RawPropertyMerge): PropertyMerge => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
})

const parseTechnician = (raw: RawTechnicianProfile): TechnicianProfile => ({
  ...raw,
  availability: raw.availability.map((value) => new Date(value)),
})

const parseMockData = (raw: RawMockData) => ({
  properties: Array.isArray(raw.properties) ? raw.properties.map(parseProperty) : [],
  leads: Array.isArray(raw.leads) ? raw.leads.map(parseLead) : [],
  visitors: Array.isArray(raw.visitors) ? raw.visitors.map(parseVisitor) : [],
  captureServices: Array.isArray(raw.captureServices)
    ? raw.captureServices.map(parseCaptureService)
    : [],
  bookingSlots: Array.isArray(raw.bookingSlots) ? raw.bookingSlots.map(parseBookingSlot) : [],
  propertyMerges: Array.isArray(raw.propertyMerges)
    ? raw.propertyMerges.map(parsePropertyMerge)
    : [],
  crossPlatformShares: raw.crossPlatformShares ?? [],
  floorPlans: raw.floorPlans ?? [],
  modelAssets: raw.modelAssets ?? [],
  sceneTypeConfigs: raw.sceneTypeConfigs ?? [],
  technicians: Array.isArray(raw.technicians) ? raw.technicians.map(parseTechnician) : [],
  brandingSettings: raw.brandingSettings ?? {},
})

type NewPropertyInput = {
  name: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  description?: string
  thumbnail?: string
}

interface DataContextType {
  properties: Property[]
  leads: Lead[]
  visitors: Visitor[]
  captureServices: CaptureService[]
  bookingSlots: BookingSlot[]
  propertyMerges: PropertyMerge[]
  crossPlatformShares: CrossPlatformShare[]
  floorPlans: FloorPlan[]
  modelAssets: Model3DAsset[]
  sceneTypeConfigs: SceneTypeConfig[]
  technicians: TechnicianProfile[]
  brandingSettings: Record<string, CSSCustomization>
  isLoading: boolean
  addProperty: (input: NewPropertyInput) => Promise<Property>
  updateProperty: (id: string, property: Partial<Property>) => Promise<Property | null>
  deleteProperty: (id: string) => Promise<boolean>
  addLead: (lead: Lead) => Promise<Lead>
  updateLead: (id: string, lead: Partial<Lead>) => Promise<Lead | null>
  addVisitor: (visitor: Visitor) => Promise<Visitor>
  getPropertyStats: (propertyId: string) => PropertyStatsSummary
  updateCaptureService: (id: string, updates: Partial<CaptureService>) => Promise<CaptureService | null>
  assignTechnician: (serviceId: string, technicianId: string) => Promise<CaptureService | null>
  createCaptureService: (service: CaptureService) => Promise<CaptureService>
  bookSlot: (
    slotId: string,
    booking: { name: string; email: string; phone?: string },
  ) => Promise<{ slot: BookingSlot | null; lead?: Lead }>
  createPropertyMerge: (merge: PropertyMerge) => Promise<PropertyMerge>
  deletePropertyMerge: (mergeId: string) => Promise<boolean>
  upsertCrossPlatformShare: (share: CrossPlatformShare) => Promise<CrossPlatformShare>
  addModelAsset: (model: Model3DAsset) => Promise<Model3DAsset>
  removeModelAsset: (modelId: string) => Promise<boolean>
  addSceneTypeConfig: (config: SceneTypeConfig) => Promise<SceneTypeConfig>
  removeSceneTypeConfig: (configId: string) => Promise<boolean>
  updateBranding: (propertyId: string, branding: CSSCustomization) => Promise<CSSCustomization>
  getFloorPlan: (floorPlanId?: string) => FloorPlan | undefined
  getShareForProperty: (propertyId: string) => CrossPlatformShare | undefined
  getModelsForProperty: (propertyId: string) => Model3DAsset[]
  getSceneTypesForProperty: (propertyId: string) => SceneTypeConfig[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [captureServices, setCaptureServices] = useState<CaptureService[]>([])
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([])
  const [propertyMerges, setPropertyMerges] = useState<PropertyMerge[]>([])
  const [crossPlatformShares, setCrossPlatformShares] = useState<CrossPlatformShare[]>([])
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [modelAssets, setModelAssets] = useState<Model3DAsset[]>([])
  const [sceneTypeConfigs, setSceneTypeConfigs] = useState<SceneTypeConfig[]>([])
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([])
  const [brandingSettings, setBrandingSettings] = useState<Record<string, CSSCustomization>>({})
  const [isLoading, setIsLoading] = useState(true)

  const postAction = useCallback(
    async <Result,>(action: string, payload?: unknown): Promise<Result> => {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, payload }),
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errorBody.error || `Failed to execute action ${action}`)
      }

      return (await response.json()) as Result
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const response = await fetch("/api/data", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`)
        }
        const payload = (await response.json()) as { data: RawMockData }
        if (cancelled) {
          return
        }
        const parsed = parseMockData(payload.data ?? {})
        setProperties(parsed.properties)
        setLeads(parsed.leads)
        setVisitors(parsed.visitors)
        setCaptureServices(parsed.captureServices)
        setBookingSlots(parsed.bookingSlots)
        setPropertyMerges(parsed.propertyMerges)
        setCrossPlatformShares(parsed.crossPlatformShares)
        setFloorPlans(parsed.floorPlans)
        setModelAssets(parsed.modelAssets)
        setSceneTypeConfigs(parsed.sceneTypeConfigs)
        setTechnicians(parsed.technicians)
        setBrandingSettings(parsed.brandingSettings)
      } catch (error) {
        console.error("Unable to load dashboard data", error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const addProperty = useCallback(
    async (input: NewPropertyInput) => {
      const { property } = await postAction<{ property: RawProperty }>("createProperty", input)
      const parsed = parseProperty(property)
      setProperties((prev) => [...prev, parsed])
      return parsed
    },
    [postAction],
  )

  const updateProperty = useCallback(
    async (id: string, updates: Partial<Property>) => {
      const payload: Record<string, unknown> = { ...updates }
      if (updates.createdAt instanceof Date) {
        payload.createdAt = updates.createdAt.toISOString()
      }
      if (updates.updatedAt instanceof Date) {
        payload.updatedAt = updates.updatedAt.toISOString()
      }
      if (updates.stats) {
        payload.stats = {
          ...updates.stats,
          lastUpdated: updates.stats.lastUpdated instanceof Date
            ? updates.stats.lastUpdated.toISOString()
            : updates.stats.lastUpdated,
        }
      }
      const response = await postAction<{ property?: RawProperty }>("updateProperty", {
        id,
        updates: payload,
      })
      if (!response.property) {
        return null
      }
      const parsed = parseProperty(response.property)
      setProperties((prev) => prev.map((p) => (p.id === id ? parsed : p)))
      return parsed
    },
    [postAction],
  )

  const deleteProperty = useCallback(
    async (id: string) => {
      await postAction("deleteProperty", { id })
      setProperties((prev) => prev.filter((p) => p.id !== id))
      return true
    },
    [postAction],
  )

  const addLead = useCallback(
    async (lead: Lead) => {
      const payload = {
        ...lead,
        createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
      }
      const { lead: stored } = await postAction<{ lead: RawLead }>("addLead", payload)
      const parsed = parseLead(stored)
      setLeads((prev) => [...prev, parsed])
      return parsed
    },
    [postAction],
  )

  const updateLead = useCallback(
    async (id: string, updates: Partial<Lead>) => {
      const payload = {
        ...updates,
        createdAt: updates.createdAt instanceof Date ? updates.createdAt.toISOString() : updates.createdAt,
      }
      const response = await postAction<{ lead?: RawLead }>("updateLead", { id, updates: payload })
      if (!response.lead) {
        return null
      }
      const parsed = parseLead(response.lead)
      setLeads((prev) => prev.map((leadItem) => (leadItem.id === id ? parsed : leadItem)))
      return parsed
    },
    [postAction],
  )

  const addVisitor = useCallback(
    async (visitor: Visitor) => {
      const payload = {
        ...visitor,
        visitedAt: visitor.visitedAt instanceof Date ? visitor.visitedAt.toISOString() : visitor.visitedAt,
      }
      const { visitor: stored } = await postAction<{ visitor: RawVisitor }>("addVisitor", payload)
      const parsed = parseVisitor(stored)
      setVisitors((prev) => [...prev, parsed])
      return parsed
    },
    [postAction],
  )

  const getPropertyStats = useCallback(
    (propertyId: string) => {
      const propertyVisitors = visitors.filter((v) => v.propertyId === propertyId)
      const propertyLeads = leads.filter((l) => l.propertyId === propertyId)

      return {
        totalVisits: propertyVisitors.length,
        uniqueVisitors: new Set(propertyVisitors.map((v) => v.sessionId)).size,
        avgDuration:
          propertyVisitors.length > 0
            ? propertyVisitors.reduce((sum, v) => sum + v.duration, 0) / propertyVisitors.length
            : 0,
        leadsGenerated: propertyLeads.length,
        conversionRate: propertyVisitors.length > 0 ? (propertyLeads.length / propertyVisitors.length) * 100 : 0,
      }
    },
    [visitors, leads],
  )

  const updateCaptureService = useCallback(
    async (id: string, updates: Partial<CaptureService>) => {
      const payload = {
        ...updates,
        createdAt: updates.createdAt instanceof Date ? updates.createdAt.toISOString() : updates.createdAt,
        scheduledDate:
          updates.scheduledDate instanceof Date
            ? updates.scheduledDate.toISOString()
            : updates.scheduledDate,
      }
      const response = await postAction<{ captureService?: RawCaptureService }>("updateCaptureService", {
        id,
        updates: payload,
      })
      if (!response.captureService) {
        return null
      }
      const parsed = parseCaptureService(response.captureService)
      setCaptureServices((prev) => prev.map((service) => (service.id === id ? parsed : service)))
      return parsed
    },
    [postAction],
  )

  const assignTechnician = useCallback(
    async (serviceId: string, technicianId: string) => {
      const response = await postAction<{ captureService?: RawCaptureService }>("assignTechnician", {
        serviceId,
        technicianId,
      })
      if (!response.captureService) {
        return null
      }
      const parsed = parseCaptureService(response.captureService)
      setCaptureServices((prev) => prev.map((service) => (service.id === serviceId ? parsed : service)))
      return parsed
    },
    [postAction],
  )

  const createCaptureService = useCallback(
    async (service: CaptureService) => {
      const payload = {
        ...service,
        createdAt: service.createdAt instanceof Date ? service.createdAt.toISOString() : service.createdAt,
        scheduledDate:
          service.scheduledDate instanceof Date
            ? service.scheduledDate.toISOString()
            : service.scheduledDate,
      }
      const { captureService } = await postAction<{ captureService: RawCaptureService }>(
        "createCaptureService",
        payload,
      )
      const parsed = parseCaptureService(captureService)
      setCaptureServices((prev) => [...prev, parsed])
      return parsed
    },
    [postAction],
  )

  const bookSlot = useCallback(
    async (slotId: string, booking: { name: string; email: string; phone?: string }) => {
      const { result } = await postAction<{
        result: { slot: RawBookingSlot | null; lead?: RawLead }
      }>("bookSlot", {
        slotId,
        booking,
      })
      if (result.slot) {
        const parsedSlot = parseBookingSlot(result.slot)
        setBookingSlots((prev) => prev.map((slot) => (slot.id === slotId ? parsedSlot : slot)))
      }
      if (result.lead) {
        const parsedLead = parseLead(result.lead)
        setLeads((prev) => [...prev, parsedLead])
      }
      return {
        slot: result.slot ? parseBookingSlot(result.slot) : null,
        lead: result.lead ? parseLead(result.lead) : undefined,
      }
    },
    [postAction],
  )

  const createPropertyMerge = useCallback(
    async (merge: PropertyMerge) => {
      const payload = {
        ...merge,
        createdAt: merge.createdAt instanceof Date ? merge.createdAt.toISOString() : merge.createdAt,
      }
      const { merge: stored } = await postAction<{ merge: RawPropertyMerge }>("createPropertyMerge", payload)
      const parsed = parsePropertyMerge(stored)
      setPropertyMerges((prev) => [...prev, parsed])
      return parsed
    },
    [postAction],
  )

  const deletePropertyMerge = useCallback(
    async (mergeId: string) => {
      await postAction("deletePropertyMerge", { id: mergeId })
      setPropertyMerges((prev) => prev.filter((merge) => merge.id !== mergeId))
      return true
    },
    [postAction],
  )

  const upsertCrossPlatformShare = useCallback(
    async (share: CrossPlatformShare) => {
      const { share: stored } = await postAction<{ share: CrossPlatformShare }>("upsertShare", share)
      setCrossPlatformShares((prev) => {
        const exists = prev.some((item) => item.propertyId === share.propertyId)
        return exists
          ? prev.map((item) => (item.propertyId === share.propertyId ? stored : item))
          : [...prev, stored]
      })
      return stored
    },
    [postAction],
  )

  const addModelAsset = useCallback(
    async (model: Model3DAsset) => {
      const { model: stored } = await postAction<{ model: Model3DAsset }>("addModel", model)
      setModelAssets((prev) => [...prev, stored])
      return stored
    },
    [postAction],
  )

  const removeModelAsset = useCallback(
    async (modelId: string) => {
      await postAction("deleteModel", { id: modelId })
      setModelAssets((prev) => prev.filter((model) => model.id !== modelId))
      return true
    },
    [postAction],
  )

  const addSceneTypeConfig = useCallback(
    async (config: SceneTypeConfig) => {
      const { sceneType } = await postAction<{ sceneType: SceneTypeConfig }>("addSceneType", config)
      setSceneTypeConfigs((prev) => [...prev, sceneType])
      return sceneType
    },
    [postAction],
  )

  const removeSceneTypeConfig = useCallback(
    async (configId: string) => {
      await postAction("deleteSceneType", { id: configId })
      setSceneTypeConfigs((prev) => prev.filter((config) => config.id !== configId))
      return true
    },
    [postAction],
  )

  const updateBranding = useCallback(
    async (propertyId: string, branding: CSSCustomization) => {
      const { branding: stored } = await postAction<{ branding: CSSCustomization }>("updateBranding", {
        propertyId,
        branding,
      })
      setBrandingSettings((prev) => ({ ...prev, [propertyId]: stored }))
      return stored
    },
    [postAction],
  )

  const getFloorPlan = useCallback(
    (floorPlanId?: string) => floorPlans.find((plan) => plan.id === floorPlanId),
    [floorPlans],
  )

  const getShareForProperty = useCallback(
    (propertyId: string) => crossPlatformShares.find((share) => share.propertyId === propertyId),
    [crossPlatformShares],
  )

  const getModelsForProperty = useCallback(
    (propertyId: string) => modelAssets.filter((model) => model.propertyId === propertyId),
    [modelAssets],
  )

  const getSceneTypesForProperty = useCallback(
    (propertyId: string) => sceneTypeConfigs.filter((config) => config.propertyId === propertyId),
    [sceneTypeConfigs],
  )

  return (
    <DataContext.Provider
      value={{
        properties,
        leads,
        visitors,
        captureServices,
        bookingSlots,
        propertyMerges,
        crossPlatformShares,
        floorPlans,
        modelAssets,
        sceneTypeConfigs,
        technicians,
        brandingSettings,
        isLoading,
        addProperty,
        updateProperty,
        deleteProperty,
        addLead,
        updateLead,
        addVisitor,
        getPropertyStats,
        updateCaptureService,
        assignTechnician,
        createCaptureService,
        bookSlot,
        createPropertyMerge,
        deletePropertyMerge,
        upsertCrossPlatformShare,
        addModelAsset,
        removeModelAsset,
        addSceneTypeConfig,
        removeSceneTypeConfig,
        updateBranding,
        getFloorPlan,
        getShareForProperty,
        getModelsForProperty,
        getSceneTypesForProperty,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within DataProvider")
  }
  return context
}
