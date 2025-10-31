import { PanoramaSceneEngineApp } from "@/components/panorama/panorama-scene-engine"
import { getSceneEngineSnapshot } from "@/lib/server/panorama-scene-engine"

export const dynamic = "force-dynamic"

export default async function PanoramaEnginePage() {
  const snapshot = await getSceneEngineSnapshot()

  return (
    <main className="container mx-auto max-w-6xl space-y-10 py-10">
      <PanoramaSceneEngineApp snapshot={snapshot} />
    </main>
  )
}
