"use client"

import { useState } from "react"

import type { PanoramaScene, PanoramaTourManifest } from "@/lib/types"
import type { PanoramaSceneEngineSnapshot } from "@/lib/server/panorama-scene-engine"
import { SceneAdminDashboard } from "@/components/panorama/scene-admin-dashboard"
import { PanoramaTourViewer } from "@/components/panorama/panorama-tour-viewer"

interface PanoramaSceneEngineProps {
  snapshot: PanoramaSceneEngineSnapshot
}

export function PanoramaSceneEngineApp({ snapshot }: PanoramaSceneEngineProps) {
  const [scenes, setScenes] = useState<PanoramaScene[]>(snapshot.scenes)
  const [manifest, setManifest] = useState<PanoramaTourManifest | null>(snapshot.manifest)

  return (
    <div className="space-y-10 pb-12">
      <SceneAdminDashboard
        title={snapshot.title}
        initialSceneId={snapshot.initialSceneId}
        initialScenes={scenes}
        initialManifest={manifest}
        property={snapshot.property}
        onPublish={(nextManifest) => setManifest(nextManifest)}
        onScenesChange={(nextScenes) => setScenes(nextScenes)}
      />
      <PanoramaTourViewer manifest={manifest} />
    </div>
  )
}
