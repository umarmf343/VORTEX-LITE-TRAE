"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import type { SphrHotspot, SphrSpace, SphrSpaceNode } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PanoramaViewerProps {
  space: SphrSpace
  activeSceneId?: string
  onSceneChange?: (scene: SphrSpaceNode) => void
  className?: string
}

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

export function PanoramaViewer({ space, activeSceneId, onSceneChange, className }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sphereMeshRef = useRef<THREE.Mesh | null>(null)
  const animationFrameRef = useRef<number>()
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const updateHotspotsRef = useRef<() => void>(() => {})
  const textureLoaderRef = useRef(new THREE.TextureLoader())

  const [internalSceneId, setInternalSceneId] = useState(space.initialNodeId)
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null)
  const [cursorPulse, setCursorPulse] = useState(false)
  const cursorPulseTimeoutRef = useRef<number | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "fade-out" | "fade-in">("idle")

  const nodesById = useMemo(() => {
    return space.nodes.reduce<Record<string, SphrSpaceNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [space.nodes])

  const isControlled = activeSceneId !== undefined
  const effectiveSceneId = useMemo(() => {
    if (isControlled) {
      return nodesById[activeSceneId ?? ""] ? activeSceneId ?? space.initialNodeId : space.initialNodeId
    }
    return nodesById[internalSceneId] ? internalSceneId : space.initialNodeId
  }, [activeSceneId, internalSceneId, isControlled, nodesById, space.initialNodeId])

  useEffect(() => {
    if (!isControlled) {
      setInternalSceneId((current) => (nodesById[current] ? current : space.initialNodeId))
    }
  }, [isControlled, nodesById, space.initialNodeId])

  useEffect(() => {
    const loader = textureLoaderRef.current
    loader.crossOrigin = "anonymous"
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
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000,
    )
    camera.position.set(0, 0, 0.1)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.classList.add("webgl-canvas")
    renderer.domElement.dataset.engine = "three.js r180"
    container.appendChild(renderer.domElement)

    const geometry = new THREE.SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setScalar(0.9),
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

  const currentNode = useMemo(() => {
    return nodesById[effectiveSceneId] ?? space.nodes[0]
  }, [effectiveSceneId, nodesById, space.nodes])

  useEffect(() => {
    if (!currentNode || !sphereMeshRef.current) {
      return
    }

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
      window.setTimeout(() => setTransitionPhase("idle"), 240)
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
        () => loadPanorama(index + 1),
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
    onSceneChange?.(currentNode)
  }, [currentNode, onSceneChange])

  useEffect(() => {
    setHoveredHotspot(null)
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
      if (!nodesById[nodeId]) {
        return
      }
      setTransitionPhase("fade-out")
      window.setTimeout(() => {
        if (!isControlled) {
          setInternalSceneId(nodeId)
        }
        setTransitionPhase("fade-in")
        window.setTimeout(() => setTransitionPhase("idle"), 240)
      }, 160)
    },
    [isControlled, nodesById],
  )

  const handleHotspotClick = useCallback(
    (hotspot: SphrHotspot) => {
      triggerCursorPulse()
      if (hotspot.type === "navigation" && hotspot.targetNodeId) {
        const target = nodesById[hotspot.targetNodeId]
        if (target) {
          onSceneChange?.(target)
          if (!isControlled) {
            navigateToNode(target.id)
          }
        }
        return
      }
    },
    [isControlled, navigateToNode, nodesById, onSceneChange, triggerCursorPulse],
  )

  const registerHotspotRef = useCallback((id: string) => (node: HTMLButtonElement | null) => {
    hotspotRefs.current[id] = node
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setCursorPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [])

  const handlePointerLeave = useCallback(() => {
    setCursorPosition(null)
    setHoveredHotspot(null)
  }, [])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      setCursorPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
      triggerCursorPulse()
    },
    [triggerCursorPulse],
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-slate-800 bg-black",
        className,
      )}
      style={{ minHeight: "min(85vh, 640px)" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      data-testid="panorama-viewer-root"
    >
      <div className="pointer-events-none absolute inset-0">
        {currentNode.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            ref={registerHotspotRef(hotspot.id)}
            className={cn(
              "hotspot pointer-events-auto flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 bg-[rgba(0,136,255,0.82)] shadow-[0_0_12px_rgba(0,136,255,0.6)] transition-transform duration-150",
              hoveredHotspot === hotspot.id ? "scale-110" : "scale-100",
            )}
            onClick={() => handleHotspotClick(hotspot)}
            onMouseEnter={() => setHoveredHotspot(hotspot.id)}
            onMouseLeave={() => setHoveredHotspot((current) => (current === hotspot.id ? null : current))}
            onFocus={() => setHoveredHotspot(hotspot.id)}
            onBlur={() => setHoveredHotspot((current) => (current === hotspot.id ? null : current))}
            aria-label={hotspot.title ?? hotspot.id}
          />
        ))}
      </div>

      {cursorPosition && (
        <div className="pointer-events-none absolute inset-0">
          <div
            className="h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/20 shadow-[0_0_18px_rgba(148,163,184,0.55)] backdrop-blur-sm transition-transform duration-150"
            style={{
              left: `${cursorPosition.x}px`,
              top: `${cursorPosition.y}px`,
              transform: `translate(-50%, -50%) scale(${cursorPulse ? 1.3 : hoveredHotspot ? 1.15 : 1})`,
            }}
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 bg-black transition-opacity duration-300",
          transitionPhase === "fade-out" ? "opacity-80" : "opacity-0",
        )}
      />
    </div>
  )
}
