import { NextRequest, NextResponse } from "next/server"

import type { ShareEventName, ShareEventPayload } from "@/lib/analytics"
import { recordAnalyticsEvent } from "@/lib/server/analytics-events"
import { recordShareEvent } from "@/lib/server/analytics-store"

export const dynamic = "force-dynamic"

const SHARE_EVENTS: readonly ShareEventName[] = [
  "share_link_generated",
  "embed_code_copied",
  "embed_loaded",
  "mobile_app_opened",
]

const SHARE_EVENT_SET = new Set<ShareEventName>(SHARE_EVENTS)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

interface ShareRequestBody extends ShareEventPayload {
  event: ShareEventName
}

const normalizeSharePayload = (payload: ShareRequestBody): ShareRequestBody => ({
  event: payload.event,
  spaceId: payload.spaceId.trim(),
  channel: typeof payload.channel === "string" ? payload.channel : undefined,
  embedType:
    payload.embedType === "iframe" || payload.embedType === "javascript" || payload.embedType === "pwa"
      ? payload.embedType
      : undefined,
  parameters: isRecord(payload.parameters) ? payload.parameters : undefined,
  host: typeof payload.host === "string" ? payload.host : null,
  token: typeof payload.token === "string" ? payload.token : null,
  userAgent: typeof payload.userAgent === "string" ? payload.userAgent : null,
  timestamp:
    typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : Date.now(),
})

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ShareRequestBody>

    if (typeof body.event !== "string" || !SHARE_EVENT_SET.has(body.event as ShareEventName)) {
      return NextResponse.json({ error: "Unsupported share analytics event" }, { status: 422 })
    }

    if (typeof body.spaceId !== "string" || !body.spaceId.trim()) {
      return NextResponse.json({ error: "spaceId is required" }, { status: 422 })
    }

    const normalized = normalizeSharePayload(body as ShareRequestBody)

    await recordShareEvent({
      ...normalized,
      receivedAt: new Date().toISOString(),
    })

    if (normalized.event === "share_link_generated") {
      await recordAnalyticsEvent("share_generated", {
        property_id: normalized.spaceId,
        channel: normalized.channel,
        embed_type: normalized.embedType,
        token: normalized.token,
      })
    } else if (normalized.event === "embed_loaded") {
      await recordAnalyticsEvent("embed_loaded", {
        property_id: normalized.spaceId,
        host: normalized.host,
        embed_type: normalized.embedType,
        token: normalized.token,
        user_agent: normalized.userAgent,
      })
    }

    return NextResponse.json({ status: "accepted" }, { status: 202 })
  } catch (error) {
    console.error("Failed to record share analytics", error)
    return NextResponse.json({ error: "Unable to record share analytics" }, { status: 500 })
  }
}
