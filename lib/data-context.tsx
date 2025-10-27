"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
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
  PropertyStatsSummary,
} from "./types"
import {
  mockProperties,
  mockLeads,
  mockVisitors,
  mockCaptureServices,
  mockBookingSlots,
  mockPropertyMerges,
  mockCrossPlatformShares,
  mockFloorPlans,
  mockModelAssets,
  mockSceneTypeConfigs,
  mockTechnicians,
  mockBrandingSettings,
} from "./mock-data"

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
  addProperty: (property: Property) => void
  updateProperty: (id: string, property: Partial<Property>) => void
  deleteProperty: (id: string) => void
  addLead: (lead: Lead) => void
  updateLead: (id: string, lead: Partial<Lead>) => void
  addVisitor: (visitor: Visitor) => void
  getPropertyStats: (propertyId: string) => PropertyStatsSummary
  updateCaptureService: (id: string, updates: Partial<CaptureService>) => void
  assignTechnician: (serviceId: string, technicianId: string) => void
  createCaptureService: (service: CaptureService) => void
  bookSlot: (slotId: string, booking: { name: string; email: string; phone?: string }) => void
  createPropertyMerge: (merge: PropertyMerge) => void
  deletePropertyMerge: (mergeId: string) => void
  upsertCrossPlatformShare: (share: CrossPlatformShare) => void
  addModelAsset: (model: Model3DAsset) => void
  removeModelAsset: (modelId: string) => void
  addSceneTypeConfig: (config: SceneTypeConfig) => void
  removeSceneTypeConfig: (configId: string) => void
  updateBranding: (propertyId: string, branding: CSSCustomization) => void
  getFloorPlan: (floorPlanId?: string) => FloorPlan | undefined
  getShareForProperty: (propertyId: string) => CrossPlatformShare | undefined
  getModelsForProperty: (propertyId: string) => Model3DAsset[]
  getSceneTypesForProperty: (propertyId: string) => SceneTypeConfig[]
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(mockProperties)
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [visitors, setVisitors] = useState<Visitor[]>(mockVisitors)
  const [captureServices, setCaptureServices] = useState<CaptureService[]>(mockCaptureServices)
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>(mockBookingSlots)
  const [propertyMerges, setPropertyMerges] = useState<PropertyMerge[]>(mockPropertyMerges)
  const [crossPlatformShares, setCrossPlatformShares] =
    useState<CrossPlatformShare[]>(mockCrossPlatformShares)
  const [floorPlans] = useState<FloorPlan[]>(mockFloorPlans)
  const [modelAssets, setModelAssets] = useState<Model3DAsset[]>(mockModelAssets)
  const [sceneTypeConfigs, setSceneTypeConfigs] = useState<SceneTypeConfig[]>(mockSceneTypeConfigs)
  const [technicians] = useState<TechnicianProfile[]>(mockTechnicians)
  const [brandingSettings, setBrandingSettings] = useState<Record<string, CSSCustomization>>(
    mockBrandingSettings,
  )

  const addProperty = useCallback((property: Property) => {
    setProperties((prev) => [...prev, property])
  }, [])

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const deleteProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => [...prev, lead])
  }, [])

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const addVisitor = useCallback((visitor: Visitor) => {
    setVisitors((prev) => [...prev, visitor])
  }, [])

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

  const updateCaptureService = useCallback((id: string, updates: Partial<CaptureService>) => {
    setCaptureServices((prev) => prev.map((service) => (service.id === id ? { ...service, ...updates } : service)))
  }, [])

  const assignTechnician = useCallback((serviceId: string, technicianId: string) => {
    setCaptureServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? { ...service, assignedTechnicianId: technicianId, status: "scheduled" }
          : service,
      ),
    )
  }, [])

  const createCaptureService = useCallback((service: CaptureService) => {
    setCaptureServices((prev) => [...prev, service])
  }, [])

  const bookSlot = useCallback(
    (slotId: string, booking: { name: string; email: string; phone?: string }) => {
      setBookingSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId ? { ...slot, available: false, bookedBy: booking.name } : slot,
        ),
      )

      const lead: Lead = {
        id: `lead-${Date.now()}`,
        propertyId: bookingSlots.find((slot) => slot.id === slotId)?.propertyId || properties[0]?.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone || "",
        message: "Scheduled a property viewing via booking system.",
        visitDuration: 0,
        scenesViewed: 0,
        createdAt: new Date(),
        status: "contacted",
        notes: "Auto-generated from booking",
        source: "booking",
      }
      setLeads((prev) => [...prev, lead])
    },
    [bookingSlots, properties],
  )

  const createPropertyMerge = useCallback((merge: PropertyMerge) => {
    setPropertyMerges((prev) => [...prev, merge])
  }, [])

  const deletePropertyMerge = useCallback((mergeId: string) => {
    setPropertyMerges((prev) => prev.filter((merge) => merge.id !== mergeId))
  }, [])

  const upsertCrossPlatformShare = useCallback((share: CrossPlatformShare) => {
    setCrossPlatformShares((prev) => {
      const exists = prev.some((item) => item.propertyId === share.propertyId)
      return exists
        ? prev.map((item) => (item.propertyId === share.propertyId ? { ...item, ...share } : item))
        : [...prev, share]
    })
  }, [])

  const addModelAsset = useCallback((model: Model3DAsset) => {
    setModelAssets((prev) => [...prev, model])
  }, [])

  const removeModelAsset = useCallback((modelId: string) => {
    setModelAssets((prev) => prev.filter((model) => model.id !== modelId))
  }, [])

  const addSceneTypeConfig = useCallback((config: SceneTypeConfig) => {
    setSceneTypeConfigs((prev) => [...prev, config])
  }, [])

  const removeSceneTypeConfig = useCallback((configId: string) => {
    setSceneTypeConfigs((prev) => prev.filter((config) => config.id !== configId))
  }, [])

  const updateBranding = useCallback((propertyId: string, branding: CSSCustomization) => {
    setBrandingSettings((prev) => ({ ...prev, [propertyId]: branding }))
  }, [])

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
