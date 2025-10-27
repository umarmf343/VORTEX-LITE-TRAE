"use client"

import { useEffect, useState, type ElementType } from "react"
import { useData } from "@/lib/data-context"
import type { CSSCustomization, CrossPlatformShare, LeadCapturePayload, Property } from "@/lib/types"
import { TourPlayer } from "@/components/viewer/tour-player"
import { MatterportEmbed } from "@/components/viewer/matterport-embed"
import { PropertyList } from "@/components/admin/property-list"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { AdvancedAnalytics } from "@/components/admin/advanced-analytics"
import { LeadsDashboard } from "@/components/admin/leads-dashboard"
import { CaptureServices } from "@/components/admin/capture-services"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import { buildMatterportUrl } from "@/lib/matterport"
import {
  Building2,
  BarChart3,
  Users,
  Zap,
  FileText,
  Calendar,
  Share2,
  Code,
  Map,
  Globe,
  ExternalLink,
  AlertCircle,
  Navigation,
} from "@/lib/icons"
import PropertyReports from "@/components/admin/property-reports"
import BookingSystem from "@/components/admin/booking-system"
import CrossPlatformSharing from "@/components/admin/cross-platform-sharing"
import { PropertyComparison } from "@/components/admin/property-comparison"
import { MergeSpaces } from "@/components/admin/merge-spaces"
import { CustomBranding } from "@/components/admin/custom-branding"
import { TechnicianManagement } from "@/components/admin/technician-management"
import { EmbedCodeGenerator } from "@/components/admin/embed-code-generator"
import { VisitorJourneyMap } from "@/components/admin/visitor-journey-map"
import { Models3D } from "@/components/admin/3d-models"
import { SceneTypes } from "@/components/admin/scene-types"

type ViewMode =
  | "home"
  | "tour"
  | "admin"
  | "analytics"
  | "advanced-analytics"
  | "leads"
  | "capture"
  | "reports"
  | "booking"
  | "sharing"
  | "floor-plan"
  | "comparison"
  | "merge"
  | "branding"
  | "technicians"
  | "embed"
  | "journey"
  | "3d-models"
  | "scene-types"

const ADMIN_VIEW_MODES: readonly ViewMode[] = [
  "admin",
  "comparison",
  "merge",
  "analytics",
  "advanced-analytics",
  "reports",
  "booking",
  "sharing",
  "branding",
  "technicians",
  "3d-models",
  "scene-types",
  "leads",
  "capture",
  "embed",
  "journey",
] as const

export default function Page() {
  const {
    properties,
    leads,
    visitors,
    captureServices,
    bookingSlots,
    propertyMerges,
    technicians,
    brandingSettings,
    addLead,
    updateLead,
    updateCaptureService,
    createCaptureService,
    assignTechnician,
    bookSlot,
    createPropertyMerge,
    deletePropertyMerge,
    getShareForProperty,
    getModelsForProperty,
    addModelAsset,
    removeModelAsset,
    getSceneTypesForProperty,
    addSceneTypeConfig,
    removeSceneTypeConfig,
    getFloorPlan,
    updateBranding,
  } = useData()
  const [viewMode, setViewMode] = useState<ViewMode>("home")
  const [selectedProperty, setSelectedProperty] = useState<Property | undefined>(properties[0])
  const [selectedAnalyticsProperty, setSelectedAnalyticsProperty] = useState<Property | undefined>(
    properties[0],
  )
  const [tourExperience, setTourExperience] = useState<"vortex" | "matterport" | "sphr">("vortex")
  const matterportApplicationKey = process.env.NEXT_PUBLIC_MATTERPORT_SDK ?? ""

  const featureHighlights = [
    {
      title: "Vortex360 Interactive Labels",
      description:
        "Interactive labels that provide additional information, such as text, images, or videos, enriching the user experience.",
      icon: FileText,
    },
    {
      title: "Guided Tours",
      description:
        "Enables the creation of custom paths to highlight key areas, enhancing storytelling and user engagement.",
      icon: Map,
    },
  ] as const

  useEffect(() => {
    if (properties.length === 0) {
      setSelectedProperty(undefined)
      setSelectedAnalyticsProperty(undefined)
      return
    }

    setSelectedProperty((current) => {
      if (current && properties.some((property) => property.id === current.id)) {
        return current
      }
      return properties[0]
    })

    setSelectedAnalyticsProperty((current) => {
      if (current && properties.some((property) => property.id === current.id)) {
        return current
      }
      return properties[0]
    })
  }, [properties])

  useEffect(() => {
    if (viewMode !== "tour") {
      setTourExperience("vortex")
    }
  }, [viewMode])

  useEffect(() => {
    if (tourExperience === "matterport" && !selectedProperty?.matterportModelId) {
      setTourExperience("vortex")
    }
    if (tourExperience === "sphr" && !selectedProperty?.sphrSpace) {
      setTourExperience("vortex")
    }
  }, [selectedProperty?.matterportModelId, selectedProperty?.sphrSpace, tourExperience])

  if (!selectedProperty || !selectedAnalyticsProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        No properties available.
      </div>
    )
  }

  const selectedFloorPlan = getFloorPlan(selectedProperty.floorPlanId)
  const defaultShareConfig: CrossPlatformShare = {
    propertyId: selectedAnalyticsProperty.id,
    platforms: {
      googleStreetView: false,
      vrbo: false,
      realtorCom: false,
      zillow: false,
      facebook: false,
      twitter: false,
      linkedin: false,
    },
    shareLinks: {},
  }
  const selectedShareConfig = getShareForProperty(selectedAnalyticsProperty.id) || defaultShareConfig
  const propertyModels = getModelsForProperty(selectedAnalyticsProperty.id)
  const propertySceneTypes = getSceneTypesForProperty(selectedAnalyticsProperty.id)
  const selectedBranding: CSSCustomization =
    brandingSettings[selectedAnalyticsProperty.id] ||
    {
      propertyId: selectedAnalyticsProperty.id,
      customCSS: "",
      whiteLabel: false,
      removeBranding: false,
    }
  const isAdminView = ADMIN_VIEW_MODES.includes(viewMode)

  const adminNavigation: { label: string; view: ViewMode; icon?: ElementType }[] = [
    { label: "Properties", view: "admin", icon: Building2 },
    { label: "Compare", view: "comparison" },
    { label: "Merge", view: "merge" },
    { label: "Analytics", view: "analytics", icon: BarChart3 },
    { label: "Advanced", view: "advanced-analytics", icon: Zap },
    { label: "Reports", view: "reports", icon: FileText },
    { label: "Booking", view: "booking", icon: Calendar },
    { label: "Sharing", view: "sharing", icon: Share2 },
    { label: "Branding", view: "branding" },
    { label: "Technicians", view: "technicians" },
    { label: "3D Models", view: "3d-models" },
    { label: "Scene Types", view: "scene-types" },
    { label: "Leads", view: "leads", icon: Users },
    { label: "Capture", view: "capture", icon: Zap },
    { label: "Embed", view: "embed", icon: Code },
    { label: "Journey", view: "journey", icon: Map },
  ]

  const handleLeadCapture = (leadData: LeadCapturePayload) => {
    const newLead = {
      id: `lead-${Date.now()}`,
      propertyId: leadData.propertyId,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      message: leadData.message,
      visitDuration: leadData.visitDuration,
      scenesViewed: leadData.scenesViewed,
      createdAt: new Date(),
      status: "new" as const,
      notes: "",
      source: "virtual-tour",
    }
    addLead(newLead)
    alert("Thank you! We will contact you soon.")
  }

  // Home View
  if (viewMode === "home") {
    const filteredProperties = properties

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-white">BaladShelter</h1>
                <p className="text-slate-400">Premium Virtual Tour Platform</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
                <Button onClick={() => setViewMode("admin")} variant="outline" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Admin Dashboard
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Why Vortex360 Stands Out</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featureHighlights.map(({ title, description, icon: Icon }) => (
                <Card
                  key={title}
                  className="bg-slate-800/80 border border-slate-700/70 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
                </Card>
              ))}
            </div>
          </section>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Featured Properties</h2>
            <p className="text-slate-400">Explore our premium real estate listings with immersive 360° virtual tours</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProperties.length === 0 ? (
              <Card className="col-span-full bg-slate-800/60 border border-white/10 p-6 text-center text-slate-200">
                No properties available.
              </Card>
            ) : (
              filteredProperties.map((property) => (
                <Card
                  key={property.id}
                  className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group bg-slate-800 border-slate-700"
                  onClick={() => {
                    setSelectedProperty(property)
                    setViewMode("tour")
                  }}
                >
                <div className="relative overflow-hidden h-48">
                  <img
                    src={property.thumbnail || "/placeholder.svg"}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{property.name}</h3>
                    <p className="text-slate-300 text-sm">{property.address}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-2xl font-bold text-white">{formatCurrency(property.price)}</div>
                    <div className="text-sm text-slate-400 sm:text-right">
                      <div>
                        {property.bedrooms} bed • {property.bathrooms} bath
                      </div>
                      <div>{property.sqft.toLocaleString()} sqft</div>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedProperty(property)
                      setViewMode("tour")
                    }}
                  >
                    View Virtual Tour
                  </Button>
                </div>
              </Card>
              ))
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-700 bg-slate-900/50 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-400">
            <p>&copy; 2025 BaladShelter. All rights reserved.</p>
          </div>
        </footer>
      </div>
    )
  }

  // Tour View
  if (viewMode === "tour") {
    const matterportAvailable = Boolean(selectedProperty.matterportModelId)
    const sphrAvailable = Boolean(selectedProperty.sphrSpace)
    const matterportUrl = matterportAvailable
      ? buildMatterportUrl(selectedProperty.matterportModelId!, {
          applicationKey: matterportApplicationKey || undefined,
          autoplay: true,
        })
      : undefined
    const matterportViewActive = tourExperience === "matterport" && matterportAvailable
    const sphrViewActive = tourExperience === "sphr" && sphrAvailable

    return (
      <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-50">
        <div className="border-b border-gray-800 bg-gray-900/90 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Button variant="outline" onClick={() => setViewMode("home")} className="w-full gap-2 md:w-auto">
              ← Back to Properties
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={tourExperience === "vortex" ? "default" : "outline"}
                onClick={() => setTourExperience("vortex")}
                className="gap-2"
              >
                Vortex Tour
              </Button>
              {sphrAvailable ? (
                <Button
                  variant={tourExperience === "sphr" ? "default" : "outline"}
                  onClick={() => setTourExperience("sphr")}
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  SPHR Immersive
                </Button>
              ) : null}
              <Button
                variant={tourExperience === "matterport" ? "default" : "outline"}
                onClick={() => setTourExperience("matterport")}
                disabled={!matterportAvailable}
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                Matterport Showcase
              </Button>
              {!sphrAvailable && (
                <span className="basis-full text-xs text-slate-300">
                  Import SPHR nodes to unlock the immersive viewer option.
                </span>
              )}
              {!matterportAvailable && (
                <span className="basis-full text-xs text-slate-300">
                  Link a Matterport model ID to unlock the showcase view.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {matterportViewActive ? (
            <div className="flex h-full flex-col bg-slate-950 lg:flex-row">
              <div className="flex-1 min-h-[360px] p-4 lg:p-6">
                <MatterportEmbed
                  modelId={selectedProperty.matterportModelId}
                  applicationKey={matterportApplicationKey || undefined}
                  propertyName={selectedProperty.name}
                  experienceLabel={selectedProperty.matterportExperienceLabel}
                  className="h-full"
                />
              </div>
              <aside className="w-full border-t border-slate-800 bg-slate-900/60 p-4 text-slate-100 lg:w-96 lg:border-l lg:border-t-0 lg:p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Showcase Highlights</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Experience the official Matterport walkthrough for {selectedProperty.name}. Use this mode when you need
                      dollhouse navigation, guided highlight reels, or to share a link that mirrors the Matterport experience.
                    </p>
                  </div>
                  <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/80 p-4 text-sm text-slate-200">
                    <p className="font-medium text-white">What&apos;s included</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Native Matterport controls with VR support</li>
                      <li>Hotspot and measurement data synced with Showcase</li>
                      <li>Shareable link for marketing campaigns</li>
                    </ul>
                  </div>
                  {matterportApplicationKey ? (
                    <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                      Connected with the configured SDK key. Advanced analytics and scene automation are available in this
                      session.
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-500/10 p-3 text-amber-200">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <p className="text-xs leading-relaxed">
                        Set <code>NEXT_PUBLIC_MATTERPORT_SDK</code> in your environment to unlock SDK-driven telemetry and
                        scripted navigation.
                      </p>
                    </div>
                  )}
                  {matterportUrl && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-slate-600 text-slate-100 hover:bg-slate-800"
                      onClick={() => window.open(matterportUrl, "_blank", "noopener")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Launch full screen showcase
                    </Button>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <TourPlayer
              property={selectedProperty}
              onLeadCapture={handleLeadCapture}
              floorPlan={selectedFloorPlan}
              experienceMode={sphrViewActive ? "sphr" : "vortex"}
            />
          )}
        </div>
      </div>
    )
  }

  // Admin Dashboard
  if (isAdminView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-center md:text-left">BaladShelter Admin</h1>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="w-full lg:w-72 xl:w-80">
              <nav className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dashboard</p>
                  <div className="mt-3 space-y-1">
                    {adminNavigation.map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.view}
                          variant={viewMode === item.view ? "default" : "ghost"}
                          onClick={() => setViewMode(item.view)}
                          className={cn(
                            "w-full justify-start",
                            viewMode === item.view ? "shadow-sm" : "text-slate-600 hover:text-slate-900",
                          )}
                        >
                          {Icon ? <Icon className="w-4 h-4" /> : null}
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("home")}
                    className="w-full justify-start"
                  >
                    Back to Home
                  </Button>
                </div>
              </nav>
            </aside>

            <main className="flex-1 space-y-8">
          {viewMode === "admin" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Properties</h2>
              <PropertyList
                properties={properties}
                onView={(prop) => {
                  setSelectedProperty(prop)
                  setViewMode("tour")
                }}
                onStats={(prop) => {
                  setSelectedAnalyticsProperty(prop)
                  setViewMode("analytics")
                }}
              />
            </div>
          )}

          {viewMode === "comparison" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Property Comparison</h2>
              <PropertyComparison properties={properties} />
            </div>
          )}

          {viewMode === "merge" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Merge Spaces</h2>
              <MergeSpaces
                properties={properties}
                merges={propertyMerges}
                onCreateMerge={createPropertyMerge}
                onDeleteMerge={deletePropertyMerge}
              />
            </div>
          )}

          {viewMode === "branding" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Custom Branding - {selectedAnalyticsProperty.name}</h2>
              <CustomBranding
                propertyId={selectedAnalyticsProperty.id}
                branding={selectedBranding}
                onSave={(branding) => updateBranding(selectedAnalyticsProperty.id, branding)}
              />
            </div>
          )}

          {viewMode === "technicians" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Technician Management</h2>
              <TechnicianManagement
                technicians={technicians}
                services={captureServices}
                onAssignTechnician={assignTechnician}
              />
            </div>
          )}

          {viewMode === "reports" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Property Reports - {selectedAnalyticsProperty.name}</h2>
                <Button variant="outline" onClick={() => setViewMode("admin")}>
                  ← Back to Properties
                </Button>
              </div>
              <PropertyReports property={selectedAnalyticsProperty} />
            </div>
          )}

          {viewMode === "booking" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Booking System - {selectedAnalyticsProperty.name}</h2>
                <Button variant="outline" onClick={() => setViewMode("admin")}>
                  ← Back to Properties
                </Button>
              </div>
              <BookingSystem
                propertyId={selectedAnalyticsProperty.id}
                slots={bookingSlots}
                onBook={(slotId, booking) => bookSlot(slotId, booking)}
              />
            </div>
          )}

          {viewMode === "sharing" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Cross-Platform Sharing - {selectedAnalyticsProperty.name}</h2>
                <Button variant="outline" onClick={() => setViewMode("admin")}>
                  ← Back to Properties
                </Button>
              </div>
              <CrossPlatformSharing
                propertyId={selectedAnalyticsProperty.id}
                sharing={selectedShareConfig}
              />
            </div>
          )}

          {viewMode === "analytics" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Analytics - {selectedAnalyticsProperty.name}</h2>
                <Button variant="outline" onClick={() => setViewMode("admin")}>
                  ← Back to Properties
                </Button>
              </div>
              <AnalyticsDashboard property={selectedAnalyticsProperty} visitors={visitors} leads={leads} />
            </div>
          )}

          {viewMode === "advanced-analytics" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Advanced Analytics - {selectedAnalyticsProperty.name}</h2>
                <Button variant="outline" onClick={() => setViewMode("admin")}>
                  ← Back to Properties
                </Button>
              </div>
              <AdvancedAnalytics property={selectedAnalyticsProperty} visitors={visitors} leads={leads} />
            </div>
          )}

          {viewMode === "leads" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Lead Management</h2>
              <LeadsDashboard leads={leads} onUpdateLead={updateLead} />
            </div>
          )}

          {viewMode === "capture" && (
            <div>
              <CaptureServices
                services={captureServices}
                properties={properties}
                onUpdateService={updateCaptureService}
                onCreateService={createCaptureService}
              />
            </div>
          )}

          {viewMode === "embed" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Embed Code - {selectedAnalyticsProperty.name}</h2>
              <EmbedCodeGenerator
                propertyId={selectedAnalyticsProperty.id}
                propertyName={selectedAnalyticsProperty.name}
              />
            </div>
          )}

          {viewMode === "journey" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Visitor Journey - {selectedAnalyticsProperty.name}</h2>
              <VisitorJourneyMap visitors={visitors} propertyId={selectedAnalyticsProperty.id} />
            </div>
          )}

          {viewMode === "3d-models" && (
            <div>
              <h2 className="text-xl font-bold mb-6">3D Models - {selectedAnalyticsProperty.name}</h2>
              <Models3D
                propertyId={selectedAnalyticsProperty.id}
                models={propertyModels}
                onAddModel={addModelAsset}
                onRemoveModel={removeModelAsset}
              />
            </div>
          )}

          {viewMode === "scene-types" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Scene Types - {selectedAnalyticsProperty.name}</h2>
              <SceneTypes
                propertyId={selectedAnalyticsProperty.id}
                scenes={propertySceneTypes}
                onAddSceneType={addSceneTypeConfig}
                onRemoveSceneType={removeSceneTypeConfig}
              />
            </div>
          )}
            </main>
          </div>
        </div>
      </div>
    )
  }

  return null
}
