import type {
  CaptureScanNode,
  HDPhotoAsset,
  HDPhotoCollection,
  HDPhotoExportFormat,
  HDPhotoExportRecord,
  HDPhotoExportRequest,
  HDPhotoKind,
  HDPhotoRenderJob,
  HDPhotoResolutionPreset,
  HDPhotoSuggestion,
} from "@/lib/types"

export const HD_PHOTO_MODULE_ID = "MediaExporter.HDPhotoModule"

export type CaptureKind = "panorama" | "still"

export interface CaptureRequestOptions {
  sceneId: string
  nodeId?: string
  kind: CaptureKind
  label?: string
  description?: string
  resolution?: HDPhotoResolutionPreset
  backgroundMode?: "hdr" | "studio"
  format?: Exclude<HDPhotoExportFormat, "pdf">
  dpi?: number
  includeBranding?: boolean
  includeWatermark?: boolean
}

export interface AutoGenerationOptions {
  supersampling?: number
  dpi?: number
  resolution?: HDPhotoResolutionPreset
}

export interface HDPhotoModuleOptions {
  collection?: HDPhotoCollection | null
  spaceId: string
  autoSuggestions?: HDPhotoSuggestion[]
  renderNodeHint?: string
}

type Listener = (collection: HDPhotoCollection) => void

const DEFAULT_RESOLUTION: Record<HDPhotoResolutionPreset, { width: number; height: number }> = {
  "web-1080p": { width: 1920, height: 1080 },
  "ultra-4k": { width: 4096, height: 2160 },
  "ultra-8k": { width: 8192, height: 4096 },
}

const DEFAULT_DPI = 300

const nowIso = () => new Date().toISOString()

const randomId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}`
}

const ensureQuality = (asset: HDPhotoAsset) => {
  if (asset.metadata.width < 3840 || asset.metadata.height < 2160) {
    throw new Error("Asset does not meet minimum 4K resolution requirements")
  }
  if (asset.metadata.dpi < 300) {
    throw new Error("Asset does not meet 300 DPI print requirements")
  }
  if (!asset.metadata.hdr) {
    throw new Error("HDR data missing from generated asset")
  }
}

const cloneCollection = (collection: HDPhotoCollection): HDPhotoCollection => ({
  ...collection,
  panoramas: [...collection.panoramas],
  heroShots: [...collection.heroShots],
  printLayouts: [...collection.printLayouts],
  suggestions: [...collection.suggestions],
  exports: [...collection.exports],
  moduleState: {
    ...collection.moduleState,
    queue: collection.moduleState.queue.map((job) => ({ ...job })),
  },
})

export class HDPhotoModule {
  private state: HDPhotoCollection
  private readonly listeners = new Set<Listener>()
  private readonly renderNode: string | undefined

  constructor(options: HDPhotoModuleOptions) {
    const renderNodeEnv = typeof process !== "undefined" ? process.env.GPU_RENDER_NODE : undefined
    this.renderNode = renderNodeEnv || options.renderNodeHint
    const baseCollection: HDPhotoCollection =
      options.collection ??
      ({
        spaceId: options.spaceId,
        panoramas: [],
        heroShots: [],
        printLayouts: [],
        suggestions: options.autoSuggestions ?? [],
        exports: [],
        moduleState: {
          online: Boolean(this.renderNode),
          lastRunAt: undefined,
          renderNode: this.renderNode,
          queue: [],
        },
      } satisfies HDPhotoCollection)

    this.state = {
      ...baseCollection,
      moduleState: {
        ...baseCollection.moduleState,
        renderNode: this.renderNode ?? baseCollection.moduleState.renderNode,
        online: baseCollection.moduleState.online ?? Boolean(this.renderNode),
      },
      suggestions: options.autoSuggestions ?? baseCollection.suggestions ?? [],
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(cloneCollection(this.state))
    return () => {
      this.listeners.delete(listener)
    }
  }

  getCollection() {
    return cloneCollection(this.state)
  }

  private setState(next: HDPhotoCollection) {
    this.state = next
    for (const listener of this.listeners) {
      listener(cloneCollection(this.state))
    }
  }

  private buildMetadata(
    kind: HDPhotoKind,
    nodeId: string | undefined,
    resolution: HDPhotoResolutionPreset,
    dpi: number,
    backgroundMode: "hdr" | "studio",
    supersampling: number,
  ) {
    const size = DEFAULT_RESOLUTION[resolution] ?? DEFAULT_RESOLUTION["ultra-4k"]
    const baseWidth = size.width
    const baseHeight = size.height * (kind === "panorama" ? 2 : 1)

    return {
      resolution: `${baseWidth}x${baseHeight}`,
      width: baseWidth,
      height: baseHeight,
      dpi,
      colorDepth: 16,
      hdr: true,
      colorProfile: backgroundMode === "hdr" ? "sRGB" : "CMYK",
      supersampling,
      toneMapping: "aces",
      backgroundMode,
      captureNodeId: nodeId,
      captureTimestamp: nowIso(),
      enhancements: ["global_illumination", "ambient_occlusion", "tone_balance"],
      sizeBytes: kind === "panorama" ? baseWidth * baseHeight * 6 : baseWidth * baseHeight * 4,
    }
  }

  private createAsset(
    kind: HDPhotoKind,
    options: CaptureRequestOptions,
    node: CaptureScanNode | undefined,
    resolution: HDPhotoResolutionPreset,
    dpi: number,
    supersampling: number,
  ): HDPhotoAsset {
    const id = randomId(kind === "panorama" ? "hd-panorama" : "hd-still")
    const metadata = this.buildMetadata(kind, node?.id ?? options.nodeId, resolution, dpi, options.backgroundMode ?? "hdr", supersampling)
    const label =
      options.label ??
      (node?.name
        ? `${node.name}${kind === "panorama" ? " 360°" : " Still"}`
        : kind === "panorama"
          ? "Panoramic Capture"
          : "Marketing Still")

    const description =
      options.description ??
      (kind === "panorama"
        ? "High-resolution equirectangular export generated from the immersive walkthrough renderer."
        : "Supersampled still image optimised for marketing delivery.")

    const baseUrl = `https://cdn.domain/media/spaces/${this.state.spaceId}/photos`
    const format: HDPhotoExportFormat = options.format ?? (kind === "panorama" ? "tiff" : "jpg")
    const asset: HDPhotoAsset = {
      id,
      spaceId: this.state.spaceId,
      kind,
      label,
      description,
      url: `${baseUrl}/${id}.${format === "jpg" ? "jpg" : format}`,
      previewUrl: `${baseUrl}/preview/${id}.jpg`,
      format,
      metadata: metadata as HDPhotoAsset["metadata"],
      tags: node?.tags,
      heroScore: kind === "still" ? 0.9 : undefined,
      suggestedUsage:
        kind === "panorama"
          ? ["360° viewer", "Website embed"]
          : ["Print marketing", "Digital brochure"],
    }

    ensureQuality(asset)
    return asset
  }

  private pushJob(job: HDPhotoRenderJob) {
    const next = cloneCollection(this.state)
    const queue = next.moduleState.queue.filter((existing) => existing.id !== job.id)
    queue.push(job)
    next.moduleState.queue = queue
    next.moduleState.lastRunAt = nowIso()
    this.setState(next)
  }

  private completeJob(jobId: string, asset: HDPhotoAsset) {
    const next = cloneCollection(this.state)
    next.moduleState.queue = next.moduleState.queue.map((job) =>
      job.id === jobId
        ? { ...job, status: "completed", outputAssetId: asset.id }
        : job,
    )
    if (asset.kind === "panorama") {
      next.panoramas = [asset, ...next.panoramas]
    } else if (asset.kind === "print_pack") {
      next.printLayouts = [asset, ...next.printLayouts]
    } else {
      next.heroShots = [asset, ...next.heroShots]
    }
    next.lastAnalyzedAt = nowIso()
    this.setState(next)
  }

  async captureStill(request: CaptureRequestOptions, node?: CaptureScanNode) {
    const resolution = request.resolution ?? "ultra-8k"
    const dpi = request.dpi ?? DEFAULT_DPI
    const supersampling = request.kind === "panorama" ? 4 : 4

    const job: HDPhotoRenderJob = {
      id: randomId("render"),
      nodeId: request.nodeId ?? node?.id ?? "ad-hoc",
      spaceId: this.state.spaceId,
      requestedAt: nowIso(),
      targetResolution: DEFAULT_RESOLUTION[resolution] ?? DEFAULT_RESOLUTION["ultra-4k"],
      dpi,
      supersampling,
      status: "rendering",
      autoGenerated: false,
    }

    this.pushJob(job)

    await new Promise((resolve) => setTimeout(resolve, 120))

    const asset = this.createAsset(request.kind === "panorama" ? "panorama" : "still", request, node, resolution, dpi, supersampling)

    this.completeJob(job.id, asset)
    return asset
  }

  async autoGenerateForNodes(nodes: CaptureScanNode[], options?: AutoGenerationOptions) {
    const results: HDPhotoRenderJob[] = []
    for (const node of nodes) {
      const job: HDPhotoRenderJob = {
        id: randomId("autogen"),
        nodeId: node.id,
        spaceId: this.state.spaceId,
        requestedAt: nowIso(),
        targetResolution: DEFAULT_RESOLUTION[options?.resolution ?? "ultra-4k"],
        dpi: options?.dpi ?? DEFAULT_DPI,
        supersampling: options?.supersampling ?? 4,
        status: "pending",
        autoGenerated: true,
      }
      results.push(job)
    }

    const next = cloneCollection(this.state)
    next.moduleState.queue = [...next.moduleState.queue, ...results]
    next.moduleState.lastRunAt = nowIso()
    this.setState(next)
    return results
  }

  queueExport(request: Omit<HDPhotoExportRequest, "id" | "requestedAt">) {
    const id = randomId("export")
    const record: HDPhotoExportRecord = {
      ...request,
      id,
      requestedAt: nowIso(),
      status: "queued",
    }
    const next = cloneCollection(this.state)
    next.exports = [record, ...next.exports]
    next.moduleState.lastRunAt = nowIso()
    this.setState(next)
    return record
  }

  markExportComplete(id: string, outputUrl: string) {
    const next = cloneCollection(this.state)
    next.exports = next.exports.map((record) =>
      record.id === id
        ? {
            ...record,
            status: "completed",
            completedAt: nowIso(),
            outputUrl,
            downloadSizeBytes: record.assets.length * 24_000_000,
          }
        : record,
    )
    next.moduleState.lastRunAt = nowIso()
    this.setState(next)
    return next.exports.find((record) => record.id === id)
  }

  updateSuggestions(suggestions: HDPhotoSuggestion[]) {
    const next = cloneCollection(this.state)
    next.suggestions = suggestions
    this.setState(next)
    return next.suggestions
  }

  validateQueueIntegrity() {
    const issues: string[] = []
    for (const job of this.state.moduleState.queue) {
      if (job.dpi < 300) {
        issues.push(`Job ${job.id} DPI below spec`)
      }
      if (job.targetResolution.width < 3840 || job.targetResolution.height < 2160) {
        issues.push(`Job ${job.id} resolution below 4K threshold`)
      }
    }
    return issues
  }
}

export type { HDPhotoCollection } from "@/lib/types"
