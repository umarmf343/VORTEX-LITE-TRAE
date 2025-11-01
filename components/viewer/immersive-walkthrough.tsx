"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ImmersiveWalkthroughEngine } from "@/lib/immersive-walkthrough/engine"
import type { ImmersiveWalkthroughSpace, WalkthroughHotspot, WalkthroughNode } from "@/lib/types"
import { logWalkthroughEvent } from "@/lib/analytics"
import { MapPin, NavigationIcon, Pause, Play, RefreshCw } from "@/lib/icons"

interface ImmersiveWalkthroughProps {
  space: ImmersiveWalkthroughSpace
  className?: string
}

type MiniMapNode = WalkthroughNode & { x: number; y: number }

const MINI_MAP_SIZE = 160

export function ImmersiveWalkthrough({ space, className }: ImmersiveWalkthroughProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<ImmersiveWalkthroughEngine | null>(null)
  const [ready, setReady] = useState(false)
  const [activeNode, setActiveNode] = useState<WalkthroughNode | null>(null)
  const [autoTourActive, setAutoTourActive] = useState(false)
  const [freeMove, setFreeMove] = useState(space.manualWalkEnabled ?? false)
  const [activeHotspot, setActiveHotspot] = useState<WalkthroughHotspot | null>(null)
  const [hintVisible, setHintVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeNodeRef = useRef<WalkthroughNode | null>(null)

  const miniMapNodes = useMemo<MiniMapNode[]>(() => {
    if (!space.nodes.length) {
      return []
    }
    const bounds = space.nodes.reduce(
      (acc, node) => {
        const [x, , z] = node.position
        return {
          minX: Math.min(acc.minX, x),
          maxX: Math.max(acc.maxX, x),
          minZ: Math.min(acc.minZ, z),
          maxZ: Math.max(acc.maxZ, z),
        }
      },
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
    )
    const width = Math.max(1, bounds.maxX - bounds.minX)
    const depth = Math.max(1, bounds.maxZ - bounds.minZ)
    return space.nodes.map((node) => ({
      ...node,
      x: ((node.position[0] - bounds.minX) / width) * (MINI_MAP_SIZE - 24) + 12,
      y: ((node.position[2] - bounds.minZ) / depth) * (MINI_MAP_SIZE - 24) + 12,
    }))
  }, [space.nodes])

  const teardownEngine = useCallback(() => {
    engineRef.current?.dispose()
    engineRef.current = null
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const overlay = overlayRef.current
    if (!container || !overlay) {
      return
    }

    const engine = new ImmersiveWalkthroughEngine({
      container,
      overlay,
      space,
      onEvent: (event) => {
        switch (event.type) {
          case "ready":
            setReady(true)
            logWalkthroughEvent("enter_walkthrough", {
              spaceId: space.spaceId,
              nodeId: space.defaultNodeId,
            })
            break
          case "nodechange":
            setActiveNode(event.node)
            activeNodeRef.current = event.node
            logWalkthroughEvent("navigate_node", {
              spaceId: space.spaceId,
              nodeId: event.node.id,
              metadata: { label: event.node.label, tags: event.node.tags },
            })
            break
          case "hotspot":
            setActiveHotspot(event.hotspot)
            logWalkthroughEvent("enter_hotspot", {
              spaceId: space.spaceId,
              nodeId: activeNodeRef.current?.id,
              hotspotId: event.hotspot.id,
              metadata: { type: event.hotspot.type },
            })
            break
          case "autotour":
            setAutoTourActive(event.state === "start")
            if (event.state === "start" && event.node) {
              logWalkthroughEvent("auto_tour_start", {
                spaceId: space.spaceId,
                nodeId: event.node.id,
              })
            }
            if (event.state === "stop") {
              logWalkthroughEvent("auto_tour_stop", {
                spaceId: space.spaceId,
                nodeId: event.node?.id,
              })
            }
            break
          default:
            break
        }
      },
    })

    engineRef.current = engine
    engine
      .initialize()
      .then(() => {
        setError(null)
        setFreeMove(space.manualWalkEnabled ?? false)
      })
      .catch((initializationError) => {
        console.error("Failed to initialise immersive walkthrough", initializationError)
        setError(
          initializationError instanceof Error
            ? initializationError.message
            : "Failed to initialise immersive walkthrough",
        )
      })

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      engine.resize(rect.width, rect.height)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      logWalkthroughEvent("exit_walkthrough", { spaceId: space.spaceId, nodeId: activeNodeRef.current?.id })
      teardownEngine()
    }
  }, [space, teardownEngine])

  useEffect(() => {
    if (!activeHotspot) return
    const timeout = window.setTimeout(() => setActiveHotspot(null), 5500)
    return () => window.clearTimeout(timeout)
  }, [activeHotspot])

  const handleNavigateNext = useCallback(() => {
    engineRef.current?.navigateToNextNode()
  }, [])

  const handleNavigatePrevious = useCallback(() => {
    engineRef.current?.navigateToPreviousNode()
  }, [])

  const toggleFreeMove = useCallback(() => {
    const next = !freeMove
    setFreeMove(next)
    engineRef.current?.enableFreeMove(next)
  }, [freeMove])

  const toggleAutoTour = useCallback(() => {
    const next = !autoTourActive
    setAutoTourActive(next)
    engineRef.current?.setAutoTour(next, space.autoTour?.dwellMs ?? 4800)
  }, [autoTourActive, space.autoTour?.dwellMs])

  const miniMapConnections = useMemo(() => {
    if (!space.nodes.length) {
      return [] as Array<{ from: WalkthroughNode; to: WalkthroughNode }>
    }
    const nodeLookup = new Map(space.nodes.map((node) => [node.id, node]))
    const edges: Array<{ from: WalkthroughNode; to: WalkthroughNode }> = []
    space.nodes.forEach((node) => {
      ;(node.connectedTo ?? []).forEach((targetId) => {
        const target = nodeLookup.get(targetId)
        if (target) {
          edges.push({ from: node, to: target })
        }
      })
    })
    return edges
  }, [space.nodes])

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={overlayRef} className="absolute inset-0" />

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-3 text-center text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
            <p className="text-sm uppercase tracking-widest text-emerald-200">Preparing walkthrough</p>
            <p className="max-w-xs text-xs text-gray-300">
              Loading spatial mesh, textures, and lighting probes for immersive navigation.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="max-w-sm rounded-lg border border-rose-500/60 bg-black/70 p-6 text-white shadow-lg">
            <p className="text-lg font-semibold">Unable to start immersive walkthrough</p>
            <p className="mt-2 text-sm text-gray-300">{error}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end gap-4 p-6">
        <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-3 shadow-xl backdrop-blur">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={handleNavigatePrevious}
          >
            <NavigationIcon className="mr-2 h-4 w-4 rotate-180" />Previous Point
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={handleNavigateNext}
          >
            <NavigationIcon className="mr-2 h-4 w-4" />Next Point
          </Button>
          <Button
            size="sm"
            variant={freeMove ? "default" : "ghost"}
            className={cn(
              "rounded-full border border-white/10",
              freeMove ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400" : "bg-white/5 text-white hover:bg-white/10",
            )}
            onClick={toggleFreeMove}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {freeMove ? "Free Move Enabled" : "Enable Free Move"}
          </Button>
          <Button
            size="sm"
            variant={autoTourActive ? "default" : "ghost"}
            className={cn(
              "rounded-full border border-white/10",
              autoTourActive ? "bg-blue-500 text-blue-950 hover:bg-blue-400" : "bg-white/5 text-white hover:bg-white/10",
            )}
            onClick={toggleAutoTour}
          >
            {autoTourActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {autoTourActive ? "Pause Auto Tour" : "Start Auto Tour"}
          </Button>
        </div>

        {activeNode && (
          <div className="pointer-events-none rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-medium uppercase tracking-widest text-white shadow-lg">
            <span className="text-emerald-300">Walkthrough</span>
            <span className="mx-2 text-white/40">•</span>
            {activeNode.label ?? activeNode.id}
          </div>
        )}
      </div>

      {hintVisible && ready && (
        <div className="pointer-events-auto absolute top-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white shadow-lg">
          <p className="flex items-center gap-2 font-medium uppercase tracking-widest text-emerald-200">
            <NavigationIcon className="h-4 w-4" /> Immersive Walkthrough Controls
          </p>
          <p className="text-[11px] text-white/80 md:text-xs">
            Click and drag to look around • WASD or arrows to move • Tap nodes on the minimap to jump between rooms
          </p>
          <button
            type="button"
            onClick={() => setHintVisible(false)}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/80 transition hover:bg-white/20"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col gap-2">
        <div
          className="relative rounded-2xl border border-white/15 bg-black/60 p-4 shadow-lg backdrop-blur"
          style={{ width: MINI_MAP_SIZE, height: MINI_MAP_SIZE }}
        >
          <div className="absolute inset-4 rounded-xl border border-white/10" />
          {miniMapConnections.map((connection) => {
            const from = miniMapNodes.find((node) => node.id === connection.from.id)
            const to = miniMapNodes.find((node) => node.id === connection.to?.id)
            if (!from || !to) return null
            return (
              <div
                key={`${from.id}-${to.id}`}
                className="absolute h-[1px] origin-left bg-white/10"
                style={{
                  left: from.x,
                  top: from.y,
                  width: Math.hypot(to.x - from.x, to.y - from.y),
                  transform: `rotate(${(Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI}deg)`,
                }}
              />
            )
          })}
          {miniMapNodes.map((node) => {
            const isActive = activeNode?.id === node.id
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => engineRef.current?.navigateToNode(node.id)}
                className={cn(
                  "absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border",
                  isActive
                    ? "border-emerald-200 bg-emerald-500 text-emerald-950"
                    : "border-white/30 bg-black/70 text-white",
                )}
                style={{ left: node.x, top: node.y }}
              >
                <MapPin className="h-3 w-3" />
              </button>
            )
          })}
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-emerald-950 shadow">
            Mini View
          </Badge>
        </div>

        {activeHotspot && (
          <div className="max-w-xs rounded-xl border border-white/10 bg-black/70 p-4 text-white shadow-lg backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-emerald-300">Hotspot</p>
            <p className="mt-1 text-sm font-semibold">{activeHotspot.title}</p>
            {activeHotspot.description && (
              <p className="mt-1 text-xs text-white/80">{activeHotspot.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
