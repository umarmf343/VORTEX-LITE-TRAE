"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  FloorPlan,
  PanoramaTourManifest,
  Property,
  SphrHotspot,
  SphrSpace,
  SphrSpaceNode,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PanoramaViewer } from "./panorama-viewer"
import { cn } from "@/lib/utils"
import { NavigationIcon } from "@/lib/icons"

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeYaw = (value: number) => {
  const wrapped = ((value % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

const percentageToYawPitch = (xPercent: number, yPercent: number) => {
  const yaw = normalizeYaw((clamp(xPercent, 0, 100) / 100) * 360 - 180)
  const pitch = clamp(90 - (clamp(yPercent, 0, 100) / 100) * 180, -90, 90)
  return { yaw, pitch }
}

const ensurePanoramaAssetUrl = (value?: string): string => {
  if (!value) {
    return ""
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  const [pathOnly] = trimmed.split(/[?#]/)
  if (pathOnly && /\.[a-zA-Z0-9]+$/.test(pathOnly)) {
    return trimmed
  }
  return `${trimmed}.jpg`
}

const deriveHotspots = (
  scene: PanoramaTourManifest["scenes"][number],
  manifest: PanoramaTourManifest,
): SphrHotspot[] => {
  const manifestHotspots = scene.hotspots?.length ? scene.hotspots : manifest.navigationGraph?.[scene.id] ?? []
  return manifestHotspots.map((hotspot) => {
    const { yaw, pitch } =
      typeof hotspot.yaw === "number" && typeof hotspot.pitch === "number"
        ? { yaw: hotspot.yaw, pitch: hotspot.pitch }
        : percentageToYawPitch(hotspot.x ?? 50, hotspot.y ?? 50)

    return {
      id: hotspot.id,
      title: hotspot.label ?? hotspot.id,
      type: "navigation" as const,
      yaw,
      pitch,
      targetNodeId: hotspot.targetSceneId,
    }
  })
}

const manifestToSpace = (manifest: PanoramaTourManifest): SphrSpace => {
  const nodes = manifest.scenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    panoramaUrl: ensurePanoramaAssetUrl(scene.imageUrl),
    initialYaw: scene.initialView?.yaw ?? 0,
    initialPitch: scene.initialView?.pitch ?? 0,
    hotspots: deriveHotspots(scene, manifest),
  }))

  const initialScene = manifest.scenes.find((scene) => scene.id === manifest.initialSceneId)

  return {
    nodes,
    initialNodeId: manifest.initialSceneId,
    defaultFov: initialScene?.initialView?.fov ?? 90,
    description: manifest.title,
  }
}

interface TourPlayerProps {
  property: Property
  floorPlan?: FloorPlan | null
  onLeadCapture?: () => void
}

export function TourPlayer({ property }: TourPlayerProps) {
  const manifest = property.panoramaWalkthrough ?? null

  const fallbackSpace = useMemo(() => {
    if (!manifest) {
      return null
    }
    try {
      return manifestToSpace(manifest)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to convert panorama manifest", error)
      }
      return null
    }
  }, [manifest])

  const space = useMemo<SphrSpace | null>(() => {
    if (property.sphrSpace?.nodes?.length) {
      return property.sphrSpace
    }
    return fallbackSpace
  }, [fallbackSpace, property.sphrSpace])

  const [viewerActive, setViewerActive] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(() => space?.initialNodeId)
  const [currentScene, setCurrentScene] = useState<SphrSpaceNode | null>(() =>
    space?.nodes.find((node) => node.id === space.initialNodeId) ?? null,
  )

  useEffect(() => {
    if (space) {
      setActiveSceneId(space.initialNodeId)
      setCurrentScene(space.nodes.find((node) => node.id === space.initialNodeId) ?? null)
    }
  }, [space])

  const handleSceneChange = (node: SphrSpaceNode) => {
    setCurrentScene(node)
    setActiveSceneId(node.id)
  }

  if (!space || space.nodes.length === 0) {
    return (
      <Card className="h-full w-full border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-slate-200">
        <p className="text-lg font-semibold">Panorama scenes not available</p>
        <p className="mt-2 text-sm text-slate-400">
          Upload 360° images and configure hotspots in the admin dashboard to enable the walkthrough experience.
        </p>
      </Card>
    )
  }

  const heroImage = ensurePanoramaAssetUrl(space.nodes[0]?.panoramaUrl)

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/80 p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight">{property.name}</h1>
            <p className="text-sm text-slate-300">{property.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <Badge variant="outline" className="border-blue-500/40 text-blue-200">
                {property.bedrooms} bed
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-200">
                {property.bathrooms} bath
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-200">
                {property.sqft.toLocaleString()} sqft
              </Badge>
              {manifest ? (
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
                  {manifest.scenes.length} scenes
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 text-left lg:items-end lg:text-right">
            <p className="text-2xl font-semibold text-white">Immersive Walkthrough</p>
            <p className="max-w-md text-sm text-slate-300">
              Step through the property with 360° panoramas. Click glowing hotspots to move between rooms and explore every
              angle.
            </p>
            <Button
              size="lg"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => setViewerActive(true)}
            >
              <NavigationIcon className="mr-2 h-4 w-4" /> Walkthrough
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {viewerActive ? (
          <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-6">
            <div className="relative">
              <PanoramaViewer
                space={space}
                activeSceneId={activeSceneId}
                onSceneChange={handleSceneChange}
                className="h-[min(75vh,640px)]"
              />
              {currentScene ? (
                <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-black/60 px-4 py-2 text-sm text-slate-200 shadow-lg">
                  <span className="font-semibold text-white">{currentScene.name}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-slate-300">Panorama</span>
                </div>
              ) : null}
            </div>

            <Card className="border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">Scenes</p>
                  <h2 className="text-lg font-semibold text-white">Jump to another room</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {space.nodes.map((node) => (
                    <Button
                      key={node.id}
                      size="sm"
                      variant={node.id === activeSceneId ? "default" : "outline"}
                      className={cn(
                        node.id === activeSceneId
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "border-slate-700 text-slate-200 hover:bg-slate-800",
                      )}
                      onClick={() => {
                        setViewerActive(true)
                        setActiveSceneId(node.id)
                        setCurrentScene(node)
                      }}
                    >
                      {node.name}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-12">
            <div className="relative h-64 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800">
              {heroImage ? (
                <img src={heroImage} alt="Walkthrough preview" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  Panorama preview unavailable
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute bottom-6 left-6 max-w-xl space-y-3 text-left text-white">
                <p className="text-sm uppercase tracking-widest text-blue-200/80">Virtual Walkthrough</p>
                <h2 className="text-2xl font-semibold">
                  Explore {property.name} with smooth scene-to-scene transitions and intuitive hotspot navigation.
                </h2>
              </div>
            </div>
            <Button
              size="lg"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => setViewerActive(true)}
            >
              <NavigationIcon className="mr-2 h-4 w-4" /> Start Walkthrough
            </Button>
            <p className="max-w-2xl text-center text-sm text-slate-300">
              Click anywhere inside the panorama to look around. Glowing markers reveal interactive hotspots—select one to
              transition to the linked scene with a gentle fade.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
