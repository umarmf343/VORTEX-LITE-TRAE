"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { Scene, Hotspot, Measurement, Annotation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Ruler, MessageSquare, Play, Pause, Volume2, ImageIcon, Sun, Moon, Maximize2, Layers } from "lucide-react"

interface SceneViewerProps {
  scene: Scene
  onHotspotClick?: (hotspot: Hotspot) => void
  onMeasure?: (measurement: Measurement) => void
  onSceneEngagement?: (sceneId: string, dwellTime: number) => void
  branding: any
  dayNightImages?: { day: string; night: string }
  enableVR?: boolean
  enableGyroscope?: boolean
  backgroundAudio?: string
  sceneTransition?: "fade" | "slide"
}

export function SceneViewer({
  scene,
  onHotspotClick,
  onMeasure,
  onSceneEngagement,
  branding,
  dayNightImages,
  enableVR,
  enableGyroscope,
  backgroundAudio,
  sceneTransition = "fade",
}: SceneViewerProps) {
  const [measuring, setMeasuring] = useState(false)
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>(scene.measurements)
  const [annotations, setAnnotations] = useState<Annotation[]>(scene.annotations)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [mediaModal, setMediaModal] = useState<{ type: string; url: string } | null>(null)
  const [dayNightMode, setDayNightMode] = useState<"day" | "night">("day")
  const [vrMode, setVrMode] = useState(false)
  const [measurementType, setMeasurementType] = useState<"distance" | "area" | "volume">("distance")
  const [annotationText, setAnnotationText] = useState("")
  const [showAnnotationInput, setShowAnnotationInput] = useState(false)
  const [annotationColor, setAnnotationColor] = useState("#ff0000")
  const [audioVolume, setAudioVolume] = useState(0.5)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [areaPoints, setAreaPoints] = useState<Array<{ x: number; y: number }>>([])
  const [showViewModes, setShowViewModes] = useState(false)
  const [currentViewMode, setCurrentViewMode] = useState<"360" | "first-person" | "dollhouse" | "floor-plan">("360")
  const [volumePoints, setVolumePoints] = useState<Array<{ x: number; y: number; z: number }>>([])
  const [transitionEffect, setTransitionEffect] = useState<"fade" | "slide">(sceneTransition)
  const imageRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const sceneStartTime = useRef(Date.now())

  useEffect(() => {
    if (!enableGyroscope || !vrMode) return

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha || 0
      setRotation(alpha)
    }

    window.addEventListener("deviceorientation", handleDeviceOrientation)
    return () => window.removeEventListener("deviceorientation", handleDeviceOrientation)
  }, [enableGyroscope, vrMode])

  useEffect(() => {
    if (!autoRotate) return
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [autoRotate])

  useEffect(() => {
    if (audioRef.current && backgroundAudio) {
      audioRef.current.volume = audioVolume
      audioRef.current.play().catch(() => {})
    }
  }, [backgroundAudio, audioVolume])

  useEffect(() => {
    return () => {
      const dwellTime = (Date.now() - sceneStartTime.current) / 1000
      onSceneEngagement?.(scene.id, dwellTime)
    }
  }, [scene.id, onSceneEngagement])

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (measuring) {
      if (measurementType === "distance") {
        if (!measureStart) {
          setMeasureStart({ x, y })
        } else {
          const distance = Math.sqrt(Math.pow(x - measureStart.x, 2) + Math.pow(y - measureStart.y, 2))
          const newMeasurement: Measurement = {
            id: `measure-${Date.now()}`,
            startX: measureStart.x,
            startY: measureStart.y,
            endX: x,
            endY: y,
            distance: Number.parseFloat((distance * 10).toFixed(2)),
            unit: "ft",
          }
          setMeasurements([...measurements, newMeasurement])
          setMeasureStart(null)
          onMeasure?.(newMeasurement)
        }
      } else if (measurementType === "area") {
        const newPoints = [...areaPoints, { x, y }]
        setAreaPoints(newPoints)
        if (newPoints.length >= 3) {
          const area = calculatePolygonArea(newPoints)
          const newMeasurement: Measurement = {
            id: `measure-${Date.now()}`,
            startX: newPoints[0].x,
            startY: newPoints[0].y,
            endX: newPoints[newPoints.length - 1].x,
            endY: newPoints[newPoints.length - 1].y,
            distance: area,
            unit: "ft",
          }
          setMeasurements([...measurements, newMeasurement])
          setAreaPoints([])
          onMeasure?.(newMeasurement)
        }
      } else if (measurementType === "volume") {
        const newPoints = [...volumePoints, { x, y, z: Math.random() * 100 }]
        setVolumePoints(newPoints)
        if (newPoints.length >= 4) {
          const volume = calculateVolume(newPoints)
          const newMeasurement: Measurement = {
            id: `measure-${Date.now()}`,
            startX: newPoints[0].x,
            startY: newPoints[0].y,
            endX: newPoints[newPoints.length - 1].x,
            endY: newPoints[newPoints.length - 1].y,
            distance: volume,
            unit: "ft",
          }
          setMeasurements([...measurements, newMeasurement])
          setVolumePoints([])
          onMeasure?.(newMeasurement)
        }
      }
    } else if (showAnnotationInput) {
      if (annotationText.trim()) {
        const newAnnotation: Annotation = {
          id: `annotation-${Date.now()}`,
          x,
          y,
          text: annotationText,
          color: annotationColor,
        }
        setAnnotations([...annotations, newAnnotation])
        setAnnotationText("")
        setShowAnnotationInput(false)
      }
    }
  }

  const calculatePolygonArea = (points: Array<{ x: number; y: number }>) => {
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    return Math.abs(area / 2) * 10
  }

  const calculateVolume = (points: Array<{ x: number; y: number; z: number }>) => {
    if (points.length < 4) return 0
    const baseArea = calculatePolygonArea(points.map((p) => ({ x: p.x, y: p.y })))
    const avgHeight = points.reduce((sum, p) => sum + p.z, 0) / points.length
    return baseArea * avgHeight
  }

  const handleHotspotClick = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot)
    if (hotspot.type === "video" || hotspot.type === "audio" || hotspot.type === "image") {
      setMediaModal({ type: hotspot.type, url: hotspot.mediaUrl || "" })
    }
    onHotspotClick?.(hotspot)
  }

  const currentImageUrl = dayNightMode === "night" && dayNightImages?.night ? dayNightImages.night : scene.imageUrl

  const handleFullscreen = () => {
    if (imageRef.current) {
      if (!isFullscreen) {
        imageRef.current.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  const renderViewMode = () => {
    if (currentViewMode === "first-person") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <img src={currentImageUrl || "/placeholder.svg"} alt={scene.name} className="w-full h-full object-cover" />
        </div>
      )
    } else if (currentViewMode === "dollhouse") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 perspective">
          <div style={{ transform: "rotateX(45deg) rotateZ(45deg)", transformStyle: "preserve-3d" }}>
            <img
              src={currentImageUrl || "/placeholder.svg"}
              alt={scene.name}
              className="w-96 h-96 object-cover rounded shadow-2xl"
            />
          </div>
        </div>
      )
    } else if (currentViewMode === "floor-plan") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Floor Plan View</p>
            <img src={currentImageUrl || "/placeholder.svg"} alt={scene.name} className="max-w-full max-h-full" />
          </div>
        </div>
      )
    }
    return <img src={currentImageUrl || "/placeholder.svg"} alt={scene.name} className="w-full h-full object-cover" />
  }

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Viewer */}
      <div
        ref={imageRef}
        className={`flex-1 relative overflow-hidden cursor-crosshair ${vrMode ? "flex" : ""}`}
        onClick={handleImageClick}
        style={{
          transform: autoRotate || vrMode ? `rotateY(${rotation}deg)` : "none",
          transition: transitionEffect === "fade" ? "opacity 0.5s ease-in-out" : "transform 0.5s ease-in-out",
        }}
      >
        {vrMode ? (
          <div className="flex w-full h-full">
            <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
            <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
          </div>
        ) : (
          renderViewMode()
        )}

        {/* Hotspots */}
        {scene.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            className="absolute w-8 h-8 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-125 flex items-center justify-center"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              backgroundColor: branding.primaryColor,
              opacity: 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleHotspotClick(hotspot)
            }}
            title={hotspot.title}
          >
            {hotspot.type === "video" && <Play className="w-4 h-4 text-white" />}
            {hotspot.type === "audio" && <Volume2 className="w-4 h-4 text-white" />}
            {hotspot.type === "image" && <ImageIcon className="w-4 h-4 text-white" />}
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ backgroundColor: branding.primaryColor, opacity: 0.3 }}
            />
          </button>
        ))}

        {/* Measurement Lines */}
        {measurements.map((m) => (
          <svg key={m.id} className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={`${m.startX}%`}
              y1={`${m.startY}%`}
              x2={`${m.endX}%`}
              y2={`${m.endY}%`}
              stroke={branding.secondaryColor}
              strokeWidth="2"
            />
            <circle cx={`${m.startX}%`} cy={`${m.startY}%`} r="4" fill={branding.secondaryColor} />
            <circle cx={`${m.endX}%`} cy={`${m.endY}%`} r="4" fill={branding.secondaryColor} />
            <text
              x={`${(m.startX + m.endX) / 2}%`}
              y={`${(m.startY + m.endY) / 2 - 5}%`}
              fill={branding.secondaryColor}
              fontSize="12"
              textAnchor="middle"
            >
              {m.distance.toFixed(1)} {m.unit}
            </text>
          </svg>
        ))}

        {/* Area Measurement Points */}
        {areaPoints.map((point, idx) => (
          <div
            key={idx}
            className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              backgroundColor: branding.secondaryColor,
            }}
          />
        ))}

        {/* Volume Measurement Points */}
        {volumePoints.map((point, idx) => (
          <div
            key={`vol-${idx}`}
            className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              borderColor: branding.secondaryColor,
              backgroundColor: "transparent",
            }}
          />
        ))}

        {/* Annotations */}
        {showAnnotations &&
          annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded bg-black/70 text-white text-xs max-w-xs"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                borderLeft: `3px solid ${annotation.color}`,
              }}
            >
              {annotation.text}
            </div>
          ))}

        {/* Annotation Input */}
        {showAnnotationInput && (
          <div className="absolute top-4 left-4 bg-gray-900 p-3 rounded shadow-lg z-20">
            <input
              type="text"
              placeholder="Add annotation..."
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              className="px-2 py-1 bg-gray-800 text-white rounded text-sm mb-2 w-full"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="color"
                value={annotationColor}
                onChange={(e) => setAnnotationColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Button size="sm" onClick={() => setShowAnnotationInput(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-800 p-4 flex gap-2 items-center justify-between overflow-x-auto flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={measuring ? "default" : "outline"}
            onClick={() => {
              setMeasuring(!measuring)
              setMeasureStart(null)
              setAreaPoints([])
              setVolumePoints([])
            }}
            className="gap-2"
          >
            <Ruler className="w-4 h-4" />
            Measure
          </Button>
          {measuring && (
            <select
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value as any)}
              className="px-2 py-1 bg-gray-800 text-white rounded text-sm border border-gray-700"
            >
              <option value="distance">Distance</option>
              <option value="area">Area</option>
              <option value="volume">Volume</option>
            </select>
          )}
          <Button
            size="sm"
            variant={autoRotate ? "default" : "outline"}
            onClick={() => setAutoRotate(!autoRotate)}
            className="gap-2"
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            Auto-Rotate
          </Button>
          <Button
            size="sm"
            variant={showAnnotations ? "default" : "outline"}
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Annotations
          </Button>
          <Button
            size="sm"
            variant={showAnnotationInput ? "default" : "outline"}
            onClick={() => setShowAnnotationInput(!showAnnotationInput)}
            className="gap-2"
          >
            Add Note
          </Button>
          {dayNightImages && (
            <Button
              size="sm"
              variant={dayNightMode === "night" ? "default" : "outline"}
              onClick={() => setDayNightMode(dayNightMode === "day" ? "night" : "day")}
              className="gap-2"
            >
              {dayNightMode === "day" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {dayNightMode === "day" ? "Night" : "Day"}
            </Button>
          )}
          {enableVR && (
            <Button
              size="sm"
              variant={vrMode ? "default" : "outline"}
              onClick={() => setVrMode(!vrMode)}
              className="gap-2"
            >
              VR Mode
            </Button>
          )}
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowViewModes(!showViewModes)} className="gap-2">
              <Layers className="w-4 h-4" />
              View Mode
            </Button>
            {showViewModes && (
              <div className="absolute top-10 left-0 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                {["360", "first-person", "dollhouse", "floor-plan"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setCurrentViewMode(mode as any)
                      setShowViewModes(false)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 text-sm capitalize ${
                      currentViewMode === mode ? "bg-gray-700 text-blue-400" : "text-gray-300"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleFullscreen} className="gap-2 bg-transparent">
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </Button>
        </div>
        <div className="text-sm text-gray-400">
          {measurements.length} measurements • {annotations.length} notes
        </div>
      </div>

      {/* Background Audio */}
      {backgroundAudio && <audio ref={audioRef} src={backgroundAudio} loop className="hidden" />}

      {/* Media Modal */}
      {mediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{selectedHotspot?.title}</h3>
              <button
                onClick={() => {
                  setMediaModal(null)
                  setSelectedHotspot(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {mediaModal.type === "video" && (
              <iframe
                width="100%"
                height="400"
                src={mediaModal.url}
                title="Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {mediaModal.type === "audio" && (
              <audio controls className="w-full">
                <source src={mediaModal.url} type="audio/mpeg" />
              </audio>
            )}
            {mediaModal.type === "image" && (
              <img src={mediaModal.url || "/placeholder.svg"} alt="Hotspot" className="w-full rounded" />
            )}
            <p className="text-gray-300 mt-4">{selectedHotspot?.description}</p>
          </div>
        </div>
      )}
    </div>
  )
}
