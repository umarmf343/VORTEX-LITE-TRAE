"use client"

import { useEffect, useState } from "react"
import { useData } from "@/lib/data-context"
import type { CSSCustomization, CrossPlatformShare, LeadCapturePayload, Property } from "@/lib/types"
import { TourPlayer } from "@/components/viewer/tour-player"
import { PropertyList } from "@/components/admin/property-list"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { AdvancedAnalytics } from "@/components/admin/advanced-analytics"
import { LeadsDashboard } from "@/components/admin/leads-dashboard"
import { CaptureServices } from "@/components/admin/capture-services"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
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
  ShoppingCart,
} from "lucide-react"
import PropertyReports from "@/components/admin/property-reports"
import BookingSystem from "@/components/admin/booking-system"
import CrossPlatformSharing from "@/components/admin/cross-platform-sharing"
import { PropertyComparison } from "@/components/admin/property-comparison"
import { MergeSpaces } from "@/components/admin/merge-spaces"
import { CustomBranding } from "@/components/admin/custom-branding"
import { TechnicianManagement } from "@/components/admin/technician-management"
import { EmbedCodeGenerator } from "@/components/admin/embed-code-generator"
import { VisitorJourneyMap } from "@/components/admin/visitor-journey-map"
import { WooCommerceIntegration } from "@/components/admin/woocommerce-integration"
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
  | "woocommerce"
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
  "woocommerce",
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
    getProductsForProperty,
    addProduct,
    removeProduct,
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
  const propertyProducts = getProductsForProperty(selectedAnalyticsProperty.id)
  const tourProducts = getProductsForProperty(selectedProperty.id)
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">BaladShelter</h1>
                <p className="text-slate-400">Premium Virtual Tour Platform</p>
              </div>
              <div className="flex gap-2">
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold text-white">{formatCurrency(property.price)}</div>
                    <div className="text-right text-sm text-slate-400">
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
    return (
      <div className="w-full h-screen flex flex-col">
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <Button variant="outline" onClick={() => setViewMode("home")} className="gap-2">
            ← Back to Properties
          </Button>
        </div>
        <TourPlayer
          property={selectedProperty}
          onLeadCapture={handleLeadCapture}
          floorPlan={selectedFloorPlan}
          products={tourProducts}
        />
      </div>
    )
  }

  // Admin Dashboard
  if (isAdminView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between overflow-x-auto">
            <h1 className="text-2xl font-bold">BaladShelter Admin</h1>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={viewMode === "admin" ? "default" : "outline"}
                onClick={() => setViewMode("admin")}
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                Properties
              </Button>
              <Button
                variant={viewMode === "comparison" ? "default" : "outline"}
                onClick={() => setViewMode("comparison")}
                className="gap-2"
              >
                Compare
              </Button>
              <Button
                variant={viewMode === "merge" ? "default" : "outline"}
                onClick={() => setViewMode("merge")}
                className="gap-2"
              >
                Merge
              </Button>
              <Button
                variant={viewMode === "analytics" ? "default" : "outline"}
                onClick={() => setViewMode("analytics")}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button
                variant={viewMode === "advanced-analytics" ? "default" : "outline"}
                onClick={() => setViewMode("advanced-analytics")}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Advanced
              </Button>
              <Button
                variant={viewMode === "reports" ? "default" : "outline"}
                onClick={() => setViewMode("reports")}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Reports
              </Button>
              <Button
                variant={viewMode === "booking" ? "default" : "outline"}
                onClick={() => setViewMode("booking")}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Booking
              </Button>
              <Button
                variant={viewMode === "sharing" ? "default" : "outline"}
                onClick={() => setViewMode("sharing")}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Sharing
              </Button>
              <Button
                variant={viewMode === "branding" ? "default" : "outline"}
                onClick={() => setViewMode("branding")}
                className="gap-2"
              >
                Branding
              </Button>
              <Button
                variant={viewMode === "technicians" ? "default" : "outline"}
                onClick={() => setViewMode("technicians")}
                className="gap-2"
              >
                Technicians
              </Button>
              <Button
                variant={viewMode === "woocommerce" ? "default" : "outline"}
                onClick={() => setViewMode("woocommerce")}
                className="gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                WooCommerce
              </Button>
              <Button
                variant={viewMode === "3d-models" ? "default" : "outline"}
                onClick={() => setViewMode("3d-models")}
                className="gap-2"
              >
                3D Models
              </Button>
              <Button
                variant={viewMode === "scene-types" ? "default" : "outline"}
                onClick={() => setViewMode("scene-types")}
                className="gap-2"
              >
                Scene Types
              </Button>
              <Button
                variant={viewMode === "leads" ? "default" : "outline"}
                onClick={() => setViewMode("leads")}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Leads
              </Button>
              <Button
                variant={viewMode === "capture" ? "default" : "outline"}
                onClick={() => setViewMode("capture")}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Capture
              </Button>
              <Button
                variant={viewMode === "embed" ? "default" : "outline"}
                onClick={() => setViewMode("embed")}
                className="gap-2"
              >
                <Code className="w-4 h-4" />
                Embed
              </Button>
              <Button
                variant={viewMode === "journey" ? "default" : "outline"}
                onClick={() => setViewMode("journey")}
                className="gap-2"
              >
                <Map className="w-4 h-4" />
                Journey
              </Button>
              <Button variant="outline" onClick={() => setViewMode("home")}>
                Back to Home
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
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

          {viewMode === "woocommerce" && (
            <div>
              <h2 className="text-xl font-bold mb-6">WooCommerce Integration - {selectedAnalyticsProperty.name}</h2>
              <WooCommerceIntegration
                propertyId={selectedAnalyticsProperty.id}
                products={propertyProducts}
                onAddProduct={addProduct}
                onRemoveProduct={removeProduct}
              />
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
    )
  }

  return null
}
