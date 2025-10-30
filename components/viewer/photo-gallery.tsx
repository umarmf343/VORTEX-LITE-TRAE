"use client"

import type { HDPhotoAsset, HDPhotoCollection, HDPhotoResolutionPreset } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Download,
  Camera,
  AlertTriangle,
  Sparkles,
  Layers,
  RefreshCw,
  CheckCircle2,
  Info,
} from "@/lib/icons"

interface PhotoGalleryProps {
  collection: HDPhotoCollection | null
  onQueueExport?: (assetIds: string[]) => void
  onGeneratePrintPack?: () => void
  onRunAutoGeneration?: (resolution?: HDPhotoResolutionPreset) => void
  queueIssues?: string[]
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export function PhotoGallery({
  collection,
  onQueueExport,
  onGeneratePrintPack,
  onRunAutoGeneration,
  queueIssues = [],
}: PhotoGalleryProps) {
  if (!collection) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-800 text-gray-300">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <p className="font-semibold text-white">Preparing media gallery…</p>
            <p className="text-sm text-gray-400">We&apos;re syncing the latest HD renders from the capture session.</p>
          </div>
        </div>
      </Card>
    )
  }

  const { panoramas, heroShots, printLayouts, suggestions, exports, moduleState } = collection
  const hasAssets = panoramas.length + heroShots.length + printLayouts.length > 0

  return (
    <Card className="bg-gray-900 border-gray-800 p-4 space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Suggested Marketing Shots</h3>
            <p className="text-xs text-gray-400">
              Auto-curated imagery sourced directly from the 3D scan nodes and rendered at print quality.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-200">
              {moduleState.online ? "Render node online" : "Render node offline"}
            </Badge>
            {moduleState.renderNode ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      GPU: {moduleState.renderNode}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>GPU render node registered for HD exports.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Top {Math.min(heroShots.length, 15)} hero frames curated per space.</span>
        </div>
      </div>

      {queueIssues.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100 flex gap-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Queued jobs need attention</p>
            <ul className="list-disc ml-4 space-y-1">
              {queueIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue={hasAssets ? "hero" : "suggestions"} className="w-full">
        <TabsList className="grid grid-cols-4 bg-gray-800/60">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="panoramas">Panoramas</TabsTrigger>
          <TabsTrigger value="print">Print Packs</TabsTrigger>
          <TabsTrigger value="suggestions">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="hero" className="mt-4">
          {heroShots.length === 0 ? (
            <EmptyGallery message="No hero imagery has been generated yet." onGenerate={onRunAutoGeneration} />
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {heroShots.map((asset) => (
                  <GalleryAssetCard
                    key={asset.id}
                    asset={asset}
                    onQueueExport={() => onQueueExport?.([asset.id])}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="panoramas" className="mt-4">
          {panoramas.length === 0 ? (
            <EmptyGallery message="Panoramic renders will appear once auto-generation completes." onGenerate={onRunAutoGeneration} />
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {panoramas.map((asset) => (
                  <GalleryAssetCard
                    key={asset.id}
                    asset={asset}
                    badgeLabel="360°"
                    onQueueExport={() => onQueueExport?.([asset.id])}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="print" className="mt-4">
          {printLayouts.length === 0 ? (
            <EmptyGallery
              message="Generate a print-layout pack to bundle the top hero shots for brochures."
              onGenerate={onGeneratePrintPack}
              ctaLabel="Generate print pack"
            />
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="grid gap-3">
                {printLayouts.map((asset) => (
                  <GalleryAssetCard
                    key={asset.id}
                    asset={asset}
                    badgeLabel="Print"
                    onQueueExport={() => onQueueExport?.([asset.id])}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="suggestions" className="mt-4 space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-400">No AI suggestions available for this space yet.</p>
          ) : (
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="bg-gray-850 border-gray-800 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{suggestion.label}</p>
                        <p className="text-xs text-gray-400">{suggestion.description}</p>
                      </div>
                      <Badge variant="outline" className="border-blue-500/40 text-blue-200">
                        Node {suggestion.nodeId}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-400">
                      <Metric label="Composition" value={suggestion.metadata.compositionScore} />
                      <Metric label="Lighting" value={suggestion.metadata.lightingScore} />
                      <Metric label="Occlusion" value={suggestion.metadata.occlusionScore} />
                    </div>
                    {suggestion.recommendedOutput ? (
                      <p className="mt-2 text-[11px] text-emerald-300">
                        Recommended output: {suggestion.recommendedOutput.replace("ultra-", "").toUpperCase()}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          {exports.length > 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Download className="h-4 w-4" /> Recent Exports
              </div>
              <div className="mt-2 space-y-2">
                {exports.map((record) => (
                  <div key={record.id} className="flex flex-col gap-1 rounded border border-gray-800 bg-gray-950/60 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                      <span>{record.format.toUpperCase()} • {record.resolution.replace("ultra-", "").toUpperCase()}</span>
                      <Badge variant="secondary" className={cn("text-[10px]", record.status === "completed" ? "bg-emerald-600/20 text-emerald-200" : "bg-amber-500/20 text-amber-200")}>{record.status}</Badge>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" /> {record.assets.length} assets • {formatBytes(record.downloadSizeBytes)}
                    </div>
                    {record.outputUrl ? (
                      <Button
                        variant="link"
                        className="px-0 text-xs"
                        onClick={() => window.open(record.outputUrl as string, "_blank", "noopener,noreferrer")}
                      >
                        Download
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3 text-xs text-gray-400 space-y-2">
        <div className="flex items-center justify-between gap-2 text-gray-300">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-300" /> Render Queue
          </span>
          <span>{moduleState.queue.length} jobs</span>
        </div>
        {moduleState.queue.length === 0 ? (
          <p>No queued renders. Auto-generation will enqueue panoramas after each capture session.</p>
        ) : (
          <div className="space-y-2">
            {moduleState.queue.map((job) => (
              <div key={job.id} className="rounded border border-gray-800 bg-gray-900/60 p-2">
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>Node {job.nodeId}</span>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-200 uppercase tracking-wide">
                    {job.status}
                  </Badge>
                </div>
                <Progress value={job.status === "completed" ? 100 : job.status === "pending" ? 10 : 65} className="mt-2" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
                  <span>{job.targetResolution.width}×{job.targetResolution.height} @ {job.dpi} DPI</span>
                  {job.autoGenerated ? (
                    <Badge variant="secondary" className="bg-purple-600/20 text-purple-200">Auto</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-2" onClick={() => onRunAutoGeneration?.("ultra-8k")}> 
          <RefreshCw className="h-4 w-4" /> Refresh hero set
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => onQueueExport?.(heroShots.map((asset) => asset.id))} disabled={heroShots.length === 0}>
          <Download className="h-4 w-4" /> Export hero bundle
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={onGeneratePrintPack}>
          <Layers className="h-4 w-4" /> Build print layout
        </Button>
      </div>
    </Card>
  )
}

interface EmptyGalleryProps {
  message: string
  onGenerate?: (resolution?: HDPhotoResolutionPreset) => void
  ctaLabel?: string
}

function EmptyGallery({ message, onGenerate, ctaLabel }: EmptyGalleryProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-800 bg-gray-900/40 p-6 text-center text-sm text-gray-400 gap-3">
      <Camera className="h-10 w-10 text-gray-600" />
      <p>{message}</p>
      {onGenerate ? (
        <Button size="sm" onClick={() => onGenerate("ultra-4k")}>{ctaLabel ?? "Trigger auto-generation"}</Button>
      ) : null}
    </div>
  )
}

interface GalleryAssetCardProps {
  asset: HDPhotoAsset
  badgeLabel?: string
  onQueueExport?: () => void
}

function GalleryAssetCard({ asset, badgeLabel, onQueueExport }: GalleryAssetCardProps) {
  return (
    <Card className="overflow-hidden border-gray-800 bg-gray-950/70">
      <div className="relative">
        <img src={asset.previewUrl} alt={asset.label} className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-white">
          <div>
            <p className="font-semibold text-sm">{asset.label}</p>
            <p className="text-[11px] text-gray-300">{asset.metadata.resolution} • {asset.metadata.dpi} DPI</p>
          </div>
          {badgeLabel ? (
            <Badge variant="secondary" className="bg-blue-500/30 text-blue-100 uppercase tracking-wide text-[10px]">
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="p-3 space-y-3 text-xs text-gray-300">
        <p>{asset.description}</p>
        <div className="flex flex-wrap gap-2">
          {asset.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="border-gray-700 text-gray-300">
              #{tag}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> 16-bit color • HDR pipeline
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            Capture Node: {asset.metadata.captureNodeId ?? "—"}
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={onQueueExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-gray-800 bg-gray-900/70 p-2 text-center">
      <p className="text-[10px] uppercase text-gray-500">{label}</p>
      <p className="font-semibold text-white">{Math.round(value * 100)}%</p>
    </div>
  )
}
