"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, ExternalLink, Loader2, RefreshCw } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { buildMatterportUrl } from "@/lib/matterport"

interface MatterportEmbedProps {
  modelId?: string
  applicationKey?: string
  propertyName: string
  experienceLabel?: string
  className?: string
}

type ShowcaseEmbedWindow = Window & {
  MP_SDK?: {
    connect: (
      element: HTMLIFrameElement,
      applicationKey: string,
      overrideUrl?: string,
    ) => Promise<unknown>
  }
}

export function MatterportEmbed({
  modelId,
  applicationKey,
  propertyName,
  experienceLabel,
  className,
}: MatterportEmbedProps) {
  const mapRef = useRef<HTMLIFrameElement | null>(null)
  const [matterWindow, setMatterWindow] = useState<ShowcaseEmbedWindow | null>(null)
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const embedUrl = useMemo(() => {
    if (!modelId) return ""
    return buildMatterportUrl(modelId, {
      applicationKey,
      autoplay: true,
      disableQuickstart: false,
    })
  }, [applicationKey, modelId, reloadCount])

  useEffect(() => {
    setMatterWindow(window as ShowcaseEmbedWindow)
  }, [])

  useEffect(() => {
    if (!matterWindow || !mapRef.current || !modelId) {
      return
    }

    if (!matterWindow.MP_SDK || !applicationKey) {
      setStatus("idle")
      setErrorMessage(null)
      return
    }

    let cancelled = false

    const connect = async () => {
      try {
        setStatus("connecting")
        setErrorMessage(null)
        await matterWindow.MP_SDK?.connect(mapRef.current!, applicationKey, "")
        if (!cancelled) {
          setStatus("ready")
        }
      } catch (error) {
        console.error("Matterport SDK connection failed", error)
        if (!cancelled) {
          setStatus("error")
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to connect to the Matterport Showcase SDK. Please verify your key and network settings.",
          )
        }
      }
    }

    connect()

    return () => {
      cancelled = true
    }
  }, [applicationKey, matterWindow, modelId, reloadCount])

  const handleRetry = () => {
    setStatus("idle")
    setErrorMessage(null)
    setReloadCount((count) => count + 1)
  }

  if (!modelId) {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-900/80 text-center text-slate-200">
        <AlertCircle className="mb-3 h-8 w-8 text-amber-400" />
        <p className="max-w-md text-sm">
          This property does not have a Matterport showcase linked yet. Add a <code>matterportModelId</code> to the property to
          unlock the embedded experience.
        </p>
      </Card>
    )
  }

  return (
    <div className={cn("relative h-full min-h-[360px] w-full overflow-hidden rounded-xl bg-black", className)}>
      <iframe
        key={`${modelId}-${reloadCount}`}
        ref={mapRef}
        src={embedUrl}
        allow="fullscreen; vr"
        className="h-full w-full border-0"
        title={`${propertyName} Matterport Showcase`}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1 bg-gradient-to-b from-black/60 to-transparent p-4 text-white">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-200/80">{experienceLabel || "Matterport Showcase"}</span>
        <h2 className="text-lg font-semibold">{propertyName}</h2>
        <div className="pointer-events-auto mt-2 flex gap-2 text-xs text-slate-200/80">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white/10 text-white hover:bg-white/20"
            onClick={() => window.open(embedUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-white/10 text-white hover:bg-white/20"
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>

      {status === "connecting" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Connecting to Matterport Showcase…</p>
          </div>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/80 p-6">
          <Card className="max-w-md space-y-3 bg-slate-900/90 p-6 text-left text-slate-100">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Matterport connection issue</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{errorMessage}</p>
            <Button onClick={handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </Card>
        </div>
      )}

      {!applicationKey && status !== "error" && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-center">
          <div className="rounded-full bg-black/70 px-4 py-2 text-xs text-slate-100">
            SDK features are limited without <code>NEXT_PUBLIC_MATTERPORT_SDK</code>.
          </div>
        </div>
      )}
    </div>
  )
}
