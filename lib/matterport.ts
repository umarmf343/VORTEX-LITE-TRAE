const MATTERPORT_SHOWCASE_BASE_URL = "https://my.matterport.com/show"

export interface MatterportEmbedOptions {
  /** Whether to start playback automatically (defaults to true). */
  autoplay?: boolean
  /** Optional application key for SDK-enhanced embeds. */
  applicationKey?: string
  /** Optional starting rotation expressed as yaw,pitch,roll (e.g. "0,0,0"). */
  startRotation?: string
  /** Optional highlight reel identifier. */
  highlightReel?: string
  /** Disable quickstart UI elements. */
  disableQuickstart?: boolean
}

export const buildMatterportUrl = (modelId: string, options: MatterportEmbedOptions = {}) => {
  const params = new URLSearchParams({ m: modelId })

  if (options.autoplay !== false) {
    params.set("play", "1")
  } else {
    params.set("play", "0")
  }

  if (options.applicationKey) {
    params.set("applicationKey", options.applicationKey)
  }

  if (options.startRotation) {
    params.set("sr", options.startRotation)
  }

  if (options.highlightReel) {
    params.set("hr", options.highlightReel)
  }

  if (options.disableQuickstart) {
    params.set("qs", "1")
  }

  const query = params.toString()
  return `${MATTERPORT_SHOWCASE_BASE_URL}?${query}`
}

export type { MatterportEmbedOptions as MatterportShowcaseOptions }
