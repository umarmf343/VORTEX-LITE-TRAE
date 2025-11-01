import { NextRequest, NextResponse } from "next/server"

import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics-events"
import { recordAnalyticsEvent } from "@/lib/server/analytics-events"

export const dynamic = "force-dynamic"

const EVENT_SET = new Set<AnalyticsEventName>(ANALYTICS_EVENT_NAMES)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { event?: string; payload?: unknown }
    if (typeof body.event !== "string" || !EVENT_SET.has(body.event as AnalyticsEventName)) {
      return NextResponse.json({ error: "Unsupported analytics event" }, { status: 422 })
    }

    const payload = isRecord(body.payload) ? body.payload : {}

    await recordAnalyticsEvent(body.event, payload)

    return NextResponse.json({ status: "accepted" }, { status: 202 })
  } catch (error) {
    console.error("Failed to record analytics event", error)
    return NextResponse.json({ error: "Unable to record analytics event" }, { status: 500 })
  }
}
