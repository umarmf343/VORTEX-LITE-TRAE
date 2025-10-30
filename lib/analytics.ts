type WalkthroughEventName =
  | "enter_walkthrough"
  | "navigate_node"
  | "enter_hotspot"
  | "exit_walkthrough"
  | "auto_tour_start"
  | "auto_tour_stop"

export interface WalkthroughEventPayload {
  spaceId: string
  nodeId?: string
  hotspotId?: string
  timestamp?: number
  metadata?: Record<string, unknown>
}

export interface WalkthroughAnalyticsOptions {
  endpoint?: string
  sendBeacon?: typeof navigator.sendBeacon
}

const DEFAULT_ENDPOINT = "/api/analytics/walkthrough"

const formatPayload = (
  event: WalkthroughEventName,
  payload: WalkthroughEventPayload,
): Record<string, unknown> => ({
  event,
  ...payload,
  timestamp: payload.timestamp ?? Date.now(),
})

const postWithFetch = async (endpoint: string, body: Record<string, unknown>) => {
  if (typeof fetch !== "function") {
    return
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to push walkthrough analytics event", error)
    }
  }
}

export const logWalkthroughEvent = (
  event: WalkthroughEventName,
  payload: WalkthroughEventPayload,
  options: WalkthroughAnalyticsOptions = {},
) => {
  if (typeof window === "undefined") {
    return
  }

  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT
  const formatted = formatPayload(event, payload)
  const sendBeacon = options.sendBeacon ?? navigator.sendBeacon?.bind(navigator)

  if (sendBeacon) {
    try {
      const buffer = new Blob([JSON.stringify(formatted)], { type: "application/json" })
      const dispatched = sendBeacon(endpoint, buffer)
      if (dispatched) {
        window.dispatchEvent(
          new CustomEvent("walkthrough:analytics", {
            detail: formatted,
          }),
        )
        return
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("sendBeacon analytics dispatch failed", error)
      }
    }
  }

  postWithFetch(endpoint, formatted)
  window.dispatchEvent(
    new CustomEvent("walkthrough:analytics", {
      detail: formatted,
    }),
  )
}

export const bindWalkthroughEventLogging = (
  spaceId: string,
  source: EventTarget,
  options: WalkthroughAnalyticsOptions = {},
) => {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<WalkthroughEventPayload>).detail ?? {}
    logWalkthroughEvent(event.type as WalkthroughEventName, { spaceId, ...detail }, options)
  }

  const eventNames: WalkthroughEventName[] = [
    "enter_walkthrough",
    "navigate_node",
    "enter_hotspot",
    "exit_walkthrough",
    "auto_tour_start",
    "auto_tour_stop",
  ]

  eventNames.forEach((eventName) => source.addEventListener(eventName, handler))

  return () => {
    eventNames.forEach((eventName) => source.removeEventListener(eventName, handler))
  }
}

export type { WalkthroughEventName }
