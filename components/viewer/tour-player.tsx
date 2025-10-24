"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import type {
  FloorPlan,
  Hotspot,
  LeadCapturePayload,
  Property,
  Room,
  SceneEngagementPayload,
} from "@/lib/types"
import { SceneViewer } from "./scene-viewer"
import { FloorPlanViewer } from "./floor-plan-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Phone, Mail, Share2, Heart } from "lucide-react"

type SharePlatform = "facebook" | "twitter" | "linkedin" | "email"

interface TourPlayerProps {
  property: Property
  floorPlan?: FloorPlan | null
  onLeadCapture?: (lead: LeadCapturePayload) => void
  onEngagementTrack?: (engagement: SceneEngagementPayload) => void
}

export function TourPlayer({ property, floorPlan, onLeadCapture, onEngagementTrack }: TourPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" })
  const [sessionStart] = useState(Date.now())
  const [isFavorite, setIsFavorite] = useState(property.isFavorite || false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const sceneEngagement = useRef<Record<string, number>>({})

  useEffect(() => {
    setShowFloorPlan(false)
    setCurrentSceneIndex(0)
  }, [property.id])

  const currentScene = property.scenes[currentSceneIndex]

  const handleHotspotClick = (hotspot: Hotspot) => {
    if (hotspot.type === "link" && hotspot.targetSceneId) {
      const sceneIndex = property.scenes.findIndex((s) => s.id === hotspot.targetSceneId)
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex)
      }
    } else if (hotspot.type === "cta") {
      setShowLeadForm(true)
    }
  }

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
      window.open(shareUrls[platform], "_blank")
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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{property.name}</h1>
            <p className="text-gray-400 text-sm">{property.address}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">${(property.price / 1000000).toFixed(1)}M</div>
            <div className="text-gray-400 text-sm">
              {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft.toLocaleString()} sqft
            </div>
          </div>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full">
        <div className="flex-1">
          <SceneViewer
            scene={currentScene}
            onHotspotClick={handleHotspotClick}
            onSceneEngagement={handleSceneEngagement}
            branding={property.branding}
          />
        </div>

        {/* Side Panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Scene Thumbnails */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h3 className="font-semibold text-white mb-3">Scenes</h3>
            <div className="space-y-2">
              {property.scenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  onClick={() => setCurrentSceneIndex(idx)}
                  className={`w-full text-left rounded overflow-hidden transition-all ${
                    idx === currentSceneIndex ? "ring-2 ring-blue-500" : ""
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
                  {["facebook", "twitter", "linkedin", "email"].map((platform) => (
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
