import { SceneTransition, SceneTransitionType } from "./types"

type PreloadScene = (sceneId: string) => Promise<void>
type ActivateScene = (sceneId: string) => Promise<void> | void

type TransitionHooks = {
  onStart?: (transition: SceneTransition) => void
  onProgress?: (progress: number, transition: SceneTransition) => void
  onComplete?: (transition: SceneTransition) => void
  onError?: (error: Error, transition: SceneTransition) => void
}

export interface TransitionRequest {
  fromSceneId: string
  toSceneId: string
  transition?: Partial<SceneTransition>
}

export interface SceneTransitionEngineOptions {
  preloadScene: PreloadScene
  activateScene: ActivateScene
  hooks?: TransitionHooks
  defaultDuration?: number
  defaultType?: SceneTransitionType
  cacheSize?: number
}

interface CachedSceneEntry {
  sceneId: string
  lastUsedAt: number
}

export class SceneTransitionEngine {
  private readonly preloadScene: PreloadScene
  private readonly activateScene: ActivateScene
  private readonly hooks: TransitionHooks
  private readonly defaultDuration: number
  private readonly defaultType: SceneTransitionType
  private readonly cacheSize: number
  private inflightTransition: Promise<void> | null = null
  private cachedScenes: CachedSceneEntry[] = []

  constructor(options: SceneTransitionEngineOptions) {
    this.preloadScene = options.preloadScene
    this.activateScene = options.activateScene
    this.hooks = options.hooks ?? {}
    this.defaultDuration = options.defaultDuration ?? 1200
    this.defaultType = options.defaultType ?? "walkthrough"
    this.cacheSize = options.cacheSize ?? 3
  }

  async transition(request: TransitionRequest): Promise<void> {
    const transition: SceneTransition = {
      fromSceneId: request.fromSceneId,
      toSceneId: request.toSceneId,
      type: request.transition?.type ?? this.defaultType,
      duration: request.transition?.duration ?? this.defaultDuration,
      easing: request.transition?.easing ?? "smoothstep",
      preload: request.transition?.preload ?? true,
      metadata: request.transition?.metadata,
    }

    if (this.inflightTransition) {
      await this.inflightTransition
    }

    const run = async () => {
      try {
        this.hooks.onStart?.(transition)
        if (transition.preload !== false) {
          await this.ensureSceneCached(transition.toSceneId)
        }
        await this.animateTransition(transition)
        await this.activateScene(transition.toSceneId)
        this.hooks.onComplete?.(transition)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        this.hooks.onError?.(err, transition)
        throw err
      }
    }

    this.inflightTransition = run()
    return this.inflightTransition.finally(() => {
      this.inflightTransition = null
    })
  }

  private async ensureSceneCached(sceneId: string) {
    const cached = this.cachedScenes.find((entry) => entry.sceneId === sceneId)
    if (cached) {
      cached.lastUsedAt = Date.now()
      return
    }

    await this.preloadScene(sceneId)
    this.cachedScenes.push({ sceneId, lastUsedAt: Date.now() })
    if (this.cachedScenes.length > this.cacheSize) {
      this.cachedScenes.sort((a, b) => a.lastUsedAt - b.lastUsedAt)
      this.cachedScenes.splice(0, this.cachedScenes.length - this.cacheSize)
    }
  }

  private async animateTransition(transition: SceneTransition) {
    const totalDuration = Math.max(transition.duration, 1)
    const steps = Math.ceil(totalDuration / 16)
    for (let step = 0; step <= steps; step += 1) {
      const progress = this.applyEasing(step / steps, transition.easing)
      this.hooks.onProgress?.(progress, transition)
      await delay(16)
    }
  }

  private applyEasing(progress: number, easing: SceneTransition["easing"]): number {
    const clamped = Math.min(Math.max(progress, 0), 1)
    switch (easing) {
      case "linear":
        return clamped
      case "cubic":
        return clamped * clamped * (3 - 2 * clamped)
      case "smoothstep":
      default:
        return clamped * clamped * (3 - 2 * clamped)
    }
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

