type WalkthroughEventName =
  | "enter_walkthrough"
  | "navigate_node"
  | "enter_hotspot"
  | "exit_walkthrough"
  | "auto_tour_start"
  | "auto_tour_stop"

export type ShareEventName =
  | "share_link_generated"
  | "embed_code_copied"
  | "embed_loaded"
  | "mobile_app_opened"

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
const SHARE_ENDPOINT = "/api/analytics/share"

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

  let resolvedEndpoint = endpoint
  if (endpoint.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location?.origin : undefined
    if (origin) {
      resolvedEndpoint = new URL(endpoint, origin).toString()
    }
  }

  try {
    await fetch(resolvedEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to push analytics event", error)
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

export type { WalkthroughEventName, ShareEventName }

export interface ShareEventPayload {
  spaceId: string
  channel?: string
  embedType?: "iframe" | "javascript" | "pwa" | "link"
  parameters?: Record<string, unknown>
  host?: string | null
  token?: string | null
  userAgent?: string | null
  timestamp?: number
}

export interface ShareAnalyticsOptions {
  endpoint?: string
  sendBeacon?: typeof navigator.sendBeacon
}

const formatSharePayload = (event: ShareEventName, payload: ShareEventPayload) => ({
  event,
  ...payload,
  timestamp: payload.timestamp ?? Date.now(),
})

export const logShareEvent = (
  event: ShareEventName,
  payload: ShareEventPayload,
  options: ShareAnalyticsOptions = {},
) => {
  if (typeof window === "undefined") {
    return
  }

  const endpoint = options.endpoint ?? SHARE_ENDPOINT
  const formatted = formatSharePayload(event, payload)
  const sendBeacon = options.sendBeacon ?? navigator.sendBeacon?.bind(navigator)

  if (process.env.NODE_ENV === "test") {
    window.dispatchEvent(
      new CustomEvent("share:analytics", {
        detail: formatted,
      }),
    )
    return
  }

  if (sendBeacon) {
    try {
      const buffer = new Blob([JSON.stringify(formatted)], { type: "application/json" })
      const dispatched = sendBeacon(endpoint, buffer)
      if (dispatched) {
        window.dispatchEvent(
          new CustomEvent("share:analytics", {
            detail: formatted,
          }),
        )
        return
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("sendBeacon share analytics dispatch failed", error)
      }
    }
  }

  void postWithFetch(endpoint, formatted)
  window.dispatchEvent(
    new CustomEvent("share:analytics", {
      detail: formatted,
    }),
  )
}
