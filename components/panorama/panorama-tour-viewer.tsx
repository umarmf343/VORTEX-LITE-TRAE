"use client"

import { useMemo, useState } from "react"

import type { PanoramaTourManifest, SphrSpace, SphrSpaceNode } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SphrViewer } from "@/components/viewer/sphr-viewer"

interface PanoramaTourViewerProps {
  manifest: PanoramaTourManifest | null
}

export function PanoramaTourViewer({ manifest }: PanoramaTourViewerProps) {
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(() => manifest?.initialSceneId)

  const space = useMemo<SphrSpace | null>(() => {
    if (!manifest) {
      return null
    }
    const nodes: SphrSpaceNode[] = manifest.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      panoramaUrl: scene.imageUrl,
      initialYaw: scene.initialView.yaw,
      initialPitch: scene.initialView.pitch,
      hotspots: scene.hotspots.map((hotspot) => ({
        id: hotspot.id,
        title: hotspot.label,
        description: hotspot.autoAlignmentYaw !== undefined ? "Auto-align" : undefined,
        type: "navigation",
        yaw: hotspot.yaw,
        pitch: hotspot.pitch,
        targetNodeId: hotspot.targetSceneId,
      })),
    }))

    return {
      nodes,
      initialNodeId: manifest.initialSceneId,
      defaultFov:
        manifest.scenes.find((scene) => scene.id === manifest.initialSceneId)?.initialView.fov ?? 90,
      description: `${manifest.scenes.length} scenes · generated ${new Date(manifest.publishedAt).toLocaleString()}`,
    }
  }, [manifest])

  if (!manifest || !space) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Panorama walkthrough preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Publish the tour to generate a manifest and unlock the panorama renderer preview.
          </p>
        </CardContent>
      </Card>
    )
  }

  const nodes = space.nodes
  const fallbackSceneId = nodes[0]?.id
  const currentSceneId = activeSceneId && nodes.some((node) => node.id === activeSceneId)
    ? activeSceneId
    : fallbackSceneId

  const adjustedSpace = useMemo<SphrSpace>(() => {
    if (!currentSceneId) {
      return space
    }
    return {
      ...space,
      initialNodeId: currentSceneId,
    }
  }, [space, currentSceneId])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Panorama walkthrough preview</CardTitle>
          <p className="text-sm text-muted-foreground">Use hotspots to move between rooms in the published manifest.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentSceneId}
            onValueChange={(value) => setActiveSceneId(value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Jump to scene" />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setActiveSceneId(manifest.initialSceneId)}>
            Reset view
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <SphrViewer
            key={adjustedSpace.initialNodeId}
            space={adjustedSpace}
            onNodeChange={(node) => setActiveSceneId(node.id)}
          />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Manifest summary</div>
          <div>
            {manifest.scenes.length} scenes · {Object.values(manifest.navigationGraph).reduce((acc, items) => acc + items.length, 0)}
            {" "}hotspots
          </div>
          <div>Published {new Date(manifest.publishedAt).toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  )
}
