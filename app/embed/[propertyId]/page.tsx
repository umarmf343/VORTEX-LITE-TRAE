"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo } from "react"

import { useData } from "@/lib/data-context"
import type { Lead, LeadCapturePayload } from "@/lib/types"
import { Loader2 } from "@/lib/icons"
import { useToast } from "@/components/ui/use-toast"
import { logShareEvent } from "@/lib/analytics"

const TourPlayer = dynamic(
  () =>
    import("@/components/viewer/tour-player").then((mod) => ({
      default: mod.TourPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Loading panorama tour…</span>
      </div>
    ),
  },
)

interface EmbedPageProps {
  params: { propertyId: string }
}

export default function EmbedPage({ params }: EmbedPageProps) {
  const { properties, isLoading, addLead, getFloorPlan } = useData()
  const { toast } = useToast()
  const propertyId = decodeURIComponent(params.propertyId)
  const property = useMemo(
    () => properties.find((item) => item.id === propertyId),
    [properties, propertyId],
  )
  const floorPlan = useMemo(() => getFloorPlan(property?.floorPlanId), [getFloorPlan, property?.floorPlanId])

  useEffect(() => {
    if (!property) {
      return
    }

    const host = typeof document !== "undefined" ? document.referrer || null : null
    const parameters =
      typeof window !== "undefined"
        ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
        : undefined

    logShareEvent("embed_loaded", {
      spaceId: property.id,
      embedType: "iframe",
      host,
      parameters,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      token: parameters?.token ?? null,
    })
  }, [property])

  const handleLeadCapture = async (leadData: LeadCapturePayload) => {
    try {
      const lead: Lead = {
        id: `lead-${Date.now()}`,
        propertyId: leadData.propertyId,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
        visitDuration: leadData.visitDuration,
        scenesViewed: leadData.scenesViewed,
        createdAt: new Date(),
        status: "new",
        notes: "",
        source: "embedded-tour",
      }
      await addLead(lead)
      toast({
        title: "Thanks for reaching out!",
        description: "A member of the team will follow up shortly.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="mb-3 h-8 w-8 animate-spin" />
        <span className="text-sm text-slate-400">Preparing your tour experience…</span>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-6 py-8 text-center">
          <h1 className="text-lg font-semibold">Tour not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            We couldn&apos;t locate the requested property. Please verify the embed link and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80 p-4 text-center">
        <h1 className="text-lg font-semibold tracking-tight">{property.name}</h1>
        <p className="text-xs text-slate-400">{property.address}</p>
      </header>
      <main className="flex-1 min-h-0">
        <TourPlayer property={property} floorPlan={floorPlan} onLeadCapture={handleLeadCapture} experienceMode="vortex" />
      </main>
    </div>
  )
}
