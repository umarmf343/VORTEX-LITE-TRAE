"use client"

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react"

import type {
  PanoramaScene,
  PanoramaTourManifest,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface SceneAdminDashboardProps {
  title: string
  initialSceneId: string
  initialScenes: PanoramaScene[]
  initialManifest: PanoramaTourManifest | null
  onPublish?: (manifest: PanoramaTourManifest) => void
  onScenesChange?: (scenes: PanoramaScene[]) => void
}

interface SceneFormState {
  id: string
  name: string
  imageUrl: string
  thumbnailUrl: string
  sceneType: PanoramaScene["sceneType"]
  yaw: string
  pitch: string
  fov: string
  description: string
  tags: string
}

interface LinkFormState {
  sourceSceneId: string
  targetSceneId: string
  yaw: string
  pitch: string
  label: string
  bidirectional: boolean
  autoAlign: boolean
}

const defaultSceneFormState: SceneFormState = {
  id: "",
  name: "",
  imageUrl: "",
  thumbnailUrl: "",
  sceneType: "interior",
  yaw: "0",
  pitch: "0",
  fov: "90",
  description: "",
  tags: "",
}

const defaultLinkState: LinkFormState = {
  sourceSceneId: "",
  targetSceneId: "",
  yaw: "0",
  pitch: "0",
  label: "",
  bidirectional: true,
  autoAlign: true,
}

export function SceneAdminDashboard({
  title,
  initialSceneId,
  initialScenes,
  initialManifest,
  onPublish,
  onScenesChange,
}: SceneAdminDashboardProps) {
  const [scenes, setScenes] = useState<PanoramaScene[]>(initialScenes)
  const [manifest, setManifest] = useState<PanoramaTourManifest | null>(initialManifest)
  const [sceneForm, setSceneForm] = useState<SceneFormState>(defaultSceneFormState)
  const [linkForm, setLinkForm] = useState<LinkFormState>({
    ...defaultLinkState,
    sourceSceneId: initialSceneId || initialScenes[0]?.id || "",
  })
  const [feedback, setFeedback] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setScenes(initialScenes)
  }, [initialScenes])

  useEffect(() => {
    setManifest(initialManifest)
  }, [initialManifest])

  useEffect(() => {
    setLinkForm((previous) => {
      if (previous.sourceSceneId) {
        return previous
      }
      const fallback = initialSceneId || initialScenes[0]?.id || ""
      return { ...previous, sourceSceneId: fallback }
    })
  }, [initialSceneId, initialScenes])

  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => a.name.localeCompare(b.name))
  }, [scenes])

  const handleSceneFieldChange = (field: keyof SceneFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setSceneForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleSelectSceneType = (value: PanoramaScene["sceneType"]) => {
    setSceneForm((prev) => ({ ...prev, sceneType: value }))
  }

  const handleLinkFieldChange = (field: keyof LinkFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setLinkForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleLinkToggle = (field: keyof LinkFormState) => (checked: boolean) => {
    setLinkForm((prev) => ({ ...prev, [field]: checked }))
  }

  const handleUploadScene = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback("")
    setError("")
    startTransition(async () => {
      const response = await fetch("/api/scenes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sceneForm,
          initialView: {
            yaw: Number(sceneForm.yaw) || 0,
            pitch: Number(sceneForm.pitch) || 0,
            fov: Number(sceneForm.fov) || 90,
          },
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setError(payload.error ?? "Failed to upload scene")
        return
      }

      const payload = (await response.json()) as { scene: PanoramaScene }
      setScenes((prev) => {
        const next = prev.filter((scene) => scene.id !== payload.scene.id)
        next.push(payload.scene)
        onScenesChange?.(next)
        return next
      })
      setSceneForm(defaultSceneFormState)
      setFeedback(`Scene "${payload.scene.name}" saved`)
    })
  }

  const handleLinkScenes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback("")
    setError("")
    startTransition(async () => {
      const response = await fetch("/api/scenes/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...linkForm,
          yaw: Number(linkForm.yaw) || 0,
          pitch: Number(linkForm.pitch) || 0,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setError(payload.error ?? "Failed to link scenes")
        return
      }

      const snapshot = await fetch("/api/scenes/list")
      if (snapshot.ok) {
        const data = (await snapshot.json()) as {
          scenes: PanoramaScene[]
        }
        setScenes(data.scenes)
        onScenesChange?.(data.scenes)
        setFeedback("Navigation hotspot created")
      }
    })
  }

  const handlePublishTour = () => {
    setFeedback("")
    setError("")
    startTransition(async () => {
      const response = await fetch("/api/tour/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialSceneId: linkForm.sourceSceneId || initialSceneId }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setError(payload.error ?? "Failed to publish tour")
        return
      }

      const payload = (await response.json()) as { manifest: PanoramaTourManifest }
      setManifest(payload.manifest)
      onPublish?.(payload.manifest)
      setFeedback("Panorama tour published")
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Panorama Scene Engine</h1>
        <p className="text-sm text-muted-foreground">
          Upload equirectangular panoramas, wire navigation hotspots, and publish an interactive walkthrough.
        </p>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Current tour:</span> {title} · {scenes.length} scenes
        </div>
        {manifest ? (
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            Published manifest updated at {new Date(manifest.publishedAt).toLocaleString()}
          </div>
        ) : (
          <div className="text-sm text-orange-600 dark:text-orange-400">
            Tour not yet published. Click publish once scenes and hotspots are configured.
          </div>
        )}
        {feedback ? <div className="text-sm text-emerald-600">{feedback}</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload &amp; configure scene</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleUploadScene}>
              <div className="grid gap-2">
                <Label htmlFor="scene-name">Scene name</Label>
                <Input
                  id="scene-name"
                  placeholder="Living Room"
                  value={sceneForm.name}
                  onChange={handleSceneFieldChange("name")}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-id">Scene id (slug)</Label>
                <Input
                  id="scene-id"
                  placeholder="living-room"
                  value={sceneForm.id}
                  onChange={handleSceneFieldChange("id")}
                  pattern="[a-z0-9-]+"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-image">Panorama image URL</Label>
                <Input
                  id="scene-image"
                  placeholder="/uploads/scenes/living-room.jpg"
                  value={sceneForm.imageUrl}
                  onChange={handleSceneFieldChange("imageUrl")}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-thumb">Thumbnail (optional)</Label>
                <Input
                  id="scene-thumb"
                  placeholder="Defaults to panorama image"
                  value={sceneForm.thumbnailUrl}
                  onChange={handleSceneFieldChange("thumbnailUrl")}
                />
              </div>
              <div className="grid gap-2">
                <Label>Scene type</Label>
                <Select value={sceneForm.sceneType} onValueChange={handleSelectSceneType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scene type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interior">Interior</SelectItem>
                    <SelectItem value="exterior">Exterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="scene-yaw">Initial yaw</Label>
                  <Input id="scene-yaw" value={sceneForm.yaw} onChange={handleSceneFieldChange("yaw")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scene-pitch">Initial pitch</Label>
                  <Input id="scene-pitch" value={sceneForm.pitch} onChange={handleSceneFieldChange("pitch")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scene-fov">Initial FOV</Label>
                  <Input id="scene-fov" value={sceneForm.fov} onChange={handleSceneFieldChange("fov")} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-description">Description</Label>
                <Textarea
                  id="scene-description"
                  placeholder="Optional summary for dashboard"
                  value={sceneForm.description}
                  onChange={(event) => setSceneForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-tags">Tags</Label>
                <Input
                  id="scene-tags"
                  placeholder="living, open layout, staging"
                  value={sceneForm.tags}
                  onChange={(event) => setSceneForm((prev) => ({ ...prev, tags: event.target.value }))}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving scene…" : "Save scene"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link scenes with hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLinkScenes}>
              <div className="grid gap-2">
                <Label>Source scene</Label>
                <Select
                  value={linkForm.sourceSceneId}
                  onValueChange={(value) => setLinkForm((prev) => ({ ...prev, sourceSceneId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedScenes.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Target scene</Label>
                <Select
                  value={linkForm.targetSceneId}
                  onValueChange={(value) => setLinkForm((prev) => ({ ...prev, targetSceneId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedScenes.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hotspot-label">Hotspot label</Label>
                <Input
                  id="hotspot-label"
                  placeholder="Go to Kitchen"
                  value={linkForm.label}
                  onChange={handleLinkFieldChange("label")}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="hotspot-yaw">Hotspot yaw</Label>
                  <Input id="hotspot-yaw" value={linkForm.yaw} onChange={handleLinkFieldChange("yaw")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hotspot-pitch">Hotspot pitch</Label>
                  <Input id="hotspot-pitch" value={linkForm.pitch} onChange={handleLinkFieldChange("pitch")} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Bidirectional link</p>
                  <p className="text-xs text-muted-foreground">Automatically create a return hotspot on the target scene.</p>
                </div>
                <Switch checked={linkForm.bidirectional} onCheckedChange={handleLinkToggle("bidirectional")} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Auto orientation alignment</p>
                  <p className="text-xs text-muted-foreground">Align arrival view to the target scene&apos;s initial yaw and pitch.</p>
                </div>
                <Switch checked={linkForm.autoAlign} onCheckedChange={handleLinkToggle("autoAlign")} />
              </div>
              <Button type="submit" disabled={isPending || scenes.length < 2} className="w-full">
                {isPending ? "Linking scenes…" : "Create hotspot"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scene inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedScenes.map((scene) => (
              <div key={scene.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{scene.name}</p>
                    <p className="text-xs text-muted-foreground">{scene.id}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      scene.sceneType === "interior"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                        : "bg-lime-100 text-lime-700 dark:bg-lime-900/50 dark:text-lime-200",
                    )}
                  >
                    {scene.sceneType}
                  </span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Initial view · yaw {scene.initialView.yaw.toFixed(1)}° / pitch {scene.initialView.pitch.toFixed(1)}° · fov {scene.initialView.fov.toFixed(0)}°
                </div>
                <div className="mt-2 text-sm">
                  <a className="text-primary underline" href={scene.imageUrl} target="_blank" rel="noreferrer">
                    Preview panorama
                  </a>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Hotspots</p>
                  {scene.hotspots.length === 0 ? (
                    <p>No hotspots configured yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {scene.hotspots.map((hotspot) => (
                        <li key={hotspot.id} className="flex items-center justify-between gap-4">
                          <span>{hotspot.label}</span>
                          <span className="text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                            → {hotspot.targetSceneId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start gap-4 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold">Publish walkthrough</h2>
          <p className="text-sm text-muted-foreground">
            Compile the navigation manifest and push the latest scenes to the panorama renderer.
          </p>
        </div>
        <Button onClick={handlePublishTour} disabled={isPending || scenes.length === 0}>
          {isPending ? "Publishing…" : "Publish Panorama Tour"}
        </Button>
      </div>
    </div>
  )
}
