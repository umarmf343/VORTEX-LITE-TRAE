"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { HDPhotoModule, HD_PHOTO_MODULE_ID, type CaptureRequestOptions } from "@/lib/media/hd-photo-module"
import type {
  CaptureScanNode,
  HDPhotoAsset,
  HDPhotoCollection,
  HDPhotoExportRecord,
  HDPhotoResolutionPreset,
  HDPhotoSuggestion,
} from "@/lib/types"

export interface UseHdPhotoModuleOptions {
  collection?: HDPhotoCollection | null
  spaceId: string
  captureNodes?: CaptureScanNode[]
  suggestions?: HDPhotoSuggestion[]
}

export interface CapturePreview {
  asset: HDPhotoAsset
  createdAt: string
}

export interface UseHdPhotoModuleResult {
  moduleId: string
  collection: HDPhotoCollection | null
  capturePreview: CapturePreview | null
  captureStill: (options: CaptureRequestOptions) => Promise<HDPhotoAsset | null>
  queueAutoGeneration: (resolution?: HDPhotoResolutionPreset) => Promise<void>
  queueExport: (payload: {
    assets: string[]
    format: "jpg" | "png" | "tiff" | "pdf" | "zip"
    resolution: HDPhotoResolutionPreset
    dpi: number
    backgroundMode: "hdr" | "studio"
    includeWatermark?: boolean
    includeBrandingOverlay?: boolean
    iccProfile?: "sRGB" | "CMYK"
  }) => Promise<HDPhotoExportRecord | null>
  markExportComplete: (id: string, url: string) => HDPhotoExportRecord | undefined
  queueIssues: string[]
}

export function useHdPhotoModule(options: UseHdPhotoModuleOptions): UseHdPhotoModuleResult {
  const moduleRef = useRef<HDPhotoModule | null>(null)
  const [collection, setCollection] = useState<HDPhotoCollection | null>(options.collection ?? null)
  const [capturePreview, setCapturePreview] = useState<CapturePreview | null>(null)

  const nodesById = useMemo(() => {
    const map = new Map<string, CaptureScanNode>()
    for (const node of options.captureNodes ?? []) {
      map.set(node.id, node)
    }
    return map
  }, [options.captureNodes])

  useEffect(() => {
    if (!moduleRef.current) {
      moduleRef.current = new HDPhotoModule({
        collection: options.collection,
        spaceId: options.spaceId,
        autoSuggestions: options.suggestions,
      })
    }
    const module = moduleRef.current
    const unsubscribe = module.subscribe((next) => {
      setCollection(next)
    })
    return unsubscribe
  }, [options.collection, options.spaceId, options.suggestions])

  const captureStill = useCallback<UseHdPhotoModuleResult["captureStill"]>(
    async (request) => {
      const module = moduleRef.current
      if (!module) return null
      const node = request.nodeId ? nodesById.get(request.nodeId) : undefined
      try {
        const asset = await module.captureStill(request, node)
        setCapturePreview({ asset, createdAt: new Date().toISOString() })
        return asset
      } catch (error) {
        console.error("Failed to capture still", error)
        return null
      }
    },
    [nodesById],
  )

  const queueAutoGeneration = useCallback<UseHdPhotoModuleResult["queueAutoGeneration"]>(
    async (resolution) => {
      const module = moduleRef.current
      if (!module) return
      await module.autoGenerateForNodes(options.captureNodes ?? [], {
        resolution,
      })
    },
    [options.captureNodes],
  )

  const queueExport = useCallback<UseHdPhotoModuleResult["queueExport"]>(
    async (payload) => {
      const module = moduleRef.current
      if (!module) return null
      try {
        return module.queueExport({
          ...payload,
          spaceId: options.spaceId,
          kind: payload.assets.length > 1 ? "batch" : "single",
          requestedBy: "system",
        })
      } catch (error) {
        console.error("Failed to queue export", error)
        return null
      }
    },
    [options.spaceId],
  )

  const markExportComplete = useCallback<UseHdPhotoModuleResult["markExportComplete"]>((id, url) => {
    const module = moduleRef.current
    if (!module) return undefined
    return module.markExportComplete(id, url)
  }, [])

  const queueIssues = useMemo(() => moduleRef.current?.validateQueueIntegrity() ?? [], [collection?.moduleState.queue])

  return {
    moduleId: HD_PHOTO_MODULE_ID,
    collection,
    capturePreview,
    captureStill,
    queueAutoGeneration,
    queueExport,
    markExportComplete,
    queueIssues,
  }
}
