"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import type { SphrHotspot, SphrSpace, SphrSpaceNode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AlertCircle, Navigation, Play, X } from "@/lib/icons"

interface SphrViewerProps {
  space: SphrSpace
  onNodeChange?: (node: SphrSpaceNode) => void
  onHotspotActivate?: (hotspot: SphrHotspot) => void
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
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
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

    return () => {
      disposed = true
      window.removeEventListener("resize", handleResize)
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

    loader.load(
      currentNode.panoramaUrl,
      (texture) => {
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
      },
      undefined,
      (error) => {
        console.warn("Failed to load panorama", currentNode.panoramaUrl, error)
      },
    )

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

  const handleHotspotClick = useCallback(
    (hotspot: SphrHotspot) => {
      onHotspotActivate?.(hotspot)
      if (hotspot.type === "navigation" && hotspot.targetNodeId) {
        setActiveNodeId(hotspot.targetNodeId)
        return
      }
      setActiveHotspot(hotspot)
    },
    [onHotspotActivate],
  )

  const handleCloseHotspot = useCallback(() => {
    setActiveHotspot(null)
  }, [])

  const handleNodeSelect = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId)
    setActiveHotspot(null)
  }, [])

  if (!currentNode) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-950/70 text-gray-300">
        No immersive nodes configured for this property.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-800 bg-black" ref={containerRef}>
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {currentNode.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            ref={registerHotspotRef(hotspot.id)}
            className={cn(
              "pointer-events-auto rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white shadow-lg transition", 
              hotspot.type === "navigation"
                ? "bg-emerald-500/80 hover:bg-emerald-400"
                : hotspot.type === "media"
                  ? "bg-indigo-500/80 hover:bg-indigo-400"
                  : "bg-slate-900/80 hover:bg-slate-800",
            )}
            onClick={() => handleHotspotClick(hotspot)}
          >
            {hotspot.type === "navigation" ? (
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {hotspot.title}
              </span>
            ) : hotspot.type === "media" ? (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {hotspot.title}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {hotspot.title}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute left-4 top-4 flex max-w-xs flex-col gap-3">
        <Card className="pointer-events-auto bg-slate-900/85 p-4 text-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Immersive Navigation</p>
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
              <Navigation className="mr-2 h-4 w-4" /> Jump to {nodesById[activeHotspot.targetNodeId]?.name ?? "next node"}
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
