export const ANALYTICS_EVENT_NAMES = [
  "hotspot_clicked",
  "transition_started",
  "transition_completed",
  "measurement_used",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]
