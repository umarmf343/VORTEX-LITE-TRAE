"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import type { Annotation, BrandingConfig, Hotspot, Measurement, Scene } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Ruler, MessageSquare, Play, Pause, Volume2, ImageIcon, Sun, Moon, Maximize2, Layers } from "lucide-react"
import "photo-sphere-viewer/dist/photo-sphere-viewer.css"
import "photo-sphere-viewer/dist/plugins/markers.css"
import type { ClickData } from "photo-sphere-viewer"
import type { MarkerProperties } from "photo-sphere-viewer/dist/plugins/markers"

const measurementModes = ["distance", "area", "volume"] as const
type MeasurementMode = (typeof measurementModes)[number]

const viewModes = ["360", "first-person", "dollhouse", "floor-plan"] as const
type SceneViewMode = (typeof viewModes)[number]

const HOTSPOT_ICON_MAP: Record<Hotspot["type"], string> = {
  info: "i",
  link: "⇨",
  cta: "★",
  video: "▶",
  audio: "♪",
  image: "🖼",
}

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value))

const percentageToSpherical = (x: number, y: number) => {
  const longitude = (clampPercentage(x) / 100) * Math.PI * 2 - Math.PI
  const latitude = Math.PI / 2 - (clampPercentage(y) / 100) * Math.PI
  return { longitude, latitude }
}

const sphericalToPercentage = (longitude: number, latitude: number) => {
  const x = ((longitude + Math.PI) / (Math.PI * 2)) * 100
  const y = ((Math.PI / 2 - latitude) / Math.PI) * 100
  return { x: clampPercentage(x), y: clampPercentage(y) }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[char] || char
  })

interface SceneViewerProps {
  scene: Scene
  onHotspotClick?: (hotspot: Hotspot) => void
  onMeasure?: (measurement: Measurement) => void
  onSceneEngagement?: (sceneId: string, dwellTime: number) => void
  branding: BrandingConfig
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
  const [measurementType, setMeasurementType] = useState<MeasurementMode>("distance")
  const [annotationText, setAnnotationText] = useState("")
  const [showAnnotationInput, setShowAnnotationInput] = useState(false)
  const [annotationColor, setAnnotationColor] = useState("#ff0000")
  const [audioVolume, setAudioVolume] = useState(0.5)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [areaPoints, setAreaPoints] = useState<Array<{ x: number; y: number }>>([])
  const [showViewModes, setShowViewModes] = useState(false)
  const [currentViewMode, setCurrentViewMode] = useState<SceneViewMode>("360")
  const [volumePoints, setVolumePoints] = useState<Array<{ x: number; y: number; z: number }>>([])
  const [transitionEffect, setTransitionEffect] = useState<"fade" | "slide">(sceneTransition)
  const imageRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const markersPluginRef = useRef<any>(null)
  const stereoPluginRef = useRef<any>(null)
  const gyroscopePluginRef = useRef<any>(null)
  const markersPluginClassRef = useRef<any>(null)
  const stereoPluginClassRef = useRef<any>(null)
  const gyroscopePluginClassRef = useRef<any>(null)
  const sceneStartTime = useRef(Date.now())

  const is360View = currentViewMode === "360"

  const currentImageUrl = useMemo(() => {
    if (dayNightMode === "night" && dayNightImages?.night) {
      return dayNightImages.night
    }
    if (dayNightMode === "day" && dayNightImages?.day) {
      return dayNightImages.day
    }
    return scene.imageUrl
  }, [dayNightMode, dayNightImages, scene.imageUrl])

  useEffect(() => {
    setMeasurements(scene.measurements)
    setAnnotations(scene.annotations)
    setMeasureStart(null)
    setAreaPoints([])
    setVolumePoints([])
    setShowAnnotationInput(false)
    setAnnotationText("")
    sceneStartTime.current = Date.now()
  }, [scene.id])

  useEffect(() => {
    if (!enableGyroscope || !vrMode || is360View) return

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha || 0
      setRotation(alpha)
    }

    window.addEventListener("deviceorientation", handleDeviceOrientation)
    return () => window.removeEventListener("deviceorientation", handleDeviceOrientation)
  }, [enableGyroscope, vrMode, is360View])

  useEffect(() => {
    if (!autoRotate || is360View) return
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [autoRotate, is360View])

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

  useEffect(() => {
    if (!is360View) {
      viewerRef.current?.destroy?.()
      viewerRef.current = null
      markersPluginRef.current = null
      stereoPluginRef.current = null
      gyroscopePluginRef.current = null
      return
    }

    let isCancelled = false

    const initViewer = async () => {
      try {
        const [{ Viewer }, markersModule, stereoModule, gyroscopeModule] = await Promise.all([
          import("photo-sphere-viewer"),
          import("photo-sphere-viewer/dist/plugins/markers"),
          import("photo-sphere-viewer/dist/plugins/stereo"),
          enableGyroscope ? import("photo-sphere-viewer/dist/plugins/gyroscope") : Promise.resolve(null),
        ])

        if (!viewerContainerRef.current || isCancelled) {
          return
        }

        viewerRef.current?.destroy?.()

        const plugins: Array<[any, any?]> = [
          [markersModule.MarkersPlugin, { markers: [] }],
          [stereoModule.StereoPlugin],
        ]

        markersPluginClassRef.current = markersModule.MarkersPlugin
        stereoPluginClassRef.current = stereoModule.StereoPlugin

        if (enableGyroscope && gyroscopeModule) {
          plugins.push([gyroscopeModule.GyroscopePlugin, { moveMode: "smooth" }])
          gyroscopePluginClassRef.current = gyroscopeModule.GyroscopePlugin
        } else {
          gyroscopePluginClassRef.current = null
        }

        const viewer = new Viewer({
          container: viewerContainerRef.current,
          panorama: scene.imageUrl || "/placeholder.svg",
          mousewheelCtrlKey: true,
          touchmoveTwoFingers: true,
          navbar: ["zoom", "move", "fullscreen"],
          plugins,
        })

        viewerRef.current = viewer
        markersPluginRef.current = markersPluginClassRef.current ? viewer.getPlugin(markersPluginClassRef.current) : null
        stereoPluginRef.current = stereoPluginClassRef.current ? viewer.getPlugin(stereoPluginClassRef.current) : null
        gyroscopePluginRef.current =
          enableGyroscope && gyroscopePluginClassRef.current ? viewer.getPlugin(gyroscopePluginClassRef.current) : null
      } catch {
        viewerRef.current = null
        markersPluginRef.current = null
        stereoPluginRef.current = null
        gyroscopePluginRef.current = null
      }
    }

    initViewer()

    return () => {
      isCancelled = true
      viewerRef.current?.destroy?.()
      viewerRef.current = null
      markersPluginRef.current = null
      stereoPluginRef.current = null
      gyroscopePluginRef.current = null
    }
  }, [is360View, scene.id, scene.imageUrl, enableGyroscope])

  useEffect(() => {
    if (!is360View) return
    const viewer = viewerRef.current
    if (!viewer) return

    viewer
      .setPanorama(currentImageUrl || "/placeholder.svg", {
        transition: transitionEffect === "fade",
      })
      .catch(() => {})
  }, [currentImageUrl, is360View, transitionEffect])

  useEffect(() => {
    if (!is360View) return
    const viewer = viewerRef.current
    if (!viewer) return

    if (autoRotate) {
      viewer.startAutorotate()
    } else {
      viewer.stopAutorotate()
    }

    return () => {
      viewer.stopAutorotate()
    }
  }, [autoRotate, is360View])

  useEffect(() => {
    if (!is360View) return
    const stereoPlugin = stereoPluginRef.current
    if (!stereoPlugin) return

    if (vrMode) {
      Promise.resolve(stereoPlugin.start?.()).catch(() => {})
    } else {
      stereoPlugin.stop?.()
    }
  }, [vrMode, is360View])

  useEffect(() => {
    if (!is360View) return
    const gyroscopePlugin = gyroscopePluginRef.current
    if (!gyroscopePlugin) return

    if (enableGyroscope && vrMode) {
      Promise.resolve(gyroscopePlugin.start?.()).catch(() => {})
    } else {
      gyroscopePlugin.stop?.()
    }
  }, [enableGyroscope, vrMode, is360View])

  useEffect(() => {
    if (!is360View) return
    const viewer = viewerRef.current
    if (!viewer) return

    const handleViewerInteraction = (_event: unknown, data: ClickData) => {
      if (!data) return
      const { x, y } = sphericalToPercentage(data.longitude, data.latitude)
      if (measuring) {
        applyMeasurementPoint(x, y)
      } else if (showAnnotationInput) {
        applyAnnotationPoint(x, y)
      }
    }

    viewer.on("click", handleViewerInteraction)
    return () => {
      viewer.off?.("click", handleViewerInteraction)
    }
  }, [is360View, measuring, showAnnotationInput, applyMeasurementPoint, applyAnnotationPoint])

  useEffect(() => {
    if (!is360View) return
    const markersPlugin = markersPluginRef.current
    if (!markersPlugin) return

    const markers: MarkerProperties[] = []

    scene.hotspots.forEach((hotspot) => {
      const { longitude, latitude } = percentageToSpherical(hotspot.x, hotspot.y)
      const icon = escapeHtml(HOTSPOT_ICON_MAP[hotspot.type] ?? "•")
      markers.push({
        id: `hotspot-${hotspot.id}`,
        longitude,
        latitude,
        html: `<div class="psv-custom-hotspot" style="background:${branding.primaryColor}"><span class="psv-custom-hotspot-icon">${icon}</span></div>`,
        anchor: "center",
        tooltip: hotspot.title,
        data: { type: "hotspot", hotspot },
      })
    })

    if (showAnnotations) {
      annotations.forEach((annotation) => {
        const { longitude, latitude } = percentageToSpherical(annotation.x, annotation.y)
        markers.push({
          id: `annotation-${annotation.id}`,
          longitude,
          latitude,
          html: `<div class="psv-annotation-marker" style="border-left-color:${annotation.color}">${escapeHtml(annotation.text)}</div>`,
          anchor: "center",
          data: { type: "annotation", annotation },
        })
      })
    }

    measurements.forEach((measurement) => {
      const start = percentageToSpherical(measurement.startX, measurement.startY)
      const end = percentageToSpherical(measurement.endX, measurement.endY)
      markers.push({
        id: `${measurement.id}-line`,
        polylineRad: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
        svgStyle: {
          stroke: branding.secondaryColor,
          strokeWidth: "3",
          fill: "none",
        },
        data: { type: "measurement", measurement },
      })

      const midpointLongitude = (start.longitude + end.longitude) / 2
      const midpointLatitude = (start.latitude + end.latitude) / 2
      const distanceLabel = `${measurement.distance.toFixed(1)} ${measurement.unit}`

      markers.push({
        id: `${measurement.id}-label`,
        longitude: midpointLongitude,
        latitude: midpointLatitude,
        html: `<div class="psv-measure-label">${escapeHtml(distanceLabel)}</div>`,
        anchor: "center",
        data: { type: "measurement-label", measurement },
      })
    })

    if (measureStart) {
      const start = percentageToSpherical(measureStart.x, measureStart.y)
      markers.push({
        id: "measurement-start",
        longitude: start.longitude,
        latitude: start.latitude,
        html: '<div class="psv-measure-point"></div>',
        anchor: "center",
      })
    }

    areaPoints.forEach((point, index) => {
      const spherical = percentageToSpherical(point.x, point.y)
      markers.push({
        id: `area-point-${index}`,
        longitude: spherical.longitude,
        latitude: spherical.latitude,
        html: '<div class="psv-measure-point"></div>',
        anchor: "center",
      })
    })

    volumePoints.forEach((point, index) => {
      const spherical = percentageToSpherical(point.x, point.y)
      markers.push({
        id: `volume-point-${index}`,
        longitude: spherical.longitude,
        latitude: spherical.latitude,
        html: '<div class="psv-measure-point"></div>',
        anchor: "center",
      })
    })

    markersPlugin.setMarkers(markers)
  }, [annotations, areaPoints, branding, is360View, measureStart, measurements, scene.hotspots, showAnnotations, volumePoints])

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

  const applyMeasurementPoint = useCallback(
    (x: number, y: number) => {
      if (!measuring) return

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
          setMeasurements((prev) => [...prev, newMeasurement])
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
          setMeasurements((prev) => [...prev, newMeasurement])
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
          setMeasurements((prev) => [...prev, newMeasurement])
          setVolumePoints([])
          onMeasure?.(newMeasurement)
        }
      }
    },
    [
      measuring,
      measurementType,
      measureStart,
      areaPoints,
      volumePoints,
      calculatePolygonArea,
      calculateVolume,
      onMeasure,
    ],
  )

  const applyAnnotationPoint = useCallback(
    (x: number, y: number) => {
      if (!showAnnotationInput || !annotationText.trim()) return

      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}`,
        x,
        y,
        text: annotationText,
        color: annotationColor,
      }
      setAnnotations((prev) => [...prev, newAnnotation])
      setAnnotationText("")
      setShowAnnotationInput(false)
    },
    [annotationColor, annotationText, showAnnotationInput],
  )

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (measuring) {
      applyMeasurementPoint(x, y)
    } else if (showAnnotationInput) {
      applyAnnotationPoint(x, y)
    }
  }

  const handleHotspotClick = useCallback(
    (hotspot: Hotspot) => {
      setSelectedHotspot(hotspot)
      if (hotspot.type === "video" || hotspot.type === "audio" || hotspot.type === "image") {
        setMediaModal({ type: hotspot.type, url: hotspot.mediaUrl || "" })
      } else {
        setMediaModal(null)
      }
      onHotspotClick?.(hotspot)
    },
    [onHotspotClick],
  )

  useEffect(() => {
    if (!is360View) return
    const markersPlugin = markersPluginRef.current
    if (!markersPlugin) return

    const handleMarkerSelect = (_event: unknown, marker: { config?: MarkerProperties }) => {
      const markerData = marker?.config?.data
      if (markerData?.type === "hotspot" && markerData.hotspot) {
        handleHotspotClick(markerData.hotspot as Hotspot)
      }
    }

    markersPlugin.on("select-marker", handleMarkerSelect)
    return () => {
      markersPlugin.off?.("select-marker", handleMarkerSelect)
    }
  }, [is360View, handleHotspotClick])

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

  const isMeasurementMode = (value: string): value is MeasurementMode =>
    (measurementModes as readonly string[]).includes(value)

  const isSceneViewMode = (value: string): value is SceneViewMode =>
    (viewModes as readonly string[]).includes(value)

  const handleMeasurementModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMeasurementMode(event.target.value)) {
      setMeasurementType(event.target.value)
    }
  }

  const handleViewModeSelect = (mode: string) => {
    if (isSceneViewMode(mode)) {
      setCurrentViewMode(mode)
      setShowViewModes(false)
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
        className={`flex-1 relative overflow-hidden ${
          is360View ? "cursor-grab" : "cursor-crosshair"
        } ${!is360View && vrMode ? "flex" : ""}`}
        onClick={is360View ? undefined : handleImageClick}
        style={
          is360View
            ? undefined
            : {
                transform: autoRotate || vrMode ? `rotateY(${rotation}deg)` : "none",
                transition: transitionEffect === "fade" ? "opacity 0.5s ease-in-out" : "transform 0.5s ease-in-out",
              }
        }
      >
        {is360View ? (
          <div ref={viewerContainerRef} className="w-full h-full bg-black" />
        ) : vrMode ? (
          <div className="flex w-full h-full">
            <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
            <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
          </div>
        ) : (
          renderViewMode()
        )}

        {!is360View && (
          <>
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

          </>
        )}

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
              onChange={handleMeasurementModeChange}
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
                {viewModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleViewModeSelect(mode)}
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
