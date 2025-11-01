"use client"

import { useCallback, useEffect, useState, useTransition } from "react"

import { SceneAdminDashboard } from "@/components/panorama/scene-admin-dashboard"
import { PanoramaTourViewer } from "@/components/panorama/panorama-tour-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, RefreshCw } from "@/lib/icons"
import type { PanoramaScene, PanoramaTourManifest } from "@/lib/types"
import type { PanoramaSceneEngineSnapshot } from "@/lib/server/panorama-scene-engine"

interface PanoramaTourBuilderProps {
  propertyId?: string
  propertyName?: string
}

interface SnapshotState {
  snapshot: PanoramaSceneEngineSnapshot | null
  isLoading: boolean
  error?: string
}

export function PanoramaTourBuilder({ propertyId, propertyName }: PanoramaTourBuilderProps) {
  const [{ snapshot, isLoading, error }, setSnapshotState] = useState<SnapshotState>({
    snapshot: null,
    isLoading: true,
  })
  const [isRefreshing, startRefresh] = useTransition()

  const loadSnapshot = useCallback(async () => {
    setSnapshotState((current) => ({ ...current, isLoading: true, error: undefined }))
    try {
      const response = await fetch("/api/scenes/list", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const data = (await response.json()) as PanoramaSceneEngineSnapshot
      setSnapshotState({ snapshot: data, isLoading: false })
    } catch (loadError) {
      setSnapshotState({
        snapshot: null,
        isLoading: false,
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the panorama scene configuration.",
      })
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot, propertyId])

  const handleScenesChange = useCallback((scenes: PanoramaScene[]) => {
    setSnapshotState((current) => {
      if (!current.snapshot) {
        return current
      }
      return {
        ...current,
        snapshot: {
          ...current.snapshot,
          scenes,
        },
      }
    })
  }, [])

  const handlePublish = useCallback((manifest: PanoramaTourManifest) => {
    setSnapshotState((current) => {
      if (!current.snapshot) {
        return current
      }
      return {
        ...current,
        snapshot: {
          ...current.snapshot,
          manifest,
          initialSceneId: manifest.initialSceneId,
        },
      }
    })
  }, [])

  const retryLoad = useCallback(() => {
    startRefresh(() => {
      void loadSnapshot()
    })
  }, [loadSnapshot])

  if (isLoading) {
    return (
      <Card className="border border-dashed border-slate-200 bg-slate-50">
        <CardContent className="flex h-48 items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading panorama tour workspace…</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !snapshot) {
    return (
      <Card className="border border-rose-200 bg-rose-50/60">
        <CardContent className="flex flex-col gap-3 p-6 text-sm text-rose-900">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5" />
            Unable to load the panorama scene engine snapshot.
          </div>
          <p className="leading-relaxed text-rose-800/90">
            {error ?? "Please verify the API endpoint is reachable and try refreshing the workspace."}
          </p>
          <div>
            <Button onClick={retryLoad} disabled={isRefreshing} className="gap-2">
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { initialSceneId, scenes, manifest, property, title } = snapshot

  return (
    <div className="space-y-8">
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">Panorama Tour Workspace</CardTitle>
            <p className="text-sm text-slate-500">
              Upload 360° imagery, wire hotspots, and publish a connected walkthrough for {propertyName ?? property.title}.
            </p>
            <p className="text-xs text-slate-400">
              Active property: {property.title} · {property.address}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={retryLoad}
            disabled={isRefreshing}
            className="gap-2 self-start lg:self-auto"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh snapshot
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <p>
            Scenes are stored as percentages for hotspot placement. Publishing compiles a manifest that powers the front-end
            walkthrough experience.
          </p>
        </CardContent>
      </Card>

      <SceneAdminDashboard
        title={title}
        initialSceneId={initialSceneId}
        initialScenes={scenes}
        initialManifest={manifest}
        property={snapshot.property}
        onPublish={handlePublish}
        onScenesChange={handleScenesChange}
      />

      <PanoramaTourViewer manifest={snapshot.manifest} />
    </div>
  )
}
