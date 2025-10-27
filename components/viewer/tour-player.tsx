"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  FloorPlan,
  Hotspot,
  LeadCapturePayload,
  Measurement,
  Property,
  Room,
  Scene,
  SceneEngagementPayload,
  SphrHotspot,
  SphrSpaceNode,
  TourPoint,
} from "@/lib/types"
import { SceneViewer } from "./scene-viewer"
import { FloorPlanViewer } from "./floor-plan-viewer"
import { SphrViewer } from "./sphr-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Share2,
  Heart,
  PlayCircle,
  Square,
  ArrowUp,
  ArrowDown,
  Trash2,
  MapPin,
  Image,
  Navigation,
  Video,
  MousePointerClick,
  Ruler,
  Layers,
} from "@/lib/icons"
import { ZoomControls } from "./zoom-controls"

type SharePlatform = "facebook" | "twitter" | "linkedin" | "email"

const sharePlatforms: SharePlatform[] = ["facebook", "twitter", "linkedin", "email"]

const FALLBACK_MIN_ZOOM = 1
const FALLBACK_MAX_ZOOM = 3
const FALLBACK_ZOOM_STEP = 0.25
const DEFAULT_TOUR_STEP_SECONDS = 8
const CUSTOM_TOUR_ID = "custom-walkthrough"

const clampFallbackOffset = (
  zoom: number,
  offset: { x: number; y: number },
  rect: DOMRect,
) => {
  if (zoom <= 1) {
    return { x: 0, y: 0 }
  }
  const maxX = ((zoom - 1) * rect.width) / 2
  const maxY = ((zoom - 1) * rect.height) / 2
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  }
}

interface TourPlayerProps {
  property: Property
  floorPlan?: FloorPlan | null
  onLeadCapture?: (lead: LeadCapturePayload) => void
  onEngagementTrack?: (engagement: SceneEngagementPayload) => void
  experienceMode?: "vortex" | "sphr"
}

const detectWebGL2Support = () => {
  if (typeof window === "undefined") return false

  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true })

    if (!context) {
      return false
    }

    const loseContext = (context as WebGL2RenderingContext).getExtension("WEBGL_lose_context")
    loseContext?.loseContext()
    return true
  } catch (error) {
    console.warn("Unable to determine WebGL 2 support", error)
    return false
  }
}

export function TourPlayer({
  property,
  floorPlan,
  onLeadCapture,
  onEngagementTrack,
  experienceMode = "vortex",
}: TourPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" })
  const [sessionStart, setSessionStart] = useState(Date.now())
  const [isFavorite, setIsFavorite] = useState(property.isFavorite ?? false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState<string>(() => property.guidedTours?.[0]?.id ?? CUSTOM_TOUR_ID)
  const [customTourPoints, setCustomTourPoints] = useState<TourPoint[]>([])
  const [isTourPlaying, setIsTourPlaying] = useState(false)
  const [activeTourIndex, setActiveTourIndex] = useState(0)
  const [pendingOrientation, setPendingOrientation] = useState<{
    sceneId: string
    yaw: number
    pitch: number
    key: number
  } | null>(null)
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null)
  const [fallbackZoom, setFallbackZoom] = useState(1)
  const [fallbackOffset, setFallbackOffset] = useState({ x: 0, y: 0 })
  const [isFallbackDragging, setIsFallbackDragging] = useState(false)
  const fallbackPointerStartRef = useRef({ x: 0, y: 0 })
  const fallbackOffsetStartRef = useRef({ x: 0, y: 0 })
  const fallbackPointerIdRef = useRef<number | null>(null)
  const fallbackBoundsRef = useRef<DOMRect | null>(null)
  const fallbackContainerRef = useRef<HTMLDivElement | null>(null)
  const fallbackOffsetRef = useRef({ x: 0, y: 0 })
  const deriveMeasurementDefaults = useCallback((scenes: Scene[]) => {
    const initial: Record<string, Measurement[]> = {}
    for (const scene of scenes) {
      initial[scene.id] = scene.measurements ? [...scene.measurements] : []
    }
    return initial
  }, [])
  const deriveLayerDefaults = useCallback(
    (scene: Scene) =>
      scene.dataLayers?.filter((layer) => layer.defaultVisible !== false).map((layer) => layer.id) ?? [],
    [],
  )
  const [measurementMode, setMeasurementMode] = useState(false)
  const [measurementsByScene, setMeasurementsByScene] = useState<Record<string, Measurement[]>>(() =>
    deriveMeasurementDefaults(property.scenes),
  )
  const [visibleDataLayersByScene, setVisibleDataLayersByScene] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    property.scenes.forEach((scene) => {
      initial[scene.id] = deriveLayerDefaults(scene)
    })
    return initial
  })
  const [is3DEnabled, setIs3DEnabled] = useState(false)
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean | null>(null)
  const showSphrViewer = experienceMode === "sphr" && Boolean(property.sphrSpace)
  const sceneEngagement = useRef<Record<string, number>>({})
  const tourTimeoutRef = useRef<number | null>(null)
  const sphrActiveNodeRef = useRef<string | null>(null)
  const sphrNodeStartRef = useRef<number>(Date.now())
  const stopTourTimer = useCallback(() => {
    if (tourTimeoutRef.current) {
      window.clearTimeout(tourTimeoutRef.current)
      tourTimeoutRef.current = null
    }
  }, [])
  const guidedTours = property.guidedTours ?? []

  useEffect(() => {
    setShowFloorPlan(false)
    setCurrentSceneIndex(0)
    setSessionStart(Date.now())
    setIsFavorite(property.isFavorite ?? false)
    setShowShareMenu(false)
    sceneEngagement.current = {}
    sphrActiveNodeRef.current = null
    sphrNodeStartRef.current = Date.now()
    setCustomTourPoints([])
    setIsTourPlaying(false)
    setActiveTourIndex(0)
    setPendingOrientation(null)
    setActiveHotspot(null)
    setSelectedTourId(property.guidedTours?.[0]?.id ?? CUSTOM_TOUR_ID)
    stopTourTimer()
  }, [property.id, property.isFavorite, stopTourTimer])

  useEffect(() => () => flushSphrDwell(), [flushSphrDwell])

  useEffect(() => {
    if (!showSphrViewer) {
      flushSphrDwell()
    }
  }, [flushSphrDwell, showSphrViewer])

  useEffect(() => {
    setMeasurementsByScene(deriveMeasurementDefaults(property.scenes))
    setVisibleDataLayersByScene(() => {
      const initial: Record<string, string[]> = {}
      property.scenes.forEach((scene) => {
        initial[scene.id] = deriveLayerDefaults(scene)
      })
      return initial
    })
    setMeasurementMode(false)
  }, [property.id, property.scenes, deriveMeasurementDefaults, deriveLayerDefaults])

  useEffect(() => {
    const supported = detectWebGL2Support()
    setIsWebGLSupported(supported)
    setIs3DEnabled(supported)
  }, [])

  useEffect(() => {
    if (!isTraditional3DViewerActive) {
      setMeasurementMode(false)
      stopTourTimer()
      setIsTourPlaying(false)
    }
  }, [isTraditional3DViewerActive, stopTourTimer])
  useEffect(() => {
    fallbackOffsetRef.current = fallbackOffset
  }, [fallbackOffset])

  const currentScene = property.scenes[currentSceneIndex]
  const isTraditional3DViewerActive = !showSphrViewer && is3DEnabled

  useEffect(() => {
    setFallbackZoom(1)
    setFallbackOffset({ x: 0, y: 0 })
    setIsFallbackDragging(false)
    fallbackPointerIdRef.current = null
    fallbackBoundsRef.current = null
  }, [isTraditional3DViewerActive, currentScene.id])

  useEffect(() => {
    const container = fallbackContainerRef.current
    if (!container) {
      return
    }
    if (fallbackZoom <= 1) {
      setFallbackOffset((prev) => {
        if (prev.x === 0 && prev.y === 0) {
          return prev
        }
        return { x: 0, y: 0 }
      })
      return
    }

    const rect = container.getBoundingClientRect()
    setFallbackOffset((prev) => {
      const clamped = clampFallbackOffset(fallbackZoom, prev, rect)
      if (clamped.x === prev.x && clamped.y === prev.y) {
        return prev
      }
      return clamped
    })
  }, [fallbackZoom])
  const mediaHotspots = useMemo(
    () =>
      currentScene.hotspots.filter((hotspot) => ["video", "audio", "image"].includes(hotspot.type)),
    [currentScene.hotspots],
  )
  const selectedGuidedTour = useMemo(
    () => guidedTours.find((tour) => tour.id === selectedTourId),
    [guidedTours, selectedTourId],
  )
  const isCustomTourSelected = selectedTourId === CUSTOM_TOUR_ID
  const tourPoints = useMemo(
    () => (isCustomTourSelected ? customTourPoints : selectedGuidedTour?.stops ?? []),
    [customTourPoints, isCustomTourSelected, selectedGuidedTour],
  )
  const computedTourDuration = useMemo(() => {
    if (!tourPoints.length) return null
    if (selectedGuidedTour?.estimatedDurationMinutes) {
      return `${selectedGuidedTour.estimatedDurationMinutes} min`
    }
    const totalSeconds = tourPoints.reduce(
      (total, point) => total + (point.durationSeconds ?? DEFAULT_TOUR_STEP_SECONDS),
      0,
    )
    if (totalSeconds < 60) {
      return `${Math.round(totalSeconds)} sec`
    }
    return `${(totalSeconds / 60).toFixed(1)} min`
  }, [selectedGuidedTour, tourPoints])
  const hasNextScene = currentSceneIndex < property.scenes.length - 1
  const hasPreviousScene = currentSceneIndex > 0
  const walkthroughMeta = useMemo(
    () => ({
      currentSceneIndex,
      totalScenes: property.scenes.length,
      hasNextScene,
      hasPreviousScene,
      nextSceneName: hasNextScene ? property.scenes[currentSceneIndex + 1]?.name : undefined,
      previousSceneName: hasPreviousScene ? property.scenes[currentSceneIndex - 1]?.name : undefined,
    }),
    [currentSceneIndex, hasNextScene, hasPreviousScene, property.scenes],
  )
  const sceneViewPoints = useMemo(
    () => tourPoints.filter((point) => point.sceneId === currentScene.id),
    [currentScene.id, tourPoints],
  )
  const activeDataLayers = useMemo(
    () => visibleDataLayersByScene[currentScene.id] ?? deriveLayerDefaults(currentScene),
    [visibleDataLayersByScene, currentScene, deriveLayerDefaults],
  )
  const currentMeasurements = useMemo(
    () => measurementsByScene[currentScene.id] ?? [],
    [measurementsByScene, currentScene.id],
  )
  const recentMeasurements = useMemo(
    () => currentMeasurements.slice(-5).reverse(),
    [currentMeasurements],
  )

  const showFallbackZoom = !showSphrViewer && !is3DEnabled && Boolean(currentScene.imageUrl || currentScene.thumbnail)
  const fallbackZoomDisplay = useMemo(() => fallbackZoom.toFixed(1), [fallbackZoom])
  const fallbackAtMinZoom = fallbackZoom <= FALLBACK_MIN_ZOOM + 0.001
  const fallbackAtMaxZoom = fallbackZoom >= FALLBACK_MAX_ZOOM - 0.001
  const fallbackAtDefaultZoom = Math.abs(fallbackZoom - 1) < 0.001
  const fallbackCursorClass = showFallbackZoom
    ? fallbackZoom > 1
      ? isFallbackDragging
        ? "cursor-grabbing"
        : "cursor-grab"
      : "cursor-zoom-in"
    : "cursor-default"

  const adjustFallbackZoom = useCallback((delta: number) => {
    setFallbackZoom((prev) => {
      const next = Math.min(FALLBACK_MAX_ZOOM, Math.max(FALLBACK_MIN_ZOOM, prev + delta))
      return Math.round(next * 100) / 100
    })
  }, [])

  const handleFallbackZoomIn = useCallback(() => adjustFallbackZoom(FALLBACK_ZOOM_STEP), [adjustFallbackZoom])
  const handleFallbackZoomOut = useCallback(() => adjustFallbackZoom(-FALLBACK_ZOOM_STEP), [adjustFallbackZoom])
  const handleFallbackZoomReset = useCallback(() => {
    setFallbackZoom(1)
    setFallbackOffset({ x: 0, y: 0 })
  }, [])

  const handleFallbackWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!showFallbackZoom) {
        return
      }
      event.preventDefault()
      if (event.deltaY < 0) {
        adjustFallbackZoom(FALLBACK_ZOOM_STEP)
      } else if (event.deltaY > 0) {
        adjustFallbackZoom(-FALLBACK_ZOOM_STEP)
      }
    },
    [adjustFallbackZoom, showFallbackZoom],
  )

  const finishFallbackDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (fallbackPointerIdRef.current !== event.pointerId) {
      return
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    fallbackPointerIdRef.current = null
    fallbackBoundsRef.current = null
    setIsFallbackDragging(false)
  }, [])

  const handleFallbackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!showFallbackZoom || fallbackZoom <= 1) {
        return
      }
      setIsFallbackDragging(true)
      fallbackPointerStartRef.current = { x: event.clientX, y: event.clientY }
      fallbackOffsetStartRef.current = fallbackOffsetRef.current
      fallbackPointerIdRef.current = event.pointerId
      fallbackBoundsRef.current = event.currentTarget.getBoundingClientRect()
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [fallbackZoom, showFallbackZoom],
  )

  const handleFallbackPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!showFallbackZoom || !isFallbackDragging || fallbackPointerIdRef.current !== event.pointerId) {
        return
      }

      const bounds = fallbackBoundsRef.current ?? event.currentTarget.getBoundingClientRect()
      const deltaX = event.clientX - fallbackPointerStartRef.current.x
      const deltaY = event.clientY - fallbackPointerStartRef.current.y
      const nextOffset = clampFallbackOffset(
        fallbackZoom,
        {
          x: fallbackOffsetStartRef.current.x + deltaX,
          y: fallbackOffsetStartRef.current.y + deltaY,
        },
        bounds,
      )

      setFallbackOffset((prev) => {
        if (prev.x === nextOffset.x && prev.y === nextOffset.y) {
          return prev
        }
        return nextOffset
      })
    },
    [fallbackZoom, isFallbackDragging, showFallbackZoom],
  )

  const handleFallbackPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!showFallbackZoom) {
        return
      }
      finishFallbackDrag(event)
    },
    [finishFallbackDrag, showFallbackZoom],
  )

  const handleFallbackPointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!showFallbackZoom) {
        return
      }
      finishFallbackDrag(event)
    },
    [finishFallbackDrag, showFallbackZoom],
  )

  useEffect(() => {
    setMeasurementsByScene((prev) => {
      if (prev[currentScene.id]) {
        return prev
      }
      return {
        ...prev,
        [currentScene.id]: currentScene.measurements ? [...currentScene.measurements] : [],
      }
    })
    setVisibleDataLayersByScene((prev) => {
      if (prev[currentScene.id]) {
        return prev
      }
      return { ...prev, [currentScene.id]: deriveLayerDefaults(currentScene) }
    })
    setMeasurementMode(false)
  }, [currentScene, deriveLayerDefaults])

  const findSceneIndexForHotspot = useCallback(
    (hotspotId: string) =>
      property.scenes.findIndex((scene) => scene.hotspots.some((entry) => entry.id === hotspotId)),
    [property.scenes],
  )

  const getOrientationFromHotspot = useCallback((hotspot: Hotspot) => {
    const yaw = (hotspot.x / 100) * 360 - 180
    const pitch = 90 - (hotspot.y / 100) * 180
    return { yaw, pitch }
  }, [])

  const activateHotspot = useCallback(
    (hotspot: Hotspot) => {
      setActiveHotspot(hotspot)
    },
    [],
  )

  const focusHotspot = useCallback(
    (hotspot: Hotspot) => {
      const sceneIndex = findSceneIndexForHotspot(hotspot.id)
      if (sceneIndex === -1) return

      if (sceneIndex !== currentSceneIndex) {
        setCurrentSceneIndex(sceneIndex)
      }

      const targetScene = property.scenes[sceneIndex]
      const { yaw, pitch } = getOrientationFromHotspot(hotspot)

      setPendingOrientation({
        sceneId: targetScene.id,
        yaw,
        pitch,
        key: Date.now(),
      })
    },
    [currentSceneIndex, findSceneIndexForHotspot, getOrientationFromHotspot, property.scenes],
  )

  const handleMeasurementCaptured = useCallback((sceneId: string, measurement: Measurement) => {
    setMeasurementsByScene((prev) => {
      const existing = prev[sceneId] ?? []
      return {
        ...prev,
        [sceneId]: [...existing, measurement],
      }
    })
  }, [])

  const updateDataLayerVisibility = useCallback(
    (sceneId: string, layerId: string, visible: boolean) => {
      setVisibleDataLayersByScene((prev) => {
        const sceneLayers = prev[sceneId]
          ? prev[sceneId]
          : (() => {
              const match = property.scenes.find((scene) => scene.id === sceneId)
              return match ? deriveLayerDefaults(match) : []
            })()
        const hasLayer = sceneLayers.includes(layerId)
        const nextLayers = visible
          ? hasLayer
            ? sceneLayers
            : [...sceneLayers, layerId]
          : sceneLayers.filter((id) => id !== layerId)

        if (
          sceneLayers.length === nextLayers.length &&
          sceneLayers.every((id, index) => id === nextLayers[index])
        ) {
          return prev
        }

        return {
          ...prev,
          [sceneId]: nextLayers,
        }
      })
    },
    [deriveLayerDefaults, property.scenes],
  )
  const toggleMeasurementMode = useCallback((next?: boolean) => {
    if (typeof next === "boolean") {
      setMeasurementMode(next)
    } else {
      setMeasurementMode((prev) => !prev)
    }
  }, [])

  const clearMeasurementsForScene = useCallback(() => {
    setMeasurementsByScene((prev) => {
      const existing = prev[currentScene.id] ?? []
      if (existing.length === 0) {
        return prev
      }
      return { ...prev, [currentScene.id]: [] }
    })
  }, [currentScene.id])

  const handleLayerToggleFromCard = useCallback(
    (layerId: string) => {
      const isActive = activeDataLayers.includes(layerId)
      updateDataLayerVisibility(currentScene.id, layerId, !isActive)
    },
    [activeDataLayers, currentScene.id, updateDataLayerVisibility],
  )

  const activeHotspotScene = useMemo(() => {
    if (!activeHotspot) return null
    const sceneIndex = findSceneIndexForHotspot(activeHotspot.id)
    if (sceneIndex === -1) return null
    return property.scenes[sceneIndex]
  }, [activeHotspot, findSceneIndexForHotspot, property.scenes])

  useEffect(() => {
    setActiveHotspot(null)
  }, [currentScene.id])

  const handleTourPointCreate = (point: TourPoint) => {
    setCustomTourPoints((prev) => {
      const base = isCustomTourSelected
        ? prev
        : (selectedGuidedTour?.stops ?? []).map((stop, idx) => ({
            ...stop,
            id: `${stop.id}-base-${idx}`,
          }))
      const nextLabel =
        point.note && point.note.trim().length > 0 ? point.note.trim() : `Stop ${base.length + 1}`
      return [...base, { ...point, note: nextLabel }]
    })
    if (!isCustomTourSelected) {
      setSelectedTourId(CUSTOM_TOUR_ID)
    }
  }

  const handleTourPointRemove = (id: string) => {
    if (!isCustomTourSelected) return
    setCustomTourPoints((prev) => prev.filter((point) => point.id !== id))
  }

  const moveTourPoint = (index: number, direction: -1 | 1) => {
    if (!isCustomTourSelected) return
    setCustomTourPoints((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const clone = [...prev]
      const [removed] = clone.splice(index, 1)
      clone.splice(target, 0, removed)
      return clone
    })
  }

  const handleWalkthroughStep = useCallback(
    (direction: 1 | -1) => {
      setCurrentSceneIndex((prev) => {
        const nextIndex = Math.max(0, Math.min(property.scenes.length - 1, prev + direction))
        return nextIndex
      })
      setPendingOrientation(null)
    },
    [property.scenes, property.scenes.length],
  )

  const startTourAt = (index: number) => {
    if (tourPoints.length === 0) return
    const clamped = Math.max(0, Math.min(index, tourPoints.length - 1))
    setActiveTourIndex(clamped)
    setIsTourPlaying(true)
  }

  const stopGuidedTour = () => {
    setIsTourPlaying(false)
    setPendingOrientation(null)
    stopTourTimer()
  }

  const handleHotspotClick = (hotspot: Hotspot) => {
    activateHotspot(hotspot)
    if (hotspot.type === "link" && hotspot.targetSceneId) {
      const sceneIndex = property.scenes.findIndex((s) => s.id === hotspot.targetSceneId)
      if (sceneIndex !== -1) {
        setCurrentSceneIndex(sceneIndex)
      }
    } else if (hotspot.type === "cta") {
      setShowLeadForm(true)
    }
  }

  const handleHotspotMediaPreview = useCallback(
    (hotspot: Hotspot) => {
      activateHotspot(hotspot)
      if (!hotspot.mediaUrl) return
      window.open(hotspot.mediaUrl, "_blank", "noopener,noreferrer")
    },
    [activateHotspot],
  )

  useEffect(() => {
    if (!isTourPlaying) {
      stopTourTimer()
      return
    }

    const currentPoint = tourPoints[activeTourIndex]
    if (!currentPoint) {
      setIsTourPlaying(false)
      stopTourTimer()
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

    const estimatedStepSeconds = (() => {
      if (currentPoint.durationSeconds && currentPoint.durationSeconds > 0) {
        return currentPoint.durationSeconds
      }
      if (!isCustomTourSelected && selectedGuidedTour?.estimatedDurationMinutes) {
        const stops = selectedGuidedTour.stops
        if (stops.length > 0) {
          const average = (selectedGuidedTour.estimatedDurationMinutes * 60) / stops.length
          return Math.max(4, Math.min(15, average))
        }
      }
      return DEFAULT_TOUR_STEP_SECONDS
    })()

    tourTimeoutRef.current = window.setTimeout(() => {
      if (activeTourIndex >= tourPoints.length - 1) {
        setIsTourPlaying(false)
      } else {
        setActiveTourIndex((prev) => prev + 1)
      }
    }, estimatedStepSeconds * 1000)

    return () => stopTourTimer()
  }, [
    activeTourIndex,
    currentSceneIndex,
    isCustomTourSelected,
    isTourPlaying,
    property.scenes,
    selectedGuidedTour,
    stopTourTimer,
    tourPoints,
  ])

  useEffect(() => {
    if (!pendingOrientation) return
    const timeout = window.setTimeout(() => setPendingOrientation(null), 500)
    return () => window.clearTimeout(timeout)
  }, [pendingOrientation])

  useEffect(() => {
    stopTourTimer()
    setIsTourPlaying(false)
    setActiveTourIndex(0)
    setPendingOrientation(null)
  }, [selectedTourId, stopTourTimer])

  useEffect(() => {
    if (activeTourIndex >= tourPoints.length && tourPoints.length > 0) {
      setActiveTourIndex(tourPoints.length - 1)
    }
    if (tourPoints.length === 0) {
      setIsTourPlaying(false)
      stopTourTimer()
    }
  }, [activeTourIndex, stopTourTimer, tourPoints.length])

  useEffect(() => () => stopTourTimer(), [stopTourTimer])

  const handleSceneEngagement = useCallback(
    (sceneId: string, dwellTime: number) => {
      sceneEngagement.current[sceneId] = (sceneEngagement.current[sceneId] || 0) + dwellTime
      onEngagementTrack?.({
        sceneId,
        dwellTime,
        totalEngagement: sceneEngagement.current,
      })
    },
    [onEngagementTrack],
  )

  const flushSphrDwell = useCallback(() => {
    if (!sphrActiveNodeRef.current) {
      return
    }
    const dwell = (Date.now() - sphrNodeStartRef.current) / 1000
    if (dwell > 0.1) {
      handleSceneEngagement(sphrActiveNodeRef.current, dwell)
    }
    sphrActiveNodeRef.current = null
    sphrNodeStartRef.current = Date.now()
  }, [handleSceneEngagement])

  const handleSphrNodeChange = useCallback(
    (node: SphrSpaceNode) => {
      const now = Date.now()
      if (sphrActiveNodeRef.current) {
        const dwell = (now - sphrNodeStartRef.current) / 1000
        if (dwell > 0.1) {
          handleSceneEngagement(sphrActiveNodeRef.current, dwell)
        }
      }
      sphrActiveNodeRef.current = node.id
      sphrNodeStartRef.current = now
    },
    [handleSceneEngagement],
  )

  const handleSphrHotspotActivate = useCallback(
    (hotspot: SphrHotspot) => {
      const key = `hotspot:${hotspot.id}`
      sceneEngagement.current[key] = (sceneEngagement.current[key] || 0) + 1
      onEngagementTrack?.({
        sceneId: sphrActiveNodeRef.current ?? hotspot.id,
        dwellTime: 0,
        totalEngagement: sceneEngagement.current,
      })
    },
    [onEngagementTrack],
  )

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
        <div
          className="flex-1 lg:min-h-[480px] [--viewer-min-h:70vh] sm:[--viewer-min-h:75vh] md:[--viewer-min-h:80vh]"
          style={{ minHeight: "max(360px, var(--viewer-min-h, 70vh))" }}
        >
          {showSphrViewer ? (
            isWebGLSupported === false ? (
              <div className="relative h-full min-h-[55vh] sm:min-h-[65vh] md:min-h-[70vh] overflow-hidden rounded-xl border border-gray-800 bg-gray-950/60">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="max-w-md rounded-lg border border-emerald-500/40 bg-black/70 p-6 text-slate-200 shadow-lg">
                    <h2 className="text-lg font-semibold text-white">WebGL support required</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      The SPHR immersive viewer mirrors the Three.js experience from the source project and needs WebGL 2 to
                      render interactive panoramas. Try a compatible browser or fall back to the classic walkthrough mode.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <SphrViewer
                space={property.sphrSpace!}
                onNodeChange={handleSphrNodeChange}
                onHotspotActivate={handleSphrHotspotActivate}
              />
            )
          ) : isTraditional3DViewerActive ? (
            <SceneViewer
              scene={currentScene}
              onHotspotClick={handleHotspotClick}
              onMeasure={(measurement) => handleMeasurementCaptured(currentScene.id, measurement)}
              onSceneEngagement={handleSceneEngagement}
              branding={property.branding}
              dayNightImages={property.dayNightImages}
              enableVR
              enableGyroscope
              sceneTransition={property.sceneTransition ?? "fade"}
              onTourPointCreate={handleTourPointCreate}
              targetOrientation={pendingOrientation}
              availableViewModes={property.supportedViewModes}
              onWalkthroughStep={handleWalkthroughStep}
              measurementMode={measurementMode}
              onMeasurementModeChange={setMeasurementMode}
              measurementsOverride={currentMeasurements}
              activeDataLayers={activeDataLayers}
              onDataLayerToggle={(layerId, visible) =>
                updateDataLayerVisibility(currentScene.id, layerId, visible)
              }
              walkthroughMeta={walkthroughMeta}
            />
          ) : (
            <div className="relative h-full min-h-[55vh] sm:min-h-[65vh] md:min-h-[70vh] overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
              <div
                ref={fallbackContainerRef}
                className={`relative h-full w-full overflow-hidden bg-black/40 ${fallbackCursorClass}`}
                onPointerDown={handleFallbackPointerDown}
                onPointerMove={handleFallbackPointerMove}
                onPointerUp={handleFallbackPointerUp}
                onPointerLeave={handleFallbackPointerLeave}
                onPointerCancel={handleFallbackPointerLeave}
                onWheel={handleFallbackWheel}
              >
                {(currentScene.imageUrl || currentScene.thumbnail) && (
                  <img
                    src={currentScene.imageUrl || currentScene.thumbnail}
                    alt={currentScene.name}
                    className="absolute inset-0 h-full w-full select-none object-cover"
                    draggable={false}
                    style={{
                      transform: `translate(${fallbackOffset.x}px, ${fallbackOffset.y}px) scale(${fallbackZoom})`,
                      transition: isFallbackDragging ? "none" : "transform 0.2s ease-out",
                      transformOrigin: "center center",
                      willChange: "transform",
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-gray-950/40" />
              </div>
              <div className="pointer-events-none absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="max-w-md rounded-lg bg-black/60 p-5 shadow-lg">
                  <h2 className="text-lg font-semibold text-white">3D Viewer Disabled</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    {isWebGLSupported === null
                      ? "Checking your device capabilities..."
                      : isWebGLSupported
                        ? "Enable the toggle in the viewer settings to explore this space in 3D when your device is ready. Use the zoom controls below to inspect the panoramic image in the meantime."
                        : "This device does not support the WebGL 2 features required for the 3D viewer. Try switching to a compatible browser or device and use the zoom controls below to examine details."}
                  </p>
                </div>
              </div>
              {showFallbackZoom ? (
                <ZoomControls
                  className="absolute bottom-4 right-4 bg-black/70"
                  zoomDisplay={`×${fallbackZoomDisplay}`}
                  onZoomIn={handleFallbackZoomIn}
                  onZoomOut={handleFallbackZoomOut}
                  onReset={handleFallbackZoomReset}
                  disableZoomIn={fallbackAtMaxZoom}
                  disableZoomOut={fallbackAtMinZoom}
                  disableReset={fallbackAtDefaultZoom}
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">Immersive Viewer</div>
                <p className="text-xs text-gray-400">
                  Toggle the interactive 3D experience on devices that support WebGL 2 rendering. When the SPHR mode is active,
                  the classic toggle is locked to keep the immersive viewer in sync.
                </p>
                {isWebGLSupported === null && (
                  <div className="text-xs text-gray-300">Detecting device compatibility…</div>
                )}
                {isWebGLSupported === false && (
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    WebGL 2 isn&apos;t available on this device.
                  </div>
                )}
                {showSphrViewer && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Navigation className="h-4 w-4" />
                    SPHR immersive mode is active for this property.
                  </div>
                )}
              </div>
              <Switch
                checked={isTraditional3DViewerActive}
                onCheckedChange={setIs3DEnabled}
                disabled={showSphrViewer || isWebGLSupported !== true}
                aria-label="Toggle 3D viewer"
              />
            </div>
          </Card>

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

          {/* Immersive Highlights */}
          <Card className="p-4 bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Image className="w-4 h-4 text-blue-400" />
                  Panoramic Scene
                </div>
                <div className="mt-2 relative h-28 rounded-lg overflow-hidden border border-gray-800/80">
                  <img
                    src={currentScene.imageUrl || currentScene.thumbnail || "/placeholder.svg"}
                    alt={`${currentScene.name} panorama`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-[11px] text-gray-200">
                      Drag inside the viewer to explore this immersive 360° capture.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 text-white font-semibold">
                  <span className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    Smooth Navigation
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase">Scene {currentSceneIndex + 1}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(property.scenes.length - 1, 0)}
                  value={currentSceneIndex}
                  onChange={(event) => setCurrentSceneIndex(Number(event.target.value))}
                  className="w-full mt-3 accent-blue-500"
                  aria-label="Scene navigation"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {property.scenes.map((scene, idx) => (
                    <button
                      key={`scene-chip-${scene.id}`}
                      type="button"
                      onClick={() => setCurrentSceneIndex(idx)}
                      className={`px-2 py-1 rounded-full text-[11px] tracking-wide uppercase transition ${
                        idx === currentSceneIndex
                          ? "bg-blue-500/20 text-blue-200 border border-blue-500/60"
                          : "bg-gray-800/80 text-gray-300 border border-gray-800 hover:border-blue-500/40"
                      }`}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  View Points
                </div>
                {sceneViewPoints.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {sceneViewPoints.map((point) => (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => {
                          const index = property.scenes.findIndex((scene) => scene.id === point.sceneId)
                          if (index !== -1) {
                            setCurrentSceneIndex(index)
                            setPendingOrientation({
                              sceneId: point.sceneId,
                              yaw: point.yaw,
                              pitch: point.pitch,
                              key: Date.now(),
                            })
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/70 border border-gray-800 hover:border-blue-500/40 transition"
                      >
                        <p className="text-sm font-medium text-gray-100">{point.note || point.sceneName}</p>
                        <p className="text-[11px] text-gray-400">{point.sceneName}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">
                    Capture a favorite angle from this scene to create a personalized viewpoint.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Video className="w-4 h-4 text-pink-400" />
                  Multimedia Hotspots
                </div>
                {mediaHotspots.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {mediaHotspots.map((hotspot) => {
                      const isActiveHotspot = activeHotspot?.id === hotspot.id
                      return (
                        <li
                          key={hotspot.id}
                          className={`rounded-lg border px-3 py-2 transition focus-within:ring-2 focus-within:ring-blue-500/60 ${
                            isActiveHotspot
                              ? "border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                              : "border-gray-800 bg-gray-800/70"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-100">{hotspot.title}</p>
                              <p className="text-[11px] text-gray-400 capitalize">
                                {hotspot.type} hotspot
                                {isActiveHotspot ? <span className="ml-1 text-blue-300">• Active</span> : null}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => {
                                  activateHotspot(hotspot)
                                  focusHotspot(hotspot)
                                }}
                              >
                                Focus
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  focusHotspot(hotspot)
                                  handleHotspotMediaPreview(hotspot)
                                }}
                                disabled={!hotspot.mediaUrl}
                              >
                                Open
                              </Button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">
                    This scene does not have multimedia hotspots yet. Add video, audio, or gallery callouts to enrich the tour.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <MousePointerClick className="w-4 h-4 text-amber-400" />
                  Interactive Hotspot
                </div>
                <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900/70 p-3">
                  {activeHotspot ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-100">{activeHotspot.title}</p>
                        <p className="text-[11px] text-gray-400">{activeHotspot.description}</p>
                        <div className="text-[11px] text-gray-500 uppercase flex flex-wrap gap-x-2 gap-y-1">
                          <span>Type: {activeHotspot.type}</span>
                          {activeHotspotScene ? <span>Scene: {activeHotspotScene.name}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => focusHotspot(activeHotspot)}
                        >
                          Focus View
                        </Button>
                        {activeHotspot.mediaUrl && (
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              focusHotspot(activeHotspot)
                              handleHotspotMediaPreview(activeHotspot)
                            }}
                          >
                            Open Media
                          </Button>
                        )}
                        {activeHotspot.type === "link" && activeHotspot.targetSceneId ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => handleHotspotClick(activeHotspot)}
                          >
                            Go to Scene
                          </Button>
                        ) : null}
                        {activeHotspot.type === "cta" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleHotspotClick(activeHotspot)}
                          >
                            Contact Agent
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Hover or tap hotspots inside the panorama to reveal contextual details instantly.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Ruler className="w-4 h-4 text-blue-400" />
                Measurement Mode
              </div>
              <Button
                size="sm"
                variant={measurementMode ? "default" : "outline"}
                onClick={() => toggleMeasurementMode()}
                className="text-xs"
              >
                {measurementMode ? "Disable" : "Enable"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Capture accurate distances, areas, and volumes directly inside the scene to support renovation and fit-out
              planning.
            </p>
            {recentMeasurements.length > 0 ? (
              <ul className="mt-4 space-y-2 text-xs text-gray-200">
                {recentMeasurements.map((measurement) => {
                  const unitLabel =
                    measurement.measurementType === "area"
                      ? `${measurement.unit}²`
                      : measurement.measurementType === "volume"
                        ? `${measurement.unit}³`
                        : measurement.unit
                  const label =
                    measurement.measurementType === "distance"
                      ? "Distance"
                      : measurement.measurementType === "area"
                        ? "Area"
                        : "Volume"
                  return (
                    <li
                      key={measurement.id}
                      className="flex items-center justify-between rounded border border-gray-800/80 bg-gray-900/60 px-3 py-2"
                    >
                      <span className="font-medium text-white/90">{label}</span>
                      <span className="text-white">
                        {measurement.distance.toFixed(2)} {unitLabel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                No measurements captured for this scene yet. Enable measurement mode and click inside the tour to begin.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-3 text-[11px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mode: <span className="text-gray-200">{measurementMode ? "Active" : "Disabled"}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-gray-300 hover:text-white self-start sm:self-auto"
                onClick={clearMeasurementsForScene}
                disabled={recentMeasurements.length === 0}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </Card>

          {currentScene.dataLayers?.length ? (
            <Card className="p-4 bg-gray-900 border-gray-800">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Layers className="w-4 h-4 text-emerald-400" />
                Data Layers
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Toggle discipline-specific annotation layers such as electrical layouts, millwork, and interior styling.
              </p>
              <div className="mt-3 space-y-2">
                {currentScene.dataLayers.map((layer) => {
                  const isActive = activeDataLayers.includes(layer.id)
                  return (
                    <label
                      key={layer.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition ${
                        isActive
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-gray-800 bg-gray-900/60 hover:border-blue-500/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleLayerToggleFromCard(layer.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{layer.name}</p>
                        {layer.description ? (
                          <p className="text-xs text-gray-400">{layer.description}</p>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            </Card>
          ) : null}

          {/* Guided Tour */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <div className="mb-3 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-white">Guided Tours</h3>
                  <p className="text-xs text-gray-400">
                    {isCustomTourSelected
                      ? "Capture viewpoints in the viewer to script a bespoke walkthrough."
                      : "Play curated storylines crafted for this listing’s hero moments."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={selectedTourId} onValueChange={setSelectedTourId}>
                    <SelectTrigger size="sm" className="min-w-[200px] justify-between text-left">
                      <SelectValue placeholder="Choose walkthrough" />
                    </SelectTrigger>
                    <SelectContent>
                      {guidedTours.map((tour) => (
                        <SelectItem key={tour.id} value={tour.id}>
                          {tour.name}
                        </SelectItem>
                      ))}
                      {guidedTours.length > 0 && <SelectSeparator />}
                      <SelectItem value={CUSTOM_TOUR_ID}>Custom Walkthrough</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className={`gap-2 ${isTourPlaying ? "border-red-500 text-red-200 bg-red-500/10" : ""}`}
                    onClick={() => (isTourPlaying ? stopGuidedTour() : startTourAt(0))}
                    disabled={tourPoints.length === 0}
                    variant="outline"
                  >
                    {isTourPlaying ? <Square className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    {isTourPlaying ? "Stop" : "Play tour"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                {tourPoints.length > 0 ? (
                  <>
                    <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                      {tourPoints.length} {tourPoints.length === 1 ? "stop" : "stops"}
                    </span>
                    {computedTourDuration ? (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        {computedTourDuration} runtime
                      </span>
                    ) : null}
                    {selectedGuidedTour?.highlightMetrics?.totalDistanceFeet ? (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        {selectedGuidedTour.highlightMetrics.totalDistanceFeet} ft narrative path
                      </span>
                    ) : null}
                    {selectedGuidedTour?.highlightMetrics?.featuredScenes?.length ? (
                      <span className="rounded-full border border-gray-700 px-2 py-1 text-gray-300">
                        Focus: {selectedGuidedTour.highlightMetrics.featuredScenes.join(", ")}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span>
                    Save a viewpoint inside the immersive viewer to begin building your personalised walkthrough script.
                  </span>
                )}
                {!isCustomTourSelected && (
                  <span className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                    Marketing team curated demo
                  </span>
                )}
              </div>
              {selectedGuidedTour?.callouts && selectedGuidedTour.callouts.length > 0 ? (
                <ul className="ml-4 list-disc space-y-1 text-[11px] text-gray-400">
                  {selectedGuidedTour.callouts.map((callout) => (
                    <li key={callout}>{callout}</li>
                  ))}
                </ul>
              ) : null}
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
                  const editingDisabled = !isCustomTourSelected
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
                          {point.highlight ? (
                            <p className="mt-1 text-[11px] text-emerald-200/90">{point.highlight}</p>
                          ) : null}
                          {point.durationSeconds ? (
                            <p className="text-[11px] text-gray-500">
                              Spotlight duration: {point.durationSeconds}s
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 sm:flex-nowrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveTourPoint(idx, -1)}
                            disabled={editingDisabled || idx === 0}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveTourPoint(idx, 1)}
                            disabled={editingDisabled || idx === tourPoints.length - 1}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleTourPointRemove(point.id)}
                            disabled={editingDisabled}
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
            {!isCustomTourSelected && tourPoints.length > 0 ? (
              <p className="mt-3 text-[11px] text-gray-500">
                Want to tweak this flow? Tap “Save Tour Point” in the viewer to duplicate these stops into your custom
                walkthrough.
              </p>
            ) : null}
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
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
      <div className="bg-gray-900 border-t border-gray-800 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto w-full">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
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
        <div className="text-center text-sm text-gray-400 sm:text-left">
          Scene {currentSceneIndex + 1} of {property.scenes.length}
        </div>
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
              <div className="flex flex-col gap-2 sm:flex-row">
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
            <div className="flex flex-col gap-3 p-4 border-b border-gray-800 sm:flex-row sm:items-start sm:justify-between">
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-semibold text-white">{floorPlan.name}</h2>
                <p className="text-sm text-gray-400">Tap rooms to jump directly into their scenes.</p>
              </div>
              <Button variant="outline" onClick={() => setShowFloorPlan(false)} className="self-center sm:self-auto">
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
