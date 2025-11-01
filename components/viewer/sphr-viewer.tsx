"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import type { SphrHotspot, SphrSpace, SphrSpaceNode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { NavigationIcon, Play, X } from "@/lib/icons"

interface SphrViewerProps {
  space: SphrSpace
  onNodeChange?: (node: SphrSpaceNode) => void
  onHotspotActivate?: (hotspot: SphrHotspot) => void
}

const PANORAMA_DEFAULT_INTENSITY = 0.85
const PANORAMA_FALLBACK_URL = "/panorama-samples/living-room.jpg"
const PANORAMA_GUESS_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const

const buildPanoramaCandidates = (sourceUrl?: string | null): string[] => {
  if (!sourceUrl) {
    return [PANORAMA_FALLBACK_URL]
  }

  const trimmed = sourceUrl.trim()
  if (!trimmed) {
    return [PANORAMA_FALLBACK_URL]
  }

  // Ignore query/hash when checking for a file extension.
  const urlWithoutParams = trimmed.split(/[?#]/)[0] ?? ""
  const hasExtension = /\.[^/.]+$/.test(urlWithoutParams)
  const candidates: string[] = [trimmed]

  if (!hasExtension && !trimmed.startsWith("data:")) {
    const suffix = trimmed.includes("?") || trimmed.includes("#")
      ? trimmed.slice(urlWithoutParams.length)
      : ""

    for (const extension of PANORAMA_GUESS_EXTENSIONS) {
      candidates.push(`${urlWithoutParams}.${extension}${suffix}`)
    }
  }

  if (!candidates.includes(PANORAMA_FALLBACK_URL)) {
    candidates.push(PANORAMA_FALLBACK_URL)
  }

  return [...new Set(candidates)]
}

const sphericalToCartesian = (yawDeg: number, pitchDeg: number) => {
  const yaw = THREE.MathUtils.degToRad(yawDeg)
  const pitch = THREE.MathUtils.degToRad(pitchDeg)

  const x = Math.cos(pitch) * Math.sin(yaw)
  const y = Math.sin(pitch)
  const z = Math.cos(pitch) * Math.cos(yaw)

  return new THREE.Vector3(x, y, z).normalize()
}

export function SphrViewer({ space, onNodeChange, onHotspotActivate }: SphrViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sphereMeshRef = useRef<THREE.Mesh | null>(null)
  const animationFrameRef = useRef<number>()
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const updateHotspotsRef = useRef<() => void>(() => {})
  const textureLoaderRef = useRef(new THREE.TextureLoader())

  const [activeNodeId, setActiveNodeId] = useState<string>(() => space.initialNodeId)
  const [activeHotspot, setActiveHotspot] = useState<SphrHotspot | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null)
  const [cursorPulse, setCursorPulse] = useState(false)
  const cursorPulseTimeoutRef = useRef<number | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "fade-out" | "fade-in">("idle")
  const navigationTimeoutRef = useRef<number | null>(null)
  const fadeTimeoutRef = useRef<number | null>(null)

  const nodesById = useMemo(() => {
    return space.nodes.reduce<Record<string, SphrSpaceNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [space.nodes])

  useEffect(() => {
    setActiveNodeId((current) => {
      if (space.nodes.some((node) => node.id === current)) {
        return current
      }
      return space.initialNodeId
    })
  }, [space.initialNodeId, space.nodes])

  useEffect(() => {
    setTransitionPhase("fade-in")
    fadeTimeoutRef.current = window.setTimeout(() => {
      setTransitionPhase("idle")
    }, 260)
    return () => {
      if (cursorPulseTimeoutRef.current) {
        window.clearTimeout(cursorPulseTimeoutRef.current)
      }
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current)
      }
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current)
      }
    }
  }, [])

  const currentNode = useMemo(() => {
    return nodesById[activeNodeId] ?? space.nodes[0]
  }, [activeNodeId, nodesById, space.nodes])

  const registerHotspotRef = useCallback((id: string) => (node: HTMLButtonElement | null) => {
    hotspotRefs.current[id] = node
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(
      space.defaultFov ?? 75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(0, 0, 0.1)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const geometry = new THREE.SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setScalar(PANORAMA_DEFAULT_INTENSITY),
      side: THREE.BackSide,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer
    sphereMeshRef.current = sphere

    let controls: OrbitControls | null = null
    let disposed = false

    ;(async () => {
      const module = await import("three/examples/jsm/controls/OrbitControls")
      if (disposed) {
        return
      }
      controls = new module.OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.enablePan = false
      controls.enableZoom = true
      controls.rotateSpeed = 0.35
      controls.maxDistance = 5
      controls.minDistance = 0.1
      controlsRef.current = controls
    })()

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) {
        return
      }
      const { clientWidth, clientHeight } = containerRef.current
      cameraRef.current.aspect = clientWidth / Math.max(clientHeight, 1)
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(clientWidth, clientHeight)
    }

    const renderLoop = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return
      }
      controls?.update()
      rendererRef.current.render(sceneRef.current, cameraRef.current)
      updateHotspotsRef.current()
      animationFrameRef.current = requestAnimationFrame(renderLoop)
    }

    renderLoop()
    window.addEventListener("resize", handleResize)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => handleResize())
      resizeObserver.observe(container)
    }

    return () => {
      disposed = true
      window.removeEventListener("resize", handleResize)
      resizeObserver?.disconnect()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      controls?.dispose()
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [space.defaultFov])

  useEffect(() => {
    const loader = textureLoaderRef.current
    loader.crossOrigin = "anonymous"
  }, [])

  useEffect(() => {
    if (!currentNode || !sphereMeshRef.current) {
      return
    }

    setActiveHotspot(null)

    let cancelled = false
    const loader = textureLoaderRef.current

    const applyTexture = (texture: THREE.Texture) => {
      if (cancelled) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      const mesh = sphereMeshRef.current
      if (!mesh) {
        texture.dispose()
        return
      }
      const material = mesh.material as THREE.MeshBasicMaterial
      if (material.map) {
        material.map.dispose()
      }
      material.map = texture
      material.needsUpdate = true
      setTransitionPhase("fade-in")
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current)
      }
      fadeTimeoutRef.current = window.setTimeout(() => {
        setTransitionPhase("idle")
      }, 240)
    }

    const candidates = buildPanoramaCandidates(currentNode.panoramaUrl)

    const loadPanorama = (index: number) => {
      if (cancelled || index >= candidates.length) {
        return
      }

      const candidateUrl = candidates[index]
      loader.load(
        candidateUrl,
        (texture) => {
          applyTexture(texture)
        },
        undefined,
        (error) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Failed to load panorama", candidateUrl, error)
          }
          loadPanorama(index + 1)
        },
      )
    }

    loadPanorama(0)

    return () => {
      cancelled = true
    }
  }, [currentNode])

  useEffect(() => {
    if (!currentNode) {
      return
    }
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera) {
      return
    }

    const yaw = currentNode.initialYaw ?? 0
    const pitch = currentNode.initialPitch ?? 0
    const target = sphericalToCartesian(yaw, pitch)

    camera.lookAt(target)
    camera.updateProjectionMatrix()
    controls?.target.copy(target)
    controls?.update()
  }, [currentNode])

  useEffect(() => {
    if (!currentNode) {
      return
    }
    onNodeChange?.(currentNode)
  }, [currentNode, onNodeChange])

  useEffect(() => {
    setHoveredHotspotId(null)
  }, [currentNode])

  useEffect(() => {
    updateHotspotsRef.current = () => {
      const camera = cameraRef.current
      const renderer = rendererRef.current
      const node = currentNode
      if (!camera || !renderer || !node) {
        return
      }

      const width = renderer.domElement.clientWidth
      const height = renderer.domElement.clientHeight
      const vector = new THREE.Vector3()

      node.hotspots.forEach((hotspot) => {
        const element = hotspotRefs.current[hotspot.id]
        if (!element) {
          return
        }

        vector.copy(sphericalToCartesian(hotspot.yaw, hotspot.pitch))
        vector.project(camera)

        const isVisible = vector.z < 1
        const x = (vector.x * 0.5 + 0.5) * width
        const y = (-vector.y * 0.5 + 0.5) * height

        element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
        element.style.opacity = isVisible ? "1" : "0"
        element.style.pointerEvents = isVisible ? "auto" : "none"
      })
    }
  }, [currentNode])

  useEffect(() => {
    updateHotspotsRef.current()
  }, [currentNode])

  const triggerCursorPulse = useCallback(() => {
    if (cursorPulseTimeoutRef.current) {
      window.clearTimeout(cursorPulseTimeoutRef.current)
    }
    setCursorPulse(true)
    cursorPulseTimeoutRef.current = window.setTimeout(() => {
      setCursorPulse(false)
    }, 220)
  }, [])

  const navigateToNode = useCallback(
    (nodeId: string) => {
      if (nodeId === activeNodeId) {
        return
      }
      setActiveHotspot(null)
      setTransitionPhase("fade-out")
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current)
      }
      navigationTimeoutRef.current = window.setTimeout(() => {
        setActiveNodeId(nodeId)
      }, 180)
    },
    [activeNodeId],
  )

  const handleHotspotClick = useCallback(
    (hotspot: SphrHotspot) => {
      onHotspotActivate?.(hotspot)
      triggerCursorPulse()
      if (hotspot.type === "navigation" && hotspot.targetNodeId) {
        navigateToNode(hotspot.targetNodeId)
        return
      }
      setActiveHotspot(hotspot)
    },
    [navigateToNode, onHotspotActivate, triggerCursorPulse],
  )

  const handleCloseHotspot = useCallback(() => {
    setActiveHotspot(null)
  }, [])

  const handleNodeSelect = useCallback((nodeId: string) => {
    navigateToNode(nodeId)
    setActiveHotspot(null)
  }, [navigateToNode])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setCursorPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [])

  const handlePointerLeave = useCallback(() => {
    setCursorPosition(null)
    setHoveredHotspotId(null)
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      setCursorPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      triggerCursorPulse()
    },
    [triggerCursorPulse],
  )

  if (!currentNode) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-950/70 text-gray-300">
        No panorama nodes configured for this property.
      </div>
    )
  }
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-black max-h-[90vh] xl:max-h-[95vh] min-h-[320px] aspect-[16/9] lg:aspect-[21/9]"
      ref={containerRef}
      style={{ minHeight: "max(320px, var(--viewer-min-h, 65vh))" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      data-testid="sphr-viewer-root"
    >
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {currentNode.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            ref={registerHotspotRef(hotspot.id)}
            className="group pointer-events-auto flex flex-col items-center gap-2"
            onClick={() => handleHotspotClick(hotspot)}
            onMouseEnter={() => setHoveredHotspotId(hotspot.id)}
            onMouseLeave={() => setHoveredHotspotId((current) => (current === hotspot.id ? null : current))}
            onFocus={() => setHoveredHotspotId(hotspot.id)}
            onBlur={() => setHoveredHotspotId((current) => (current === hotspot.id ? null : current))}
          >
            <span className="sr-only">{hotspot.title}</span>
            <span
              className={cn(
                "relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/40 shadow-[0_0_12px_rgba(59,130,246,0.35)] transition-all duration-200",
                hotspot.type === "navigation"
                  ? "bg-emerald-400/70 border-emerald-200/70 shadow-[0_0_16px_rgba(16,185,129,0.55)]"
                  : hotspot.type === "media"
                    ? "bg-indigo-400/70 border-indigo-200/70 shadow-[0_0_16px_rgba(99,102,241,0.55)]"
                    : "bg-sky-400/70 border-sky-200/70 shadow-[0_0_16px_rgba(56,189,248,0.55)]",
                hoveredHotspotId === hotspot.id ? "scale-110" : "scale-100",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-white/90" />
            </span>
            <span className="pointer-events-none rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              {hotspot.title}
            </span>
          </button>
        ))}
      </div>
      {cursorPosition && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <div
            className="h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/10 shadow-[0_0_20px_rgba(148,163,184,0.45)] backdrop-blur-sm transition-all duration-150"
            style={{
              left: `${cursorPosition.x}px`,
              top: `${cursorPosition.y}px`,
              transform: `translate(-50%, -50%) scale(${cursorPulse ? 1.25 : hoveredHotspotId ? 1.1 : 1})`,
              opacity: 0.9,
            }}
            data-testid="cursor-indicator"
          />
        </div>
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 bg-black transition-opacity duration-300",
          transitionPhase === "fade-out" ? "opacity-80" : "opacity-0",
        )}
        data-testid="scene-fade-overlay"
      />

      <div className="pointer-events-none absolute left-4 top-4 flex max-w-xs flex-col gap-3">
        <Card className="pointer-events-auto bg-slate-900/85 p-4 text-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Panorama Navigation</p>
              <h2 className="text-lg font-semibold text-white">{currentNode.name}</h2>
            </div>
            <Badge variant="outline" className="border-emerald-400/60 text-emerald-300">
              SPHR
            </Badge>
          </div>
          {space.description && (
            <p className="mt-3 text-sm text-slate-300">{space.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {space.nodes.map((node) => (
              <Button
                key={node.id}
                size="sm"
                variant={node.id === currentNode.id ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  node.id === currentNode.id
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700",
                )}
                onClick={() => handleNodeSelect(node.id)}
              >
                {node.name}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {activeHotspot && (
        <Card className="pointer-events-auto absolute bottom-6 right-6 max-w-sm bg-slate-900/90 p-4 text-slate-50 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Hotspot Detail</p>
              <h3 className="text-lg font-semibold text-white">{activeHotspot.title}</h3>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-slate-300 hover:text-white"
              onClick={handleCloseHotspot}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {activeHotspot.description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{activeHotspot.description}</p>
          )}
          {activeHotspot.mediaUrl && (
            <Button
              className="mt-4 w-full"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open(activeHotspot.mediaUrl, "_blank", "noopener")
                }
              }}
            >
              <Play className="mr-2 h-4 w-4" /> Play media
            </Button>
          )}
          {activeHotspot.type === "navigation" && activeHotspot.targetNodeId && (
            <Button className="mt-4 w-full" onClick={() => handleNodeSelect(activeHotspot.targetNodeId!)}>
              <NavigationIcon className="mr-2 h-4 w-4" /> Jump to {nodesById[activeHotspot.targetNodeId]?.name ?? "next node"}
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
