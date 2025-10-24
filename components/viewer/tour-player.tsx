"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  FloorPlan,
  Hotspot,
  LeadCapturePayload,
  Property,
  Room,
  SceneEngagementPayload,
  TourPoint,
  WooCommerceProduct,
} from "@/lib/types"
import { SceneViewer } from "./scene-viewer"
import { FloorPlanViewer } from "./floor-plan-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Share2,
  Heart,
  ShoppingCart,
  PlayCircle,
  Square,
  ArrowUp,
  ArrowDown,
  Trash2,
  MapPin,
} from "lucide-react"

type SharePlatform = "facebook" | "twitter" | "linkedin" | "email"

const sharePlatforms: SharePlatform[] = ["facebook", "twitter", "linkedin", "email"]

interface TourPlayerProps {
  property: Property
  floorPlan?: FloorPlan | null
  onLeadCapture?: (lead: LeadCapturePayload) => void
  onEngagementTrack?: (engagement: SceneEngagementPayload) => void
  products?: WooCommerceProduct[]
}

export function TourPlayer({
  property,
  floorPlan,
  onLeadCapture,
  onEngagementTrack,
  products = [],
}: TourPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" })
  const [sessionStart, setSessionStart] = useState(Date.now())
  const [isFavorite, setIsFavorite] = useState(property.isFavorite ?? false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null)
  const [tourPoints, setTourPoints] = useState<TourPoint[]>([])
  const [isTourPlaying, setIsTourPlaying] = useState(false)
  const [activeTourIndex, setActiveTourIndex] = useState(0)
  const [pendingOrientation, setPendingOrientation] = useState<{
    sceneId: string
    yaw: number
    pitch: number
    key: number
  } | null>(null)
  const sceneEngagement = useRef<Record<string, number>>({})
  const tourTimeoutRef = useRef<number | null>(null)
  const TOUR_STEP_DURATION = 8000
  const { productHotspotMap, productHotspotIds } = useMemo(() => {
    const map = new Map<string, WooCommerceProduct>()
    const ids: string[] = []

    for (const product of products) {
      if (product.hotspotId) {
        map.set(product.hotspotId, product)
        if (!ids.includes(product.hotspotId)) {
          ids.push(product.hotspotId)
        }
      }
    }

    return { productHotspotMap: map, productHotspotIds: ids }
  }, [products])

  useEffect(() => {
    setShowFloorPlan(false)
    setCurrentSceneIndex(0)
    setSessionStart(Date.now())
    setIsFavorite(property.isFavorite ?? false)
    setShowShareMenu(false)
    setSelectedProduct(null)
    sceneEngagement.current = {}
    setTourPoints([])
    setIsTourPlaying(false)
    setActiveTourIndex(0)
    setPendingOrientation(null)
    if (tourTimeoutRef.current) {
      window.clearTimeout(tourTimeoutRef.current)
      tourTimeoutRef.current = null
    }
  }, [property.id, property.isFavorite])

  useEffect(() => {
    if (selectedProduct && !products.some((product) => product.id === selectedProduct.id)) {
      setSelectedProduct(null)
    }
  }, [products, selectedProduct])

  const currentScene = property.scenes[currentSceneIndex]

  const handleTourPointCreate = (point: TourPoint) => {
    setTourPoints((prev) => {
      const label = point.note && point.note.trim().length > 0 ? point.note.trim() : `Stop ${prev.length + 1}`
      return [...prev, { ...point, note: label }]
    })
  }

  const handleTourPointRemove = (id: string) => {
    setTourPoints((prev) => prev.filter((point) => point.id !== id))
  }

  const moveTourPoint = (index: number, direction: -1 | 1) => {
    setTourPoints((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const clone = [...prev]
      const [removed] = clone.splice(index, 1)
      clone.splice(target, 0, removed)
      return clone
    })
  }

  const startTourAt = (index: number) => {
    if (tourPoints.length === 0) return
    const clamped = Math.max(0, Math.min(index, tourPoints.length - 1))
    setActiveTourIndex(clamped)
    setIsTourPlaying(true)
  }

  const stopGuidedTour = () => {
    setIsTourPlaying(false)
    setPendingOrientation(null)
    if (tourTimeoutRef.current) {
      window.clearTimeout(tourTimeoutRef.current)
      tourTimeoutRef.current = null
    }
  }

  const handleHotspotClick = (hotspot: Hotspot) => {
    const productMatch = productHotspotMap.get(hotspot.id)

    if (hotspot.type === "link" && hotspot.targetSceneId) {
      const sceneIndex = property.scenes.findIndex((s) => s.id === hotspot.targetSceneId)
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex)
      }
    } else if (hotspot.type === "cta") {
      setShowLeadForm(true)
    }

    if (productMatch) {
      setSelectedProduct(productMatch)
    }
  }

  const handleProductSelect = (product: WooCommerceProduct) => {
    setSelectedProduct(product)
  }

  const handleProductPurchase = (product: WooCommerceProduct) => {
    alert(`Purchase initiated for ${product.name}. We will redirect you to checkout shortly.`)
  }

  useEffect(() => {
    if (!isTourPlaying) {
      if (tourTimeoutRef.current) {
        window.clearTimeout(tourTimeoutRef.current)
        tourTimeoutRef.current = null
      }
      return
    }

    const currentPoint = tourPoints[activeTourIndex]
    if (!currentPoint) {
      setIsTourPlaying(false)
      return
    }

    const sceneIndex = property.scenes.findIndex((scene) => scene.id === currentPoint.sceneId)
    if (sceneIndex !== -1 && sceneIndex !== currentSceneIndex) {
      setCurrentSceneIndex(sceneIndex)
      return
    }

    setPendingOrientation({
      sceneId: currentPoint.sceneId,
      yaw: currentPoint.yaw,
      pitch: currentPoint.pitch,
      key: Date.now(),
    })

    tourTimeoutRef.current = window.setTimeout(() => {
      if (activeTourIndex >= tourPoints.length - 1) {
        setIsTourPlaying(false)
      } else {
        setActiveTourIndex((prev) => prev + 1)
      }
    }, TOUR_STEP_DURATION)

    return () => {
      if (tourTimeoutRef.current) {
        window.clearTimeout(tourTimeoutRef.current)
        tourTimeoutRef.current = null
      }
    }
  }, [
    TOUR_STEP_DURATION,
    activeTourIndex,
    currentSceneIndex,
    isTourPlaying,
    property.scenes,
    tourPoints,
  ])

  useEffect(() => {
    if (!pendingOrientation) return
    const timeout = window.setTimeout(() => setPendingOrientation(null), 500)
    return () => window.clearTimeout(timeout)
  }, [pendingOrientation])

  useEffect(() => {
    if (activeTourIndex >= tourPoints.length && tourPoints.length > 0) {
      setActiveTourIndex(tourPoints.length - 1)
    }
    if (tourPoints.length === 0) {
      setIsTourPlaying(false)
    }
  }, [activeTourIndex, tourPoints.length])

  useEffect(() => {
    return () => {
      if (tourTimeoutRef.current) {
        window.clearTimeout(tourTimeoutRef.current)
      }
    }
  }, [])

  const handleSceneEngagement = (sceneId: string, dwellTime: number) => {
    sceneEngagement.current[sceneId] = (sceneEngagement.current[sceneId] || 0) + dwellTime
    onEngagementTrack?.({
      sceneId,
      dwellTime,
      totalEngagement: sceneEngagement.current,
    })
  }

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const duration = (Date.now() - sessionStart) / 1000 / 60
    onLeadCapture?.({
      ...formData,
      propertyId: property.id,
      visitDuration: duration,
      scenesViewed: currentSceneIndex + 1,
    })
    setShowLeadForm(false)
    setFormData({ name: "", email: "", phone: "", message: "" })
  }

  const handleShare = (platform: SharePlatform) => {
    const url = window.location.href
    const text = `Check out this amazing property: ${property.name}`
    const shareUrls: Record<SharePlatform, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent(property.name)}&body=${encodeURIComponent(text + "\n" + url)}`,
    }
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "noopener,noreferrer")
    }
  }

  const handleFloorPlanRoomClick = (room: Room) => {
    if (!room.sceneId) return
    const sceneIndex = property.scenes.findIndex((scene) => scene.id === room.sceneId)
    if (sceneIndex >= 0) {
      setCurrentSceneIndex(sceneIndex)
      setShowFloorPlan(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white leading-tight">{property.name}</h1>
            <p className="text-gray-400 text-sm">{property.address}</p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-3xl font-bold text-white">{formatCurrency(property.price)}</div>
            <div className="text-gray-400 text-sm">
              {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft.toLocaleString()} sqft
            </div>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        <div className="flex-1 min-h-[360px]">
          <SceneViewer
            scene={currentScene}
            onHotspotClick={handleHotspotClick}
            onSceneEngagement={handleSceneEngagement}
            branding={property.branding}
            dayNightImages={property.dayNightImages}
            enableVR
            enableGyroscope
            productHotspotIds={productHotspotIds}
            sceneTransition={property.sceneTransition ?? "fade"}
            onTourPointCreate={handleTourPointCreate}
            targetOrientation={pendingOrientation}
            availableViewModes={property.supportedViewModes}
          />
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Scene Thumbnails */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold text-white mb-3">Scenes</h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {property.scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  onClick={() => setCurrentSceneIndex(idx)}
                  className={`w-full text-left rounded-lg overflow-hidden transition-all border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    idx === currentSceneIndex ? "ring-2 ring-blue-500" : "hover:border-blue-500/40"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={scene.thumbnail || scene.imageUrl}
                      alt={scene.name}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">{scene.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Guided Tour */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">Guided Tour</h3>
                <p className="text-xs text-gray-400">Create a custom walkthrough from saved viewpoints.</p>
              </div>
              <Button
                size="sm"
                className={`gap-2 ${isTourPlaying ? "border-red-500 text-red-200 bg-red-500/10" : ""}`}
                onClick={() => (isTourPlaying ? stopGuidedTour() : startTourAt(0))}
                disabled={tourPoints.length === 0}
                variant="outline"
              >
                {isTourPlaying ? <Square className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                {isTourPlaying ? "Stop" : "Play All"}
              </Button>
            </div>
            {tourPoints.length === 0 ? (
              <p className="text-sm text-gray-400">
                Save a viewpoint from the viewer to add your first tour stop. You can capture multiple angles and reorder them
                here.
              </p>
            ) : (
              <div className="space-y-3">
                {tourPoints.map((point, idx) => {
                  const isActive = isTourPlaying && idx === activeTourIndex
                  return (
                    <div
                      key={point.id}
                      className={`rounded-lg border p-3 bg-gray-800/60 ${
                        isActive ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            {point.note || `Stop ${idx + 1}`}
                          </p>
                          <p className="text-xs text-gray-400">{point.sceneName}</p>
                          <p className="text-[11px] text-gray-500">
                            {Math.round(point.yaw)}° yaw • {Math.round(point.pitch)}° pitch
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveTourPoint(idx, -1)}
                            disabled={idx === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveTourPoint(idx, 1)}
                            disabled={idx === tourPoints.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleTourPointRemove(point.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full gap-2"
                        onClick={() => startTourAt(idx)}
                      >
                        <PlayCircle className="w-4 h-4" />
                        {isActive ? "Playing" : "Start from here"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Property Details */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold text-white mb-3">Property Details</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>{property.description}</p>
              {property.tags && property.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {property.tags.map((tag) => (
                    <span key={tag} className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {floorPlan && (
            <Card className="p-4 bg-gray-900 border-gray-800">
              <h3 className="font-semibold text-white mb-3">Floor Plan</h3>
              <div className="space-y-3">
                <img
                  src={floorPlan.imageUrl || "/placeholder.svg"}
                  alt={`${property.name} floor plan`}
                  className="w-full h-32 object-cover rounded"
                />
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowFloorPlan(true)}>
                  View Interactive Floor Plan
                </Button>
              </div>
            </Card>
          )}

          {/* Contact */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold text-white mb-3">Contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Phone className="w-4 h-4" />
                {property.branding.contactPhone}
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Mail className="w-4 h-4" />
                {property.branding.contactEmail}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setShowLeadForm(true)}
                className="flex-1"
                style={{ backgroundColor: property.branding.primaryColor }}
              >
                Schedule Tour
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFavorite(!isFavorite)}
                className={isFavorite ? "bg-red-500/20 border-red-500" : ""}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            </div>
          </Card>

          {products.length > 0 && (
            <Card className="p-4 bg-gray-900 border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Available Upgrades</h3>
                <span className="text-xs text-gray-400">{products.length} options</span>
              </div>
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex gap-3 rounded-lg bg-gray-800/60 p-3">
                    {product.image && (
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{product.name}</p>
                      <p className="text-xs text-gray-400 mb-2">{formatCurrency(product.price)}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProductSelect(product)}
                          className="flex-1 gap-2"
                          style={{ backgroundColor: property.branding.primaryColor }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProductPurchase(product)}
                          className="flex-1"
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {selectedProduct && (
            <Card className="p-4 bg-gray-900 border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Selected Upgrade</h3>
                  <p className="text-xs text-gray-400">Checkout without leaving the virtual tour.</p>
                </div>
              </div>
              <div className="space-y-3">
                {selectedProduct.image && (
                  <img
                    src={selectedProduct.image || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <div className="text-sm text-gray-300 space-y-1">
                  <p className="font-semibold text-white">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-400">SKU: {selectedProduct.sku}</p>
                  <p className="text-base font-semibold text-white">{formatCurrency(selectedProduct.price)}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => handleProductPurchase(selectedProduct)}
                  style={{ backgroundColor: property.branding.primaryColor }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelectedProduct(null)}>
                  Close
                </Button>
              </div>
            </Card>
          )}

          {/* Share */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="relative">
              <Button
                variant="outline"
                className="w-full gap-2 bg-transparent"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                <Share2 className="w-4 h-4" />
                Share Property
              </Button>
              {showShareMenu && (
                <div className="absolute top-12 left-0 right-0 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                  {sharePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        handleShare(platform)
                        setShowShareMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-300 capitalize"
                    >
                      Share on {platform}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Scene Navigation */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))}
          disabled={currentSceneIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <div className="text-sm text-gray-400">
          Scene {currentSceneIndex + 1} of {property.scenes.length}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentSceneIndex(Math.min(property.scenes.length - 1, currentSceneIndex + 1))}
          disabled={currentSceneIndex === property.scenes.length - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Lead Capture Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-gray-900 border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Schedule a Tour</h2>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500"
                required
              />
              <textarea
                placeholder="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 h-24"
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" style={{ backgroundColor: property.branding.primaryColor }}>
                  Submit
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowLeadForm(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showFloorPlan && floorPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-5xl bg-gray-900 border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white">{floorPlan.name}</h2>
                <p className="text-sm text-gray-400">Tap rooms to jump directly into their scenes.</p>
              </div>
              <Button variant="outline" onClick={() => setShowFloorPlan(false)}>
                Close
              </Button>
            </div>
            <div className="h-[540px]">
              <FloorPlanViewer
                floorPlan={floorPlan}
                branding={property.branding}
                onRoomClick={handleFloorPlanRoomClick}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
