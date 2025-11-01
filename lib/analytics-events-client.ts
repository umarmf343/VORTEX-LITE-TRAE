"use client"

import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "./analytics-events"

const EVENT_ENDPOINT = "/api/analytics/events"
const EVENT_SET = new Set<AnalyticsEventName>(ANALYTICS_EVENT_NAMES)

const resolveEndpoint = (endpoint: string) => {
  if (endpoint.startsWith("http")) {
    return endpoint
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${endpoint}`
  }
  return endpoint
}

export async function trackAnalyticsEvent(
  event: AnalyticsEventName,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  if (!EVENT_SET.has(event)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Skipping unsupported analytics event: ${event}`)
    }
    return
  }

  const endpoint = resolveEndpoint(EVENT_ENDPOINT)
  const body = JSON.stringify({ event, payload })

  if (process.env.NODE_ENV === "test") {
    window.dispatchEvent(
      new CustomEvent("analytics:event", {
        detail: { event, payload },
      }),
    )
    return
  }

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const dispatched = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }))
      if (dispatched) {
        return
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("sendBeacon analytics dispatch failed", error)
      }
    }
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to send analytics event", error)
    }
  }
}
