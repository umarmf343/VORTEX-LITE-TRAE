"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  Annotation,
  BrandingConfig,
  DataLayer,
  Hotspot,
  Measurement,
  Scene as SceneType,
  SceneViewMode,
  TourPoint,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Ruler,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  ImageIcon,
  Sun,
  Moon,
  Maximize2,
  Layers,
  RotateCcw,
  RotateCw,
  MapPin,
  Navigation,
  MousePointerClick,
  ArrowLeftRight,
  Trash2,
} from "@/lib/icons"
import {
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene as ThreeScene,
  SphereGeometry,
  Spherical,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import WebGLCapabilities from "three/examples/jsm/capabilities/WebGL.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { ZoomControls } from "./zoom-controls"

type WebGLContextType = "webgl2" | "webgl" | "experimental-webgl"

const WEBGL_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: false,
  depth: true,
  stencil: false,
  antialias: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: true,
  powerPreference: "default",
}

const RELAXED_WEBGL_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  ...WEBGL_CONTEXT_ATTRIBUTES,
  failIfMajorPerformanceCaveat: false,
}

const CONTEXT_ATTRIBUTE_SETS: readonly WebGLContextAttributes[] = [
  WEBGL_CONTEXT_ATTRIBUTES,
  RELAXED_WEBGL_CONTEXT_ATTRIBUTES,
]

const releaseContext = (gl: WebGLRenderingContext | WebGL2RenderingContext | null) => {
  if (!gl) return
  const loseContext = gl.getExtension("WEBGL_lose_context") as { loseContext: () => void } | null
  loseContext?.loseContext()
}

const tryCreateContext = (
  canvas: HTMLCanvasElement,
  type: WebGLContextType,
  attributes: WebGLContextAttributes,
) => {
  try {
    return canvas.getContext(type, attributes) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null
  } catch (error) {
    return null
  }
}

const createRendererWithContextFallback = (
  contextTypes: readonly WebGLContextType[],
): {
  renderer: WebGLRenderer | null
  error: unknown
} => {
  const canvas = document.createElement("canvas")
  let lastError: unknown = null

  if (contextTypes.length === 0) {
    return { renderer: null, error: new Error("No compatible WebGL context provided") }
  }

  for (const type of contextTypes) {
    for (const attributes of CONTEXT_ATTRIBUTE_SETS) {
      const context = tryCreateContext(canvas, type, attributes)
      if (!context) continue

      try {
        const renderer = new WebGLRenderer({
          canvas,
          context: context as WebGLRenderingContext,
          alpha: attributes.alpha,
          depth: attributes.depth,
          stencil: attributes.stencil,
          antialias: attributes.antialias ?? true,
          premultipliedAlpha: attributes.premultipliedAlpha,
          preserveDrawingBuffer: attributes.preserveDrawingBuffer,
          failIfMajorPerformanceCaveat: attributes.failIfMajorPerformanceCaveat,
          powerPreference: attributes.powerPreference ?? "default",
        })
        return { renderer, error: lastError }
      } catch (error) {
        lastError = error
        releaseContext(context)
      }
    }
  }

  return { renderer: null, error: lastError }
}

const measurementModes = ["distance", "area", "volume"] as const
type MeasurementMode = (typeof measurementModes)[number]

const allViewModes: SceneViewMode[] = [
  "360",
  "first-person",
  "walkthrough",
  "orbit",
  "dollhouse",
  "floor-plan",
]
const sphericalViewModes: SceneViewMode[] = ["360", "first-person", "walkthrough", "orbit"]
const immersiveViewModes: SceneViewMode[] = ["first-person", "walkthrough"]

const DEFAULT_FOV = 75
const MIN_FOV = 30
const MAX_FOV = 100
const ZOOM_STEP = 5

type ProjectedPoint = { x: number; y: number; visible: boolean }

interface ThreeContext {
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  scene: ThreeScene
  mesh: Mesh<SphereGeometry, MeshBasicMaterial> | null
}

const percentToLonLat = (xPercent: number, yPercent: number) => {
  const lon = (xPercent / 100) * 360 - 180
  const lat = 90 - (yPercent / 100) * 180
  return { lon, lat }
}

const lonLatToPercent = (lon: number, lat: number) => {
  const normalizedLon = ((lon + 540) % 360) - 180
  const clampedLat = Math.max(-90, Math.min(90, lat))
  return {
    x: ((normalizedLon + 180) / 360) * 100,
    y: ((90 - clampedLat) / 180) * 100,
  }
}

const pointsEqual = (a: ProjectedPoint, b: ProjectedPoint, tolerance = 0.2) =>
  Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && a.visible === b.visible

const recordEqual = (a: Record<string, ProjectedPoint>, b: Record<string, ProjectedPoint>) => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    const pointA = a[key]
    const pointB = b[key]
    if (!pointA || !pointB) return false
    if (!pointsEqual(pointA, pointB)) return false
  }
  return true
}

type ProjectedMeasurement = {
  start: ProjectedPoint
  end: ProjectedPoint
  points?: ProjectedPoint[]
}

const projectedArrayEqual = (a: ProjectedPoint[], b: ProjectedPoint[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!pointsEqual(a[i], b[i])) return false
  }
  return true
}

const measurementRecordEqual = (
  a: Record<string, ProjectedMeasurement>,
  b: Record<string, ProjectedMeasurement>,
) => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    const measurementA = a[key]
    const measurementB = b[key]
    if (!measurementA || !measurementB) return false
    if (!pointsEqual(measurementA.start, measurementB.start)) return false
    if (!pointsEqual(measurementA.end, measurementB.end)) return false
    const pointsA = measurementA.points ?? []
    const pointsB = measurementB.points ?? []
    if (!projectedArrayEqual(pointsA, pointsB)) return false
  }
  return true
}

const distanceBetweenPercentPoints = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))

const polygonAreaPercent = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return Math.abs(area / 2)
}

const polygonCentroid = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return { x: 0, y: 0 }
  const twiceArea =
    points.length < 3
      ? points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 })
      : null
  if (twiceArea === null) {
    let cx = 0
    let cy = 0
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const current = points[i]
      const next = points[(i + 1) % points.length]
      const cross = current.x * next.y - next.x * current.y
      cx += (current.x + next.x) * cross
      cy += (current.y + next.y) * cross
      area += cross
    }
    area *= 0.5
    if (area === 0) {
      const fallback = points.reduce(
        (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
        { x: 0, y: 0 },
      )
      return { x: fallback.x / points.length, y: fallback.y / points.length }
    }
    const factor = 1 / (6 * area)
    return { x: cx * factor, y: cy * factor }
  }
  return { x: twiceArea.x / points.length, y: twiceArea.y / points.length }
}

const isCloseToPoint = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  threshold = 2,
) => distanceBetweenPercentPoints(a, b) <= threshold

const convertMeasurementValue = (
  value: number,
  fromUnit: "ft" | "m",
  toUnit: "ft" | "m",
  type: Measurement["measurementType"],
) => {
  if (fromUnit === toUnit) return value
  const factor = fromUnit === "ft" ? 0.3048 : 3.28084
  if (type === "area") {
    return value * Math.pow(factor, 2)
  }
  if (type === "volume") {
    return value * Math.pow(factor, 3)
  }
  return value * factor
}

const measurementUnitLabel = (unit: "ft" | "m", type: Measurement["measurementType"]) => {
  if (type === "area") {
    return `${unit}²`
  }
  if (type === "volume") {
    return `${unit}³`
  }
  return unit
}

interface SceneViewerProps {
  scene: SceneType
  onHotspotClick?: (hotspot: Hotspot) => void
  onMeasure?: (measurement: Measurement) => void
  onSceneEngagement?: (sceneId: string, dwellTime: number) => void
  branding: BrandingConfig
  dayNightImages?: { day: string; night: string }
  enableVR?: boolean
  enableGyroscope?: boolean
  backgroundAudio?: string
  sceneTransition?: "fade" | "slide"
  onTourPointCreate?: (tourPoint: TourPoint) => void
  targetOrientation?: { sceneId: string; yaw: number; pitch: number; key: number } | null
  availableViewModes?: SceneViewMode[]
  onWalkthroughStep?: (direction: 1 | -1) => void
  measurementMode?: boolean
  onMeasurementModeChange?: (enabled: boolean) => void
  measurementsOverride?: Measurement[]
  activeDataLayers?: string[]
  onDataLayerToggle?: (layerId: string, visible: boolean) => void
  walkthroughMeta?: {
    currentSceneIndex: number
    totalScenes: number
    hasNextScene: boolean
    hasPreviousScene: boolean
    nextSceneName?: string
    previousSceneName?: string
  }
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
  onTourPointCreate,
  targetOrientation,
  availableViewModes,
  onWalkthroughStep,
  measurementMode,
  onMeasurementModeChange,
  measurementsOverride,
  activeDataLayers,
  onDataLayerToggle,
  walkthroughMeta,
}: SceneViewerProps) {
  const [measuring, setMeasuringState] = useState<boolean>(measurementMode ?? false)
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
  const initialMeasurements =
    measurementsOverride !== undefined ? measurementsOverride : scene.measurements
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements)
  const [annotations, setAnnotations] = useState<Annotation[]>(scene.annotations)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1)
  const [autoRotateDirection, setAutoRotateDirection] = useState<1 | -1>(1)
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
  const [volumePoints, setVolumePoints] = useState<Array<{ x: number; y: number }>>([])
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)
  const [displayUnit, setDisplayUnit] = useState<"ft" | "m">("ft")
  const [pendingVolumeHeight, setPendingVolumeHeight] = useState(9)
  const [showMeasurementPanel, setShowMeasurementPanel] = useState(false)
  const [showViewModes, setShowViewModes] = useState(false)
  const [cameraFov, setCameraFov] = useState(DEFAULT_FOV)
  const deriveDefaultLayers = useCallback(
    (layers?: DataLayer[]) =>
      layers?.filter((layer) => layer.defaultVisible !== false).map((layer) => layer.id) ?? [],
    [],
  )
  const [internalVisibleLayers, setInternalVisibleLayers] = useState<string[]>(
    () => deriveDefaultLayers(scene.dataLayers),
  )
  const visibleLayerIds = activeDataLayers ?? internalVisibleLayers
  const [showLayerMenu, setShowLayerMenu] = useState(false)
  const updateMeasuring = useCallback(
    (value: boolean) => {
      setMeasuringState(value)
      if (!value) {
        setMeasureStart(null)
        setAreaPoints([])
        setVolumePoints([])
        setHoverPoint(null)
      }
    },
    [],
  )
  const handleLayerToggle = useCallback(
    (layerId: string) => {
      const isActive = visibleLayerIds.includes(layerId)
      const nextVisible = isActive
        ? visibleLayerIds.filter((id) => id !== layerId)
        : [...visibleLayerIds, layerId]
      if (!activeDataLayers) {
        setInternalVisibleLayers(nextVisible)
      }
      onDataLayerToggle?.(layerId, !isActive)
    },
    [activeDataLayers, onDataLayerToggle, visibleLayerIds],
  )
  const resolvedViewModes = useMemo<SceneViewMode[]>(
    () => (availableViewModes?.length ? availableViewModes : allViewModes),
    [availableViewModes],
  )
  const [currentViewMode, setCurrentViewMode] = useState<SceneViewMode>(() => {
    const preferred = scene.defaultViewMode && resolvedViewModes.includes(scene.defaultViewMode)
      ? scene.defaultViewMode
      : resolvedViewModes[0] ?? "360"
    return preferred
  })
  const [renderError, setRenderError] = useState<string | null>(null)
  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionKey, setTransitionKey] = useState(0)
  const [transitionStyle, setTransitionStyle] = useState<"fade" | "slide" | null>(sceneTransition)
  const {
    currentSceneIndex: walkthroughSceneIndex = 0,
    totalScenes: walkthroughTotalScenes = 1,
    hasNextScene = false,
    hasPreviousScene = false,
    nextSceneName,
    previousSceneName,
  } = walkthroughMeta ?? {}
  const walkthroughStep = Math.min(walkthroughTotalScenes, Math.max(1, walkthroughSceneIndex + 1))
  const walkthroughForwardInstruction = hasNextScene
    ? `W to move into ${nextSceneName ?? "the next space"}`
    : "W to continue exploring this room"
  const walkthroughBackwardInstruction = hasPreviousScene
    ? `S to revisit ${previousSceneName ?? "the previous space"}`
    : "S to stay at the start of the walkthrough"
  const viewerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const sceneStartTime = useRef(Date.now())
  const cameraFovRef = useRef(DEFAULT_FOV)
  const threeContextRef = useRef<ThreeContext | null>(null)
  const textureRef = useRef<Texture | null>(null)
  const raycasterRef = useRef<Raycaster | null>(null)
  const pointerVectorRef = useRef(new Vector2())
  const sphericalRef = useRef(new Spherical())
  const cameraTargetRef = useRef(new Vector3())
  const currentTextureUrlRef = useRef<string | null>(null)
  const hotspotsRef = useRef<Hotspot[]>(scene.hotspots)
  const lonRef = useRef(0)
  const latRef = useRef(0)
  const pointerDownRef = useRef({ x: 0, y: 0, lon: 0, lat: 0 })
  const isInteractingRef = useRef(false)
  const animationFrameRef = useRef<number>()
  const autoRotateRef = useRef(autoRotate)
  const autoRotateSpeedRef = useRef(autoRotateSpeed)
  const autoRotateDirectionRef = useRef(autoRotateDirection)
  const measurementsRef = useRef<Measurement[]>(initialMeasurements)
  const visibleAnnotationsRef = useRef<Annotation[]>([])
  const showAnnotationsRef = useRef(showAnnotations)
  const areaPointsRef = useRef<Array<{ x: number; y: number }>>([])
  const volumePointsRef = useRef<Array<{ x: number; y: number }>>([])
  const keyStateRef = useRef<Record<string, boolean>>({})
  const distanceScaleFt = useMemo(() => {
    const sample = measurements.find(
      (measurement) => measurement.measurementType === "distance" && measurement.distance > 0,
    )
    if (!sample) return 1
    const raw = distanceBetweenPercentPoints(
      { x: sample.startX, y: sample.startY },
      { x: sample.endX, y: sample.endY },
    )
    if (raw === 0) return 1
    const distanceFt =
      sample.unit === "ft"
        ? sample.distance
        : convertMeasurementValue(sample.distance, sample.unit, "ft", "distance")
    if (!Number.isFinite(distanceFt) || distanceFt <= 0) {
      return 1
    }
    return distanceFt / raw
  }, [measurements])

  const convertRawDistance = useCallback(
    (raw: number, unit: "ft" | "m" = "ft") => {
      const base = raw * distanceScaleFt
      return unit === "ft" ? base : convertMeasurementValue(base, "ft", unit, "distance")
    },
    [distanceScaleFt],
  )

  const convertRawArea = useCallback(
    (raw: number, unit: "ft" | "m" = "ft") => {
      const base = Math.pow(distanceScaleFt, 2) * raw
      return unit === "ft" ? base : convertMeasurementValue(base, "ft", unit, "area")
    },
    [distanceScaleFt],
  )

  const formatMeasurementDisplay = useCallback(
    (measurement: Measurement) => {
      const converted = convertMeasurementValue(
        measurement.distance,
        measurement.unit,
        displayUnit,
        measurement.measurementType,
      )
      const decimals = measurement.measurementType === "distance" ? 2 : 1
      return `${converted.toFixed(decimals)} ${measurementUnitLabel(displayUnit, measurement.measurementType)}`
    },
    [displayUnit],
  )

  const getNextMeasurementLabel = useCallback(
    (type: Measurement["measurementType"]) => {
      const existing = measurements.filter((measurement) => measurement.measurementType === type).length
      const baseLabel =
        type === "distance" ? "Distance" : type === "area" ? "Area" : "Volume"
      return `${baseLabel} ${existing + 1}`
    },
    [measurements],
  )

  const addMeasurement = useCallback(
    (measurement: Measurement) => {
      setMeasurements((prev) => [...prev, measurement])
      onMeasure?.(measurement)
    },
    [onMeasure],
  )
  const removeMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((measurement) => measurement.id !== id))
  }, [])

  const clearMeasurements = useCallback(() => {
    setMeasurements([])
  }, [])

  const measurementCounts = useMemo(() => {
    return {
      total: measurements.length,
      distance: measurements.filter((measurement) => measurement.measurementType === "distance").length,
      area: measurements.filter((measurement) => measurement.measurementType === "area").length,
      volume: measurements.filter((measurement) => measurement.measurementType === "volume").length,
    }
  }, [measurements])
  const hasMeasurements = measurementCounts.total > 0
  const measurementPanelVisible = showMeasurementPanel || measuring
  const updateCameraFov = useCallback((nextFov: number) => {
    const clamped = Math.max(MIN_FOV, Math.min(MAX_FOV, nextFov))
    const context = threeContextRef.current
    if (context) {
      context.camera.fov = clamped
      context.camera.updateProjectionMatrix()
    }
    cameraFovRef.current = clamped
    setCameraFov(clamped)
  }, [])
  const [projectedHotspots, setProjectedHotspots] = useState<Record<string, ProjectedPoint>>({})
  const [projectedAnnotations, setProjectedAnnotations] = useState<Record<string, ProjectedPoint>>({})
  const [projectedMeasurements, setProjectedMeasurements] = useState<Record<string, ProjectedMeasurement>>({})
  const [projectedAreaPoints, setProjectedAreaPoints] = useState<ProjectedPoint[]>([])
  const [projectedVolumePoints, setProjectedVolumePoints] = useState<ProjectedPoint[]>([])
  const visibleAnnotations = useMemo(
    () => annotations.filter((annotation) => !annotation.layerId || visibleLayerIds.includes(annotation.layerId)),
    [annotations, visibleLayerIds],
  )
  const immersiveModeActive = immersiveViewModes.includes(currentViewMode)
  const isWalkthroughMode = currentViewMode === "walkthrough"

  useEffect(() => {
    const nextMeasurements =
      measurementsOverride !== undefined ? measurementsOverride : scene.measurements
    setMeasurements(nextMeasurements)
    setAnnotations(scene.annotations)
    setMeasureStart(null)
    setAreaPoints([])
    setVolumePoints([])
    setHoverPoint(null)
    setShowAnnotationInput(false)
    setAnnotationText("")
    setShowMeasurementPanel(false)
    setPendingVolumeHeight(9)
    lonRef.current = 0
    latRef.current = 0
    hotspotsRef.current = scene.hotspots
    measurementsRef.current = nextMeasurements
    if (!activeDataLayers) {
      setInternalVisibleLayers(deriveDefaultLayers(scene.dataLayers))
    }
    areaPointsRef.current = []
    volumePointsRef.current = []
    setProjectedHotspots({})
    setProjectedAnnotations({})
    setProjectedMeasurements({})
    setProjectedAreaPoints([])
    setProjectedVolumePoints([])
    sceneStartTime.current = Date.now()
    setShowLayerMenu(false)
    cameraFovRef.current = DEFAULT_FOV
    setCameraFov(DEFAULT_FOV)
  }, [
    scene.id,
    scene.measurements,
    scene.annotations,
    scene.hotspots,
    measurementsOverride,
    activeDataLayers,
    scene.dataLayers,
    deriveDefaultLayers,
  ])

  useEffect(() => {
    const preferred =
      scene.defaultViewMode && resolvedViewModes.includes(scene.defaultViewMode)
        ? scene.defaultViewMode
        : resolvedViewModes[0] ?? "360"
    setCurrentViewMode(preferred)
  }, [scene.id, scene.defaultViewMode, resolvedViewModes])

  useEffect(() => {
    if (measurementMode !== undefined) {
      updateMeasuring(measurementMode)
    }
  }, [measurementMode, updateMeasuring])

  useEffect(() => {
    if (measuring) {
      setShowMeasurementPanel(true)
    }
  }, [measuring])

  useEffect(() => {
    if (measurementsOverride !== undefined) {
      setMeasurements(measurementsOverride)
      measurementsRef.current = measurementsOverride
    }
  }, [measurementsOverride])

  useEffect(() => {
    setMeasureStart(null)
    setAreaPoints([])
    setVolumePoints([])
    setHoverPoint(null)
  }, [measurementType])

  useEffect(() => {
    visibleAnnotationsRef.current = visibleAnnotations
  }, [visibleAnnotations])

  useEffect(() => {
    showAnnotationsRef.current = showAnnotations
  }, [showAnnotations])

  useEffect(() => {
    if (!showAnnotations) {
      setShowLayerMenu(false)
    }
  }, [showAnnotations])

  useEffect(() => {
    setTransitionStyle(sceneTransition)
  }, [sceneTransition])

  useEffect(() => {
    setTransitionActive(true)
    setTransitionKey((key) => key + 1)
    const timeout = window.setTimeout(() => setTransitionActive(false), 650)
    return () => window.clearTimeout(timeout)
  }, [scene.id])

  useEffect(() => {
    if (!targetOrientation || targetOrientation.sceneId !== scene.id) {
      return
    }
    lonRef.current = targetOrientation.yaw
    latRef.current = targetOrientation.pitch
  }, [scene.id, targetOrientation])

  useEffect(() => {
    autoRotateRef.current = autoRotate
  }, [autoRotate])

  useEffect(() => {
    autoRotateSpeedRef.current = autoRotateSpeed
  }, [autoRotateSpeed])

  useEffect(() => {
    autoRotateDirectionRef.current = autoRotateDirection
  }, [autoRotateDirection])

  useEffect(() => {
    measurementsRef.current = measurements
  }, [measurements])

  useEffect(() => {
    areaPointsRef.current = areaPoints
  }, [areaPoints])

  useEffect(() => {
    volumePointsRef.current = volumePoints
  }, [volumePoints])

  useEffect(() => {
    if (!immersiveModeActive) {
      keyStateRef.current = {}
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      keyStateRef.current[key] = true

      if (currentViewMode === "walkthrough" && ["w", "s"].includes(key)) {
        if (event.repeat) {
          return
        }
        event.preventDefault()
        onWalkthroughStep?.(key === "w" ? 1 : -1)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      delete keyStateRef.current[event.key.toLowerCase()]
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      keyStateRef.current = {}
    }
  }, [immersiveModeActive, currentViewMode, onWalkthroughStep])

  useEffect(() => {
    if (!enableGyroscope || !vrMode || !sphericalViewModes.includes(currentViewMode)) return

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha === "number") {
        lonRef.current = event.alpha
      }
      if (typeof event.beta === "number") {
        const lat = event.beta - 90
        latRef.current = Math.max(-85, Math.min(85, lat))
      }
    }

    window.addEventListener("deviceorientation", handleDeviceOrientation)
    return () => window.removeEventListener("deviceorientation", handleDeviceOrientation)
  }, [enableGyroscope, vrMode, currentViewMode])

  const updateProjectedElements = useCallback(() => {
    if (!sphericalViewModes.includes(currentViewMode)) return
    const context = threeContextRef.current
    const container = viewerRef.current
    if (!context || !container) return

    const camera = context.camera
    const cameraDirection = new Vector3()
    camera.getWorldDirection(cameraDirection)

    const projectPercent = (x: number, y: number): ProjectedPoint => {
      const { lon, lat } = percentToLonLat(x, y)
      const phi = MathUtils.degToRad(90 - lat)
      const theta = MathUtils.degToRad(lon)
      const point = new Vector3().setFromSphericalCoords(500, phi, theta)
      const directionToPoint = point.clone().normalize()
      const visible = cameraDirection.dot(directionToPoint) > 0
      const projected = point.clone().project(camera)
      return {
        x: (projected.x * 0.5 + 0.5) * 100,
        y: (-projected.y * 0.5 + 0.5) * 100,
        visible,
      }
    }

    const nextHotspots: Record<string, ProjectedPoint> = {}
    for (const hotspot of hotspotsRef.current) {
      nextHotspots[hotspot.id] = projectPercent(hotspot.x, hotspot.y)
    }
    setProjectedHotspots((prev) => (recordEqual(prev, nextHotspots) ? prev : nextHotspots))

    const annotationsToProject = showAnnotationsRef.current ? visibleAnnotationsRef.current : []
    const nextAnnotations: Record<string, ProjectedPoint> = {}
    for (const annotation of annotationsToProject) {
      nextAnnotations[annotation.id] = projectPercent(annotation.x, annotation.y)
    }
    setProjectedAnnotations((prev) => (recordEqual(prev, nextAnnotations) ? prev : nextAnnotations))

    const nextMeasurements: Record<string, ProjectedMeasurement> = {}
    for (const measurement of measurementsRef.current) {
      const start = projectPercent(measurement.startX, measurement.startY)
      const end = projectPercent(measurement.endX, measurement.endY)
      const projected: ProjectedMeasurement = { start, end }
      if (measurement.points && measurement.points.length > 0) {
        projected.points = measurement.points.map((point) => projectPercent(point.x, point.y))
      }
      nextMeasurements[measurement.id] = projected
    }
    setProjectedMeasurements((prev) => (measurementRecordEqual(prev, nextMeasurements) ? prev : nextMeasurements))

    const nextAreaPoints = areaPointsRef.current.map((point) => projectPercent(point.x, point.y))
    setProjectedAreaPoints((prev) => (projectedArrayEqual(prev, nextAreaPoints) ? prev : nextAreaPoints))

    const nextVolumePoints = volumePointsRef.current.map((point) => projectPercent(point.x, point.y))
    setProjectedVolumePoints((prev) => (projectedArrayEqual(prev, nextVolumePoints) ? prev : nextVolumePoints))
  }, [currentViewMode])

  useEffect(() => {
    if (!sphericalViewModes.includes(currentViewMode)) {
      setProjectedHotspots({})
      setProjectedAnnotations({})
      setProjectedMeasurements({})
      setProjectedAreaPoints([])
      setProjectedVolumePoints([])
    }
  }, [currentViewMode])

  useEffect(() => {
    if (!sphericalViewModes.includes(currentViewMode)) {
      if (threeContextRef.current) {
        const context = threeContextRef.current
        context.renderer.dispose()
        threeContextRef.current = null
        raycasterRef.current = null
      }
      setRenderError(null)
      return
    }

    if (renderError) {
      return
    }

    const container = viewerRef.current
    if (!container) return

    const hasWebGL2 = WebGLCapabilities.isWebGL2Available()
    const contextPriority: WebGLContextType[] = hasWebGL2 ? ["webgl2"] : []

    if (!hasWebGL2) {
      setRenderError("WebGL 2 is not available in this browser or device.")
      return
    }

    let renderer: WebGLRenderer | null = null
    let rendererError: unknown = null

    const { renderer: createdRenderer, error } = createRendererWithContextFallback(contextPriority)
    renderer = createdRenderer
    rendererError = error

    if (!renderer) {
      console.error("Failed to create WebGLRenderer", rendererError)
      const defaultMessage = "Unable to initialize the 3D viewer on this device."
      const errorMessage = rendererError instanceof Error ? rendererError.message : null
      setRenderError(errorMessage ? `${defaultMessage} (${errorMessage})` : defaultMessage)
      return
    }

    if (rendererError) {
      console.warn(
        "WebGLRenderer fell back to a context that may have reduced performance due to GPU limitations.",
        rendererError,
      )
    }

    setRenderError(null)

    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    renderer.domElement.style.display = "block"
    renderer.domElement.style.touchAction = "none"
    container.appendChild(renderer.domElement)

    const camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.01, 1100)
    if (currentViewMode === "orbit") {
      camera.position.set(0.1, 0, 0)
    } else {
      camera.position.set(0, 0, 0)
    }
    cameraTargetRef.current.set(0, 0, 0)
    camera.lookAt(cameraTargetRef.current)

    const scene3D = new ThreeScene()
    const geometry = new SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1)
    const material = new MeshBasicMaterial({ color: 0xffffff })
    const mesh = new Mesh(geometry, material)
    scene3D.add(mesh)

    const context: ThreeContext = { renderer, camera, scene: scene3D, mesh }
    threeContextRef.current = context
    updateCameraFov(camera.fov)

    const raycaster = new Raycaster()
    raycasterRef.current = raycaster

    const loader = new TextureLoader()
    const resolveImage = () =>
      dayNightMode === "night" && dayNightImages?.night ? dayNightImages.night : scene.imageUrl || "/placeholder.svg"
    const initialImageUrl = resolveImage()

    loader.load(
      initialImageUrl,
      (texture) => {
        textureRef.current?.dispose()
        textureRef.current = texture
        currentTextureUrlRef.current = initialImageUrl
        material.map = texture
        material.needsUpdate = true
      },
      undefined,
      () => {
        material.map = null
        material.needsUpdate = true
        currentTextureUrlRef.current = null
      },
    )

    let orbitControls: OrbitControls | null = null
    const orbitEventHandlers: Array<{ event: string; handler: () => void }> = []
    if (currentViewMode === "orbit") {
      orbitControls = new OrbitControls(camera, renderer.domElement)
      orbitControls.enablePan = false
      orbitControls.enableZoom = false
      orbitControls.rotateSpeed = 0.45
      orbitControls.minDistance = 0.1
      orbitControls.maxDistance = 0.1
      orbitControls.enableDamping = true
      orbitControls.dampingFactor = 0.08
      orbitEventHandlers.push({ event: "start", handler: () => (isInteractingRef.current = true) })
      orbitEventHandlers.push({ event: "end", handler: () => (isInteractingRef.current = false) })
      orbitEventHandlers.forEach(({ event, handler }) => orbitControls?.addEventListener(event, handler))
    }

    const handlePointerDown = (event: PointerEvent) => {
      isInteractingRef.current = true
      pointerDownRef.current = { x: event.clientX, y: event.clientY, lon: lonRef.current, lat: latRef.current }
      container.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isInteractingRef.current) return
      const deltaX = event.clientX - pointerDownRef.current.x
      const deltaY = event.clientY - pointerDownRef.current.y
      const sensitivity = immersiveModeActive ? 0.2 : 0.1
      const latClamp = immersiveModeActive ? 75 : 85
      lonRef.current = pointerDownRef.current.lon - deltaX * sensitivity
      latRef.current = Math.max(-latClamp, Math.min(latClamp, pointerDownRef.current.lat + deltaY * sensitivity))
    }

    const handlePointerUp = (event: PointerEvent) => {
      isInteractingRef.current = false
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId)
      }
    }

    const handlePointerLeave = () => {
      isInteractingRef.current = false
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const currentContext = threeContextRef.current
      if (!currentContext) return
      updateCameraFov(currentContext.camera.fov + event.deltaY * 0.05)
    }

    const handleContextMenu = (event: Event) => {
      event.preventDefault()
    }

    if (currentViewMode !== "orbit") {
      container.addEventListener("pointerdown", handlePointerDown)
      container.addEventListener("pointermove", handlePointerMove)
      container.addEventListener("pointerup", handlePointerUp)
      container.addEventListener("pointerleave", handlePointerLeave)
    }
    container.addEventListener("wheel", handleWheel, { passive: false })
    container.addEventListener("contextmenu", handleContextMenu)

    const resizeObserver = new ResizeObserver(() => {
      const currentContext = threeContextRef.current
      if (!currentContext) return
      const { renderer: ctxRenderer, camera: ctxCamera } = currentContext
      ctxRenderer.setSize(container.clientWidth, container.clientHeight)
      ctxCamera.aspect = container.clientWidth / container.clientHeight
      ctxCamera.updateProjectionMatrix()
      orbitControls?.update()
    })

    resizeObserver.observe(container)

    const animate = () => {
      const currentContext = threeContextRef.current
      if (!currentContext) return
      const { renderer: ctxRenderer, camera: ctxCamera, scene: ctxScene } = currentContext

      if (currentViewMode === "orbit") {
        if (orbitControls) {
          orbitControls.autoRotate = autoRotateRef.current && !isInteractingRef.current
          orbitControls.autoRotateSpeed = autoRotateDirectionRef.current * autoRotateSpeedRef.current * 0.25
          orbitControls.update()
        }
        const cameraDirection = new Vector3()
        ctxCamera.getWorldDirection(cameraDirection)
        const sphericalDirection = sphericalRef.current
        sphericalDirection.setFromVector3(cameraDirection)
        let lon = MathUtils.radToDeg(sphericalDirection.theta)
        if (lon > 180) lon -= 360
        if (lon < -180) lon += 360
        lonRef.current = lon
        latRef.current = 90 - MathUtils.radToDeg(sphericalDirection.phi)
      } else {
        if (autoRotateRef.current && !isInteractingRef.current) {
          lonRef.current += autoRotateDirectionRef.current * autoRotateSpeedRef.current * 0.2
        }
        if (immersiveModeActive) {
          const keys = keyStateRef.current
          const movementSpeed = 0.6
          if (keys["arrowleft"] || keys["a"]) {
            lonRef.current += movementSpeed
          }
          if (keys["arrowright"] || keys["d"]) {
            lonRef.current -= movementSpeed
          }
          if (keys["arrowup"]) {
            latRef.current -= movementSpeed
          }
          if (keys["arrowdown"]) {
            latRef.current += movementSpeed
          }
          if (!isWalkthroughMode && keys["w"]) {
            latRef.current -= movementSpeed
          }
          if (!isWalkthroughMode && keys["s"]) {
            latRef.current += movementSpeed
          }
        }

        const latClamp = immersiveModeActive ? 75 : 85
        latRef.current = Math.max(-latClamp, Math.min(latClamp, latRef.current))
        const phi = MathUtils.degToRad(90 - latRef.current)
        const theta = MathUtils.degToRad(lonRef.current)
        cameraTargetRef.current.set(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        )
        ctxCamera.lookAt(cameraTargetRef.current)
      }

      ctxRenderer.render(ctxScene, ctxCamera)
      updateProjectedElements()
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      resizeObserver.disconnect()
      if (currentViewMode !== "orbit") {
        container.removeEventListener("pointerdown", handlePointerDown)
        container.removeEventListener("pointermove", handlePointerMove)
        container.removeEventListener("pointerup", handlePointerUp)
        container.removeEventListener("pointerleave", handlePointerLeave)
      }
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("contextmenu", handleContextMenu)
      orbitEventHandlers.forEach(({ event, handler }) => orbitControls?.removeEventListener(event, handler))
      orbitControls?.dispose()
      const currentContext = threeContextRef.current
      if (currentContext) {
        const { renderer: ctxRenderer, mesh: ctxMesh, scene: ctxScene } = currentContext
        const webglContext = ctxRenderer.getContext() ?? null
        ctxRenderer.dispose()
        releaseContext(webglContext)
        if (ctxMesh) {
          ctxMesh.geometry.dispose()
          ctxMesh.material.dispose()
          ctxScene.remove(ctxMesh)
        }
      }
      textureRef.current?.dispose()
      currentTextureUrlRef.current = null
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
      threeContextRef.current = null
      raycasterRef.current = null
    }
  }, [
    currentViewMode,
    dayNightImages,
    dayNightMode,
    renderError,
    scene.id,
    scene.imageUrl,
    updateProjectedElements,
    immersiveModeActive,
    isWalkthroughMode,
    updateCameraFov,
  ])

  useEffect(() => {
    if (!sphericalViewModes.includes(currentViewMode)) return
    const context = threeContextRef.current
    if (!context || !context.mesh) return

    const loader = new TextureLoader()
    const imageUrl =
      dayNightMode === "night" && dayNightImages?.night ? dayNightImages.night : scene.imageUrl || "/placeholder.svg"

    if (currentTextureUrlRef.current === imageUrl) {
      return
    }

    loader.load(
      imageUrl,
      (texture) => {
        textureRef.current?.dispose()
        textureRef.current = texture
        const material = context.mesh?.material as MeshBasicMaterial
        material.map = texture
        material.needsUpdate = true
        currentTextureUrlRef.current = imageUrl
      },
      undefined,
      () => {
        const material = context.mesh?.material as MeshBasicMaterial
        material.map = null
        material.needsUpdate = true
        currentTextureUrlRef.current = null
      },
    )
  }, [currentViewMode, dayNightMode, dayNightImages, scene.imageUrl])

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

  const getPointerPercent = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!viewerRef.current) return null

      if (sphericalViewModes.includes(currentViewMode)) {
        const context = threeContextRef.current
        const raycaster = raycasterRef.current
        if (!context || !raycaster || !context.mesh) return null

        const rect = viewerRef.current.getBoundingClientRect()
        const pointer = pointerVectorRef.current
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        )
        raycaster.setFromCamera(pointer, context.camera)
        const intersections = raycaster.intersectObject(context.mesh, false)
        if (intersections.length === 0) return null

        const point = intersections[0].point
        const spherical = sphericalRef.current
        spherical.setFromVector3(point)
        let lon = MathUtils.radToDeg(spherical.theta)
        if (lon > 180) lon -= 360
        if (lon < -180) lon += 360
        const lat = 90 - MathUtils.radToDeg(spherical.phi)
        return lonLatToPercent(lon, lat)
      }

      const rect = viewerRef.current.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      }
    },
    [currentViewMode],
  )

  const finalizeDistanceMeasurement = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const raw = distanceBetweenPercentPoints(start, end)
      if (raw === 0) return
      const distanceFt = convertRawDistance(raw, "ft")
      const measurement: Measurement = {
        id: `measure-${Date.now()}`,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        distance: Number.parseFloat(distanceFt.toFixed(2)),
        unit: "ft",
        measurementType: "distance",
        label: getNextMeasurementLabel("distance"),
        createdAt: new Date().toISOString(),
      }
      addMeasurement(measurement)
    },
    [addMeasurement, convertRawDistance, getNextMeasurementLabel],
  )

  const finalizeAreaMeasurement = useCallback(
    (points: Array<{ x: number; y: number }>) => {
      if (points.length < 3) return
      const rawArea = polygonAreaPercent(points)
      if (rawArea === 0) return
      const areaFt = convertRawArea(rawArea, "ft")
      const measurement: Measurement = {
        id: `measure-${Date.now()}`,
        startX: points[0].x,
        startY: points[0].y,
        endX: points[points.length - 1].x,
        endY: points[points.length - 1].y,
        distance: Number.parseFloat(areaFt.toFixed(1)),
        unit: "ft",
        measurementType: "area",
        points: points.map((point) => ({ ...point })),
        label: getNextMeasurementLabel("area"),
        createdAt: new Date().toISOString(),
      }
      addMeasurement(measurement)
    },
    [addMeasurement, convertRawArea, getNextMeasurementLabel],
  )

  const finalizeVolumeMeasurement = useCallback(
    (points: Array<{ x: number; y: number }>, heightFt: number) => {
      if (points.length < 3) return
      const rawArea = polygonAreaPercent(points)
      if (rawArea === 0) return
      const baseAreaFt = convertRawArea(rawArea, "ft")
      const safeHeight = Math.max(0.1, heightFt)
      const volumeFt = baseAreaFt * safeHeight
      const measurement: Measurement = {
        id: `measure-${Date.now()}`,
        startX: points[0].x,
        startY: points[0].y,
        endX: points[points.length - 1].x,
        endY: points[points.length - 1].y,
        distance: Number.parseFloat(volumeFt.toFixed(1)),
        unit: "ft",
        measurementType: "volume",
        points: points.map((point) => ({ ...point })),
        height: Number.parseFloat(safeHeight.toFixed(2)),
        label: getNextMeasurementLabel("volume"),
        createdAt: new Date().toISOString(),
      }
      addMeasurement(measurement)
    },
    [addMeasurement, convertRawArea, getNextMeasurementLabel],
  )

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const percent = getPointerPercent(e)
    if (!percent) return

    const { x, y } = percent

    if (measuring) {
      setShowMeasurementPanel(true)
      if (measurementType === "distance") {
        if (!measureStart) {
          setMeasureStart({ x, y })
        } else {
          finalizeDistanceMeasurement(measureStart, { x, y })
          setMeasureStart(null)
          setHoverPoint(null)
        }
      } else if (measurementType === "area") {
        const newPoints = [...areaPoints, { x, y }]
        if (newPoints.length >= 3 && isCloseToPoint(newPoints[0], newPoints[newPoints.length - 1])) {
          newPoints.pop()
          finalizeAreaMeasurement(newPoints)
          setAreaPoints([])
          setHoverPoint(null)
        } else {
          setAreaPoints(newPoints)
        }
      } else if (measurementType === "volume") {
        const newPoints = [...volumePoints, { x, y }]
        if (newPoints.length >= 3 && isCloseToPoint(newPoints[0], newPoints[newPoints.length - 1])) {
          newPoints.pop()
          finalizeVolumeMeasurement(newPoints, pendingVolumeHeight)
          setVolumePoints([])
          setHoverPoint(null)
        } else {
          setVolumePoints(newPoints)
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
        setAnnotations((prev) => [...prev, newAnnotation])
        setAnnotationText("")
        setShowAnnotationInput(false)
      }
    }
  }

  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!measuring) {
        if (hoverPoint) {
          setHoverPoint(null)
        }
        return
      }
      const percent = getPointerPercent(event)
      if (!percent) return
      setHoverPoint(percent)
    },
    [getPointerPercent, hoverPoint, measuring],
  )

  const handlePointerLeave = useCallback(() => {
    setHoverPoint(null)
  }, [])

  const handleViewerDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!measuring) return
      if (measurementType === "area" && areaPoints.length >= 3) {
        event.preventDefault()
        event.stopPropagation()
        finalizeAreaMeasurement(areaPoints)
        setAreaPoints([])
        setHoverPoint(null)
        setShowMeasurementPanel(true)
      } else if (measurementType === "volume" && volumePoints.length >= 3) {
        event.preventDefault()
        event.stopPropagation()
        finalizeVolumeMeasurement(volumePoints, pendingVolumeHeight)
        setVolumePoints([])
        setHoverPoint(null)
        setShowMeasurementPanel(true)
      }
    },
    [
      areaPoints,
      finalizeAreaMeasurement,
      finalizeVolumeMeasurement,
      measuring,
      measurementType,
      pendingVolumeHeight,
      volumePoints,
    ],
  )

  const calculatePolygonArea = (points: Array<{ x: number; y: number }>, unit: "ft" | "m" = displayUnit) => {
    const rawArea = polygonAreaPercent(points)
    return convertRawArea(rawArea, unit)
  }

  const calculateVolume = (
    points: Array<{ x: number; y: number }>,
    heightFt: number,
    unit: "ft" | "m" = displayUnit,
  ) => {
    if (points.length < 3) return 0
    const rawArea = polygonAreaPercent(points)
    const baseAreaFt = convertRawArea(rawArea, "ft")
    const volumeFt = baseAreaFt * Math.max(0.1, heightFt)
    return convertMeasurementValue(volumeFt, "ft", unit, "volume")
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
    const element = viewerRef.current
    if (!element) {
      return
    }

    const activeFullscreenElement = document.fullscreenElement

    // If nothing is currently in fullscreen, request it for the viewer element.
    if (!activeFullscreenElement) {
      const requestResult = element.requestFullscreen?.()
      if (requestResult && typeof requestResult.then === "function") {
        requestResult
          .then(() => setIsFullscreen(true))
          .catch(() => setIsFullscreen(false))
      } else {
        setIsFullscreen(true)
      }
      return
    }

    // If the viewer element is already in fullscreen, attempt to exit.
    if (activeFullscreenElement === element) {
      const exitResult = document.exitFullscreen?.()
      if (exitResult && typeof exitResult.then === "function") {
        exitResult
          .then(() => setIsFullscreen(false))
          .catch(() => setIsFullscreen(false))
      } else {
        setIsFullscreen(false)
      }
      return
    }

    // Fallback: if another element is fullscreen, try to exit it safely.
    document.exitFullscreen?.()
  }

  const handleZoomIn = () => {
    updateCameraFov(cameraFovRef.current - ZOOM_STEP)
  }

  const handleZoomOut = () => {
    updateCameraFov(cameraFovRef.current + ZOOM_STEP)
  }

  const handleZoomReset = () => {
    updateCameraFov(DEFAULT_FOV)
  }

  const zoomDisplay = useMemo(() => (DEFAULT_FOV / cameraFov).toFixed(1), [cameraFov])
  const atMinZoom = cameraFov <= MIN_FOV + 0.1
  const atMaxZoom = cameraFov >= MAX_FOV - 0.1
  const atDefaultZoom = Math.abs(cameraFov - DEFAULT_FOV) < 0.1
  const canZoom = sphericalViewModes.includes(currentViewMode) && !renderError

  const isMeasurementMode = (value: string): value is MeasurementMode =>
    (measurementModes as readonly string[]).includes(value)

  const isSceneViewMode = (value: string): value is SceneViewMode =>
    (allViewModes as readonly string[]).includes(value as SceneViewMode)

  const handleMeasurementModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMeasurementMode(event.target.value)) {
      setMeasurementType(event.target.value)
    }
  }

  const handleViewModeSelect = (mode: string) => {
    if (isSceneViewMode(mode) && resolvedViewModes.includes(mode)) {
      setCurrentViewMode(mode)
      setShowViewModes(false)
    }
  }

  const handleDisplayUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUnit = event.target.value === "m" ? "m" : "ft"
    setDisplayUnit(nextUnit)
  }

  const handleVolumeHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(event.target.value)
    if (!Number.isFinite(nextValue)) {
      return
    }
    setPendingVolumeHeight(Math.max(0.1, nextValue))
  }

  const renderViewMode = () => {
    if (sphericalViewModes.includes(currentViewMode)) {
      return <div className="w-full h-full bg-black" />
    }
    if (currentViewMode === "dollhouse") {
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

  const viewerCursorClass =
    renderError && sphericalViewModes.includes(currentViewMode)
      ? "cursor-not-allowed"
      : measuring || showAnnotationInput
        ? "cursor-crosshair"
        : sphericalViewModes.includes(currentViewMode)
          ? "cursor-grab"
          : "cursor-crosshair"
  const viewerFlexClass = !sphericalViewModes.includes(currentViewMode) && vrMode ? "flex" : ""

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Viewer */}
      <div
        ref={viewerRef}
        className={`flex-1 relative overflow-hidden ${viewerCursorClass} ${viewerFlexClass} ${
          sphericalViewModes.includes(currentViewMode) ? "bg-black" : ""
        }`}
        onClick={handleImageClick}
        onDoubleClick={handleViewerDoubleClick}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
      >
        {renderError && sphericalViewModes.includes(currentViewMode) ? (
          <>
            <img
              src={currentImageUrl || "/placeholder.svg"}
              alt={scene.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center p-6">
              <p className="text-white text-lg font-semibold">Unable to load 3D tour</p>
              <p className="text-sm text-gray-300 max-w-md">
                {renderError} Displaying a static image instead.
              </p>
            </div>
          </>
        ) : (
          <>
            {!sphericalViewModes.includes(currentViewMode) ? (
              vrMode ? (
                <div className="flex w-full h-full">
                  <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
                  <div className="w-1/2 overflow-hidden">{renderViewMode()}</div>
                </div>
              ) : (
                renderViewMode()
              )
            ) : null}

            {transitionActive && transitionStyle && (
              <div
                key={transitionKey}
                className={`absolute inset-0 pointer-events-none ${
                  transitionStyle === "slide" ? "scene-transition-slide" : "scene-transition-fade"
                }`}
              />
            )}

            {isWalkthroughMode && (
              <>
                <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
                  <Navigation className="h-4 w-4 text-emerald-300" />
                  <span className="uppercase tracking-wide text-emerald-200">Walkthrough Mode</span>
                  <span className="text-white/80">
                    Step {walkthroughStep} of {Math.max(1, walkthroughTotalScenes)}
                  </span>
                </div>
                <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-[11px] text-white/90 md:text-sm">
                  <div className="flex flex-col items-center gap-3 md:flex-row">
                    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 shadow-lg backdrop-blur">
                      <MousePointerClick className="h-4 w-4 text-blue-300" />
                      <span>Click &amp; drag to look around</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 shadow-lg backdrop-blur">
                      <Navigation className="h-4 w-4 text-emerald-300" />
                      <span>{walkthroughForwardInstruction}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 shadow-lg backdrop-blur">
                      <Navigation className="h-4 w-4 rotate-180 text-rose-300" />
                      <span>{walkthroughBackwardInstruction}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 shadow-lg backdrop-blur">
                    <ArrowLeftRight className="h-4 w-4 text-amber-300" />
                    <span>A / D or ← / → to pivot your view</span>
                  </div>
                </div>
              </>
            )}

            {/* Hotspots */}
            {scene.hotspots.map((hotspot) => {
              const projected = projectedHotspots[hotspot.id]
              if (sphericalViewModes.includes(currentViewMode) && (!projected || !projected.visible)) {
                return null
              }
              const positionStyle =
                sphericalViewModes.includes(currentViewMode)
                  ? { left: `${projected?.x ?? 0}%`, top: `${projected?.y ?? 0}%` }
                  : { left: `${hotspot.x}%`, top: `${hotspot.y}%` }

              return (
                <div
                  key={hotspot.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={positionStyle}
                >
                  <button
                    className="relative flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-125"
                    style={{ backgroundColor: branding.primaryColor, opacity: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleHotspotClick(hotspot)
                    }}
                    title={hotspot.title}
                  >
                    <div className="flex items-center gap-0.5">
                      {hotspot.type === "video" && <Play className="w-4 h-4 text-white" />}
                      {hotspot.type === "audio" && <Volume2 className="w-4 h-4 text-white" />}
                      {hotspot.type === "image" && <ImageIcon className="w-4 h-4 text-white" />}
                    </div>
                    <div
                      className="absolute inset-0 rounded-full animate-pulse"
                      style={{ backgroundColor: branding.primaryColor, opacity: 0.3 }}
                    />
                  </button>
                </div>
              )
            })}
            {/* Measurement Lines */}
          </>
        )}
        {measurements.map((measurement) => {
          const measurementLabel = formatMeasurementDisplay(measurement)
          const name = measurement.label ??
            (measurement.measurementType === "distance"
              ? "Distance"
              : measurement.measurementType === "area"
                ? "Area"
                : "Volume")

          if (sphericalViewModes.includes(currentViewMode)) {
            const projection = projectedMeasurements[measurement.id]
            if (!projection || !projection.start.visible || !projection.end.visible) {
              return null
            }

            if (
              (measurement.measurementType === "area" || measurement.measurementType === "volume") &&
              projection.points &&
              projection.points.length >= 3
            ) {
              const visiblePoints = projection.points.filter((point) => point.visible)
              if (visiblePoints.length < 3) {
                return null
              }
              const centroid = polygonCentroid(visiblePoints.map((point) => ({ x: point.x, y: point.y })))
              const polygonPoints = visiblePoints.map((point) => `${point.x},${point.y}`).join(" ")
              return (
                <svg key={measurement.id} className="absolute inset-0 w-full h-full pointer-events-none">
                  <polygon
                    points={polygonPoints}
                    fill={`${branding.secondaryColor}33`}
                    stroke={branding.secondaryColor}
                    strokeWidth="2"
                  />
                  <text
                    x={`${centroid.x}%`}
                    y={`${centroid.y}%`}
                    fill={branding.secondaryColor}
                    fontSize="12"
                    textAnchor="middle"
                  >
                    <tspan x={`${centroid.x}%`} dy="0">{name}</tspan>
                    <tspan x={`${centroid.x}%`} dy="1.2em">
                      {measurementLabel}
                      {measurement.measurementType === "volume" && measurement.height
                        ? ` • h ${measurement.height.toFixed(1)} ft`
                        : ""}
                    </tspan>
                  </text>
                </svg>
              )
            }

            const midX = (projection.start.x + projection.end.x) / 2
            const midY = (projection.start.y + projection.end.y) / 2
            return (
              <svg key={measurement.id} className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1={`${projection.start.x}%`}
                  y1={`${projection.start.y}%`}
                  x2={`${projection.end.x}%`}
                  y2={`${projection.end.y}%`}
                  stroke={branding.secondaryColor}
                  strokeWidth="2"
                />
                <circle cx={`${projection.start.x}%`} cy={`${projection.start.y}%`} r="4" fill={branding.secondaryColor} />
                <circle cx={`${projection.end.x}%`} cy={`${projection.end.y}%`} r="4" fill={branding.secondaryColor} />
                <text
                  x={`${midX}%`}
                  y={`${midY - 2}%`}
                  fill={branding.secondaryColor}
                  fontSize="12"
                  textAnchor="middle"
                >
                  <tspan x={`${midX}%`} dy="0">
                    {name}
                  </tspan>
                  <tspan x={`${midX}%`} dy="1.2em">
                    {measurementLabel}
                  </tspan>
                </text>
              </svg>
            )
          }

          if (measurement.measurementType === "area" || measurement.measurementType === "volume") {
            const points = measurement.points ?? []
            if (points.length >= 3) {
              const centroid = polygonCentroid(points)
              const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ")
              return (
                <svg key={measurement.id} className="absolute inset-0 w-full h-full pointer-events-none">
                  <polygon
                    points={polygonPoints}
                    fill={`${branding.secondaryColor}33`}
                    stroke={branding.secondaryColor}
                    strokeWidth="2"
                  />
                  <text
                    x={`${centroid.x}%`}
                    y={`${centroid.y}%`}
                    fill={branding.secondaryColor}
                    fontSize="12"
                    textAnchor="middle"
                  >
                    <tspan x={`${centroid.x}%`} dy="0">{name}</tspan>
                    <tspan x={`${centroid.x}%`} dy="1.2em">
                      {measurementLabel}
                      {measurement.measurementType === "volume" && measurement.height
                        ? ` • h ${measurement.height.toFixed(1)} ft`
                        : ""}
                    </tspan>
                  </text>
                </svg>
              )
            }
          }

          const midX = (measurement.startX + measurement.endX) / 2
          const midY = (measurement.startY + measurement.endY) / 2
          return (
            <svg key={measurement.id} className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1={`${measurement.startX}%`}
                y1={`${measurement.startY}%`}
                x2={`${measurement.endX}%`}
                y2={`${measurement.endY}%`}
                stroke={branding.secondaryColor}
                strokeWidth="2"
              />
              <circle cx={`${measurement.startX}%`} cy={`${measurement.startY}%`} r="4" fill={branding.secondaryColor} />
              <circle cx={`${measurement.endX}%`} cy={`${measurement.endY}%`} r="4" fill={branding.secondaryColor} />
              <text
                x={`${midX}%`}
                y={`${midY - 5}%`}
                fill={branding.secondaryColor}
                fontSize="12"
                textAnchor="middle"
              >
                <tspan x={`${midX}%`} dy="0">
                  {name}
                </tspan>
                <tspan x={`${midX}%`} dy="1.2em">
                  {measurementLabel}
                </tspan>
              </text>
            </svg>
          )
        })}

        {/* Area Measurement Points */}
        {measurementType === "area" &&
          (sphericalViewModes.includes(currentViewMode) ? projectedAreaPoints : areaPoints).map((point, idx) => {
            if (sphericalViewModes.includes(currentViewMode)) {
              const projectedPoint = point as ProjectedPoint
              if (!projectedPoint.visible) {
                return null
              }
              return (
                <div
                  key={idx}
                  className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${projectedPoint.x}%`,
                    top: `${projectedPoint.y}%`,
                    backgroundColor: branding.secondaryColor,
                  }}
                />
              )
            }

            const flatPoint = point as { x: number; y: number }
            return (
              <div
                key={idx}
                className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${flatPoint.x}%`,
                  top: `${flatPoint.y}%`,
                  backgroundColor: branding.secondaryColor,
                }}
              />
            )
          })}

        {measurementType === "area" && areaPoints.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {(() => {
              const basePoints = areaPoints
              const projectedPoints = sphericalViewModes.includes(currentViewMode)
                ? projectedAreaPoints.filter((point) => point.visible)
                : basePoints
              if (projectedPoints.length < 2) return null
              const pointString = projectedPoints
                .map((point) => `${point.x},${point.y}`)
                .join(" ")
              const hoverCandidate =
                !sphericalViewModes.includes(currentViewMode) && hoverPoint
                  ? `${hoverPoint.x},${hoverPoint.y}`
                  : null
              const pathPoints = hoverCandidate ? `${pointString} ${hoverCandidate}` : pointString
              const centroidBase = polygonCentroid(basePoints)
              const centroidDisplay = sphericalViewModes.includes(currentViewMode)
                ? polygonCentroid(
                    projectedPoints.map((point) => ({ x: point.x, y: point.y })),
                  )
                : centroidBase
              const areaValue =
                basePoints.length >= 3
                  ? calculatePolygonArea(basePoints, displayUnit)
                  : null
              return (
                <>
                  <polyline
                    points={pathPoints}
                    stroke={branding.secondaryColor}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={basePoints.length >= 3 ? "" : "4 4"}
                  />
                  {areaValue !== null && projectedPoints.length >= 3 ? (
                    <text
                      x={`${centroidDisplay.x}%`}
                      y={`${centroidDisplay.y}%`}
                      fill={branding.secondaryColor}
                      fontSize="12"
                      textAnchor="middle"
                    >
                      <tspan x={`${centroidDisplay.x}%`} dy="0">
                        Draft Area
                      </tspan>
                      <tspan x={`${centroidDisplay.x}%`} dy="1.2em">
                        {areaValue.toFixed(1)} {measurementUnitLabel(displayUnit, "area")}
                      </tspan>
                    </text>
                  ) : null}
                </>
              )
            })()}
          </svg>
        )}

        {measurementType === "volume" &&
          (sphericalViewModes.includes(currentViewMode) ? projectedVolumePoints : volumePoints).map((point, idx) => {
            if (sphericalViewModes.includes(currentViewMode)) {
              const projectedPoint = point as ProjectedPoint
              if (!projectedPoint.visible) {
                return null
              }
              return (
                <div
                  key={`vol-${idx}`}
                  className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2"
                  style={{
                    left: `${projectedPoint.x}%`,
                    top: `${projectedPoint.y}%`,
                    borderColor: branding.secondaryColor,
                    backgroundColor: "transparent",
                  }}
                />
              )
            }

            const flatPoint = point as { x: number; y: number }
            return (
              <div
                key={`vol-${idx}`}
                className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2"
                style={{
                  left: `${flatPoint.x}%`,
                  top: `${flatPoint.y}%`,
                  borderColor: branding.secondaryColor,
                  backgroundColor: "transparent",
                }}
              />
            )
          })}

        {measurementType === "volume" && volumePoints.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {(() => {
              const basePoints = volumePoints
              const projectedPoints = sphericalViewModes.includes(currentViewMode)
                ? projectedVolumePoints.filter((point) => point.visible)
                : basePoints
              if (projectedPoints.length < 2) return null
              const pointString = projectedPoints
                .map((point) => `${point.x},${point.y}`)
                .join(" ")
              const hoverCandidate =
                !sphericalViewModes.includes(currentViewMode) && hoverPoint
                  ? `${hoverPoint.x},${hoverPoint.y}`
                  : null
              const pathPoints = hoverCandidate ? `${pointString} ${hoverCandidate}` : pointString
              const centroidBase = polygonCentroid(basePoints)
              const centroidDisplay = sphericalViewModes.includes(currentViewMode)
                ? polygonCentroid(
                    projectedPoints.map((point) => ({ x: point.x, y: point.y })),
                  )
                : centroidBase
              const volumeValue =
                basePoints.length >= 3
                  ? calculateVolume(basePoints, pendingVolumeHeight, displayUnit)
                  : null
              return (
                <>
                  <polyline
                    points={pathPoints}
                    stroke={branding.secondaryColor}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={basePoints.length >= 3 ? "" : "4 4"}
                  />
                  {volumeValue !== null && projectedPoints.length >= 3 ? (
                    <text
                      x={`${centroidDisplay.x}%`}
                      y={`${centroidDisplay.y}%`}
                      fill={branding.secondaryColor}
                      fontSize="12"
                      textAnchor="middle"
                    >
                      <tspan x={`${centroidDisplay.x}%`} dy="0">
                        Draft Volume
                      </tspan>
                      <tspan x={`${centroidDisplay.x}%`} dy="1.2em">
                        {volumeValue.toFixed(1)} {measurementUnitLabel(displayUnit, "volume")}
                      </tspan>
                    </text>
                  ) : null}
                </>
              )
            })()}
          </svg>
        )}

        {measurementPanelVisible && (
          <div className="absolute top-4 right-4 z-30 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-800 bg-gray-900/95 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Ruler className="h-4 w-4 text-blue-400" />
                Measurements
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">{measurementCounts.total} total</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-300 hover:text-white"
                  onClick={() => setShowMeasurementPanel(false)}
                  disabled={measuring}
                >
                  Hide
                </Button>
              </div>
            </div>
            <div className="px-4 pt-3 pb-2 text-[11px] text-gray-400">
              <p>
                {measurementType === "distance"
                  ? "Click once to start and again to finish a distance measurement."
                  : measurementType === "area"
                    ? "Click to drop vertices, then double-click or close the loop to capture an area."
                    : "Mark the footprint, then adjust height to estimate volume."}
              </p>
            </div>
            <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-300">
              <label className="flex items-center gap-2">
                <span>Display units</span>
                <select
                  value={displayUnit}
                  onChange={handleDisplayUnitChange}
                  className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ft">Feet</option>
                  <option value="m">Meters</option>
                </select>
              </label>
              <div className="text-[11px] text-gray-500">
                {measurementCounts.distance} distance • {measurementCounts.area} area • {measurementCounts.volume} volume
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto px-4 pb-2">
              {hasMeasurements ? (
                <ul className="space-y-2">
                  {measurements.map((measurement) => {
                    const typeLabel =
                      measurement.measurementType === "distance"
                        ? "Distance"
                        : measurement.measurementType === "area"
                          ? "Area"
                          : "Volume"
                    const valueLabel = formatMeasurementDisplay(measurement)
                    return (
                      <li
                        key={measurement.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            {measurement.label ?? typeLabel}
                          </p>
                          <p className="text-xs text-gray-400">
                            {typeLabel} • {valueLabel}
                          </p>
                          {measurement.measurementType === "volume" && measurement.height ? (
                            <p className="text-[11px] text-gray-500">Height {measurement.height.toFixed(1)} ft</p>
                          ) : null}
                          {measurement.points?.length ? (
                            <p className="text-[11px] text-gray-500">{measurement.points.length} points</p>
                          ) : null}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-gray-400 hover:text-red-400"
                          onClick={() => removeMeasurement(measurement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">
                  No measurements yet. Enable measurement mode to start capturing dimensions.
                </p>
              )}
            </div>
            <div className="space-y-3 border-t border-gray-800 px-4 py-3">
              {measurementType === "volume" ? (
                <label className="flex items-center justify-between text-xs text-gray-300">
                  <span>Volume height (ft)</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={pendingVolumeHeight.toFixed(1)}
                    onChange={handleVolumeHeightChange}
                    className="w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-right text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              ) : null}
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  {measuring ? "Measurement mode active" : hasMeasurements ? "Review captured measurements" : "Measurement mode idle"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={clearMeasurements}
                  disabled={!hasMeasurements}
                >
                  Clear all
                </Button>
              </div>
            </div>
          </div>
        )}

        {!measurementPanelVisible && hasMeasurements && (
          <button
            type="button"
            onClick={() => setShowMeasurementPanel(true)}
            className="absolute top-4 right-4 z-20 rounded-full border border-gray-800 bg-gray-900/80 px-4 py-2 text-xs font-medium text-gray-200 shadow-lg backdrop-blur transition hover:text-white"
          >
            Show measurements ({measurementCounts.total})
          </button>
        )}

        {/* Annotations */}
        {showAnnotations &&
          visibleAnnotations.map((annotation) => {
            const projected = projectedAnnotations[annotation.id]
            if (sphericalViewModes.includes(currentViewMode) && (!projected || !projected.visible)) {
              return null
            }
            const positionStyle =
              sphericalViewModes.includes(currentViewMode)
                ? { left: `${projected?.x ?? 0}%`, top: `${projected?.y ?? 0}%` }
                : { left: `${annotation.x}%`, top: `${annotation.y}%` }
            return (
              <div
                key={annotation.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded bg-black/70 text-white text-xs max-w-xs"
                style={{
                  ...positionStyle,
                  borderLeft: `3px solid ${annotation.color}`,
                }}
              >
                {annotation.text}
              </div>
            )
          })}

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
          {canZoom ? (
            <ZoomControls
              zoomDisplay={`×${zoomDisplay}`}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleZoomReset}
              disableZoomIn={atMinZoom}
              disableZoomOut={atMaxZoom}
              disableReset={atDefaultZoom}
            />
          ) : null}
          <Button
            size="sm"
            variant={measuring ? "default" : "outline"}
            onClick={() => {
              const next = !measuring
              updateMeasuring(next)
              onMeasurementModeChange?.(next)
              setMeasureStart(null)
              setAreaPoints([])
              setVolumePoints([])
              if (next) {
                setShowMeasurementPanel(true)
              }
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
          {scene.dataLayers?.length ? (
            <div className="relative">
              <Button
                size="sm"
                variant={showLayerMenu ? "default" : "outline"}
                onClick={() => setShowLayerMenu((prev) => !prev)}
                className="gap-2"
                aria-expanded={showLayerMenu}
                aria-haspopup="true"
              >
                <Layers className="w-4 h-4" />
                Data Layers
              </Button>
              {showLayerMenu && (
                <div className="absolute left-0 z-30 mt-2 w-64 rounded-lg border border-gray-800 bg-gray-900 p-3 shadow-xl">
                  {showAnnotations ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400">
                        Toggle annotation groups to focus on discipline-specific notes.
                      </p>
                      <div className="space-y-2">
                        {scene.dataLayers.map((layer) => {
                          const active = visibleLayerIds.includes(layer.id)
                          return (
                            <label
                              key={layer.id}
                              className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-gray-800/60"
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => handleLayerToggle(layer.id)}
                                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                              />
                              <div>
                                <p className="text-sm font-semibold text-white">{layer.name}</p>
                                {layer.description ? (
                                  <p className="text-xs text-gray-400">{layer.description}</p>
                                ) : null}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Enable annotations to manage data layers.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <Button
            size="sm"
            variant={autoRotate ? "default" : "outline"}
            onClick={() => setAutoRotate(!autoRotate)}
            className="gap-2"
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            Auto-Rotate
          </Button>
          {autoRotate && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Speed</span>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={autoRotateSpeed}
                onChange={(event) => setAutoRotateSpeed(Number.parseFloat(event.target.value))}
                className="h-1 w-24 accent-blue-500"
                aria-label="Auto rotate speed"
              />
              <span className="font-semibold text-white">{autoRotateSpeed.toFixed(1)}x</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRotateDirection((direction) => (direction === 1 ? -1 : 1))}
                className="gap-1 bg-transparent"
                aria-label="Toggle rotation direction"
              >
                {autoRotateDirection === 1 ? (
                  <>
                    <RotateCw className="w-4 h-4" />
                    CW
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    CCW
                  </>
                )}
              </Button>
            </div>
          )}
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
          {onTourPointCreate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const suggestedLabel = `${scene.name} • ${Math.round(lonRef.current)}°`
                const label = window.prompt("Label this tour point", suggestedLabel)
                if (label !== null) {
                  onTourPointCreate({
                    id: `tour-point-${Date.now()}`,
                    sceneId: scene.id,
                    sceneName: scene.name,
                    yaw: lonRef.current,
                    pitch: latRef.current,
                    note: label.trim(),
                  })
                }
              }}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              Save Tour Point
            </Button>
          )}
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
                {resolvedViewModes.map((mode) => (
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
