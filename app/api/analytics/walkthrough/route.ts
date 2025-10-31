import { NextRequest, NextResponse } from "next/server"

import type { WalkthroughEventName, WalkthroughEventPayload } from "@/lib/analytics"
import { recordWalkthroughEvent } from "@/lib/server/analytics-store"

const WALKTHROUGH_EVENT_TYPES: readonly WalkthroughEventName[] = [
  "enter_walkthrough",
  "navigate_node",
  "enter_hotspot",
  "exit_walkthrough",
  "auto_tour_start",
  "auto_tour_stop",
]

const WALKTHROUGH_EVENT_SET = new Set<WalkthroughEventName>(WALKTHROUGH_EVENT_TYPES)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

interface WalkthroughRequestBody extends WalkthroughEventPayload {
  event: WalkthroughEventName
}

const normalizePayload = (payload: WalkthroughRequestBody): WalkthroughRequestBody => {
  const normalized: WalkthroughRequestBody = {
    event: payload.event,
    spaceId: payload.spaceId.trim(),
    nodeId: typeof payload.nodeId === "string" ? payload.nodeId : undefined,
    hotspotId: typeof payload.hotspotId === "string" ? payload.hotspotId : undefined,
    metadata: isRecord(payload.metadata) ? payload.metadata : undefined,
    timestamp: typeof payload.timestamp === "number" && Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : Date.now(),
  }

  return normalized
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { event, spaceId } = body

  if (typeof event !== "string" || !WALKTHROUGH_EVENT_SET.has(event as WalkthroughEventName)) {
    return NextResponse.json({ error: "Unknown analytics event" }, { status: 422 })
  }

  if (typeof spaceId !== "string" || !spaceId.trim()) {
    return NextResponse.json({ error: "spaceId is required" }, { status: 422 })
  }

  const normalized = normalizePayload({ ...(body as WalkthroughRequestBody), event: event as WalkthroughEventName })

  await recordWalkthroughEvent({
    ...normalized,
    receivedAt: new Date().toISOString(),
  })

  return NextResponse.json({ status: "accepted" }, { status: 202 })
}
