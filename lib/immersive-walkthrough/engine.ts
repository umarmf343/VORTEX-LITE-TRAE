import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  LightProbe,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Matrix3,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  RingGeometry,
  Scene,
  Sphere,
  SphereGeometry,
  Spherical,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js"
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator"

import type {
  ImmersiveWalkthroughSpace,
  WalkthroughHotspot,
  WalkthroughNode,
} from "@/lib/types"

export type WalkthroughEngineEvent =
  | { type: "ready" }
  | { type: "nodechange"; node: WalkthroughNode }
  | { type: "hotspot"; hotspot: WalkthroughHotspot }
  | { type: "autotour"; state: "start" | "stop"; node?: WalkthroughNode }

export interface ImmersiveWalkthroughEngineOptions {
  container: HTMLElement
  overlay: HTMLElement
  space: ImmersiveWalkthroughSpace
  onEvent?: (event: WalkthroughEngineEvent) => void
}

interface TransitionState {
  from: Vector3
  to: Vector3
  start: number
  duration: number
  easing: (t: number) => number
  targetYaw?: number
  zoom?: { strength: number }
  startFov?: number
}

interface AutoTourState {
  route: WalkthroughNode[]
  index: number
  pauseUntil: number
  dwell: number
}

interface NavigationIndicatorState {
  visible: boolean
  opacity: number
  targetOpacity: number
  scale: number
  targetScale: number
  point: Vector3
  normal: Vector3
  distance: number
}

interface HotspotVisual {
  hotspot: WalkthroughHotspot
  group: Group
  sphere: Mesh<SphereGeometry, MeshStandardMaterial>
  ring: Mesh<RingGeometry, MeshBasicMaterial>
  label?: HTMLDivElement
  baseColor: Color
  focus: number
  index: number
}

const DEFAULT_TRANSITION_MS = 1600
const DEFAULT_AUTO_TOUR_DWELL = 4200
const CAMERA_COLLISION_RADIUS = 0.35

const sphericalFromDirection = (direction: Vector3) => {
  const spherical = new Spherical()
  spherical.setFromVector3(direction)
  return spherical
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export class ImmersiveWalkthroughEngine {
  private readonly container: HTMLElement
  private readonly overlay: HTMLElement
  private readonly space: ImmersiveWalkthroughSpace
  private readonly onEvent?: (event: WalkthroughEngineEvent) => void

  private renderer: WebGLRenderer | null = null
  private scene: Scene | null = null
  private camera: PerspectiveCamera | null = null
  private mixer: AnimationMixer | null = null
  private clock = new Clock()
  private animationFrame: number | null = null
  private nodes = new Map<string, WalkthroughNode>()
  private hotspots: WalkthroughHotspot[] = []
  private hotspotVisuals: HotspotVisual[] = []
  private hotspotGroup: Group | null = null
  private collisionMeshes: Mesh[] = []
  private transition: TransitionState | null = null
  private activeNode: WalkthroughNode | null = null
  private keysPressed: Record<string, boolean> = {}
  private autoTour: AutoTourState | null = null
  private movementSpeed = 1.75
  private orbit = { yaw: 0, pitch: 0 }
  private pointerDown: Vector2 | null = null
  private pointerDownInfo: { position: Vector2; time: number; pointerType: string } | null = null
  private eyeHeight: number
  private bounds: Box3 | null = null
  private overlayBounds: DOMRect | null = null
  private raycaster = new Raycaster()
  private hdrTexture: Texture | null = null
  private navigationIndicator: Mesh<RingGeometry, MeshBasicMaterial> | null = null
  private navigationIndicatorState: NavigationIndicatorState = {
    visible: false,
    opacity: 0,
    targetOpacity: 0,
    scale: 1,
    targetScale: 1,
    point: new Vector3(),
    normal: new Vector3(0, 1, 0),
    distance: 0,
  }
  private hoverIntersection: { point: Vector3; normal: Vector3; distance: number } | null = null
  private pointerVelocity = 0
  private lastPointerPosition: Vector2 | null = null
  private lastPointerTimestamp = 0
  private hoveredHotspotId: string | null = null
  private accentColor = new Color(0x6fffd7)
  private sceneFade: { start: number; duration: number } | null = null
  private sceneTransitionOverlay: HTMLDivElement | null = null

  constructor(options: ImmersiveWalkthroughEngineOptions) {
    this.container = options.container
    this.overlay = options.overlay
    this.space = options.space
    this.onEvent = options.onEvent
    this.eyeHeight = options.space.eyeHeight ?? 1.7

    this.container.addEventListener("pointerdown", this.handlePointerDown)
    this.container.addEventListener("pointermove", this.handlePointerHover)
    this.container.addEventListener("pointerleave", this.handlePointerLeave)
    window.addEventListener("pointermove", this.handlePointerMove)
    window.addEventListener("pointerup", this.handlePointerUp)
    window.addEventListener("keydown", this.handleKeyDown)
    window.addEventListener("keyup", this.handleKeyUp)
  }

  async initialize() {
    const { clientWidth, clientHeight } = this.container
    this.overlayBounds = this.overlay.getBoundingClientRect()

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setSize(clientWidth, clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.renderer.shadowMap.enabled = true
    this.renderer.outputColorSpace = "srgb" as never
    this.renderer.domElement.style.width = "100%"
    this.renderer.domElement.style.height = "100%"
    this.renderer.domElement.style.display = "block"
    this.renderer.domElement.style.touchAction = "none"
    this.container.appendChild(this.renderer.domElement)

    this.scene = new Scene()
    this.scene.background = new Color(0x050505)

    const camera = new PerspectiveCamera(
      this.space.defaultFov ?? 75,
      Math.max(clientWidth, 1) / Math.max(clientHeight, 1),
      0.05,
      2000,
    )
    camera.position.set(0, this.eyeHeight, 0)
    camera.lookAt(0, this.eyeHeight, -1)
    this.camera = camera

    const ambient = new AmbientLight(0xffffff, 0.25)
    const hemi = new HemisphereLight(0xffffff, 0x080820, 0.4)
    const key = new DirectionalLight(0xffffff, 0.6)
    key.position.set(5, 10, 7)
    key.castShadow = true

    this.scene.add(ambient, hemi, key)

    await this.loadEnvironment()
    await this.loadSpatialAssets()

    this.updateAccentColor()
    this.createNavigationIndicator()

    this.populateNavigation()
    this.populateHotspots()
    this.updateOverlayHotspots()

    this.onEvent?.({ type: "ready" })

    this.start()
  }

  dispose() {
    this.stop()

    this.container.removeEventListener("pointerdown", this.handlePointerDown)
    this.container.removeEventListener("pointermove", this.handlePointerHover)
    this.container.removeEventListener("pointerleave", this.handlePointerLeave)
    window.removeEventListener("pointermove", this.handlePointerMove)
    window.removeEventListener("pointerup", this.handlePointerUp)
    window.removeEventListener("keydown", this.handleKeyDown)
    window.removeEventListener("keyup", this.handleKeyUp)

    this.renderer?.dispose()
    this.renderer?.domElement.remove()
    this.renderer = null

    this.hdrTexture?.dispose()
    this.hdrTexture = null

    this.scene = null
    this.camera = null
    this.collisionMeshes = []
    this.nodes.clear()
    this.disposeHotspots()
    this.sceneTransitionOverlay?.remove()
    this.sceneTransitionOverlay = null
  }

  start() {
    if (this.animationFrame !== null) {
      return
    }
    this.clock.start()
    const loop = () => {
      this.animationFrame = window.requestAnimationFrame(loop)
      this.update()
    }
    this.animationFrame = window.requestAnimationFrame(loop)
  }

  stop() {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.clock.stop()
  }

  resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return
    this.renderer.setSize(width, height)
    this.camera.aspect = Math.max(width, 1) / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.overlayBounds = this.overlay.getBoundingClientRect()
  }

  navigateToNode(
    nodeId: string,
    options?: { immediate?: boolean; durationMs?: number; zoomStrength?: number },
  ) {
    const node = this.nodes.get(nodeId)
    if (!node || !this.camera) return

    this.autoTour = null

    if (options?.immediate) {
      this.setCameraToNode(node)
      this.onEvent?.({ type: "nodechange", node })
      return
    }

    const from = this.camera.position.clone()
    const to = new Vector3(node.position[0], node.position[1] + this.eyeHeight, node.position[2])
    const duration = options?.durationMs ?? node.transitionDurationMs ?? DEFAULT_TRANSITION_MS
    this.transition = {
      from,
      to,
      start: performance.now(),
      duration,
      easing: easeInOutCubic,
      targetYaw: node.orientation?.yaw,
      zoom: options?.zoomStrength ? { strength: MathUtils.clamp(options.zoomStrength, 0, 0.4) } : undefined,
      startFov: this.camera.fov,
    }
    this.activeNode = node
  }

  navigateToNextNode() {
    if (!this.activeNode) {
      this.navigateToNode(this.space.defaultNodeId, { immediate: true })
      return
    }
    const connected = this.activeNode.connectedTo ?? []
    if (connected.length === 0) {
      return
    }
    const nextId = connected[0]
    this.navigateToNode(nextId)
  }

  navigateToPreviousNode() {
    if (!this.activeNode) {
      this.navigateToNode(this.space.defaultNodeId, { immediate: true })
      return
    }
    const reverse = [...(this.activeNode.connectedTo ?? [])].reverse()
    const prevId = reverse[0]
    if (prevId) {
      this.navigateToNode(prevId)
    }
  }

  enableFreeMove(enabled: boolean) {
    this.space.manualWalkEnabled = enabled
    if (!enabled && this.activeNode) {
      this.navigateToNode(this.activeNode.id)
    }
  }

  setAutoTour(enabled: boolean, dwellMs = DEFAULT_AUTO_TOUR_DWELL) {
    if (!enabled) {
      if (this.autoTour) {
        this.onEvent?.({ type: "autotour", state: "stop", node: this.autoTour.route[this.autoTour.index] })
      }
      this.autoTour = null
      return
    }

    const route = this.buildAutoTourRoute()
    if (!route.length) return

    this.autoTour = {
      route,
      index: 0,
      pauseUntil: performance.now(),
      dwell: dwellMs,
    }
    this.onEvent?.({ type: "autotour", state: "start", node: route[0] })
    this.navigateToNode(route[0].id)
  }

  getActiveNode() {
    return this.activeNode
  }

  getNodes(): WalkthroughNode[] {
    return Array.from(this.nodes.values())
  }

  private async loadEnvironment() {
    if (!this.renderer || !this.scene) return
    if (!this.space.hdrEnvironmentUrl) {
      return
    }

    const pmrem = new PMREMGenerator(this.renderer)
    pmrem.compileEquirectangularShader()

    try {
      const texture = await new HDRLoader().loadAsync(this.space.hdrEnvironmentUrl!)
      this.hdrTexture = texture
      const envMap = pmrem.fromEquirectangular(texture).texture
      envMap.mapping = EquirectangularReflectionMapping
      this.scene!.environment = envMap
      this.scene!.background = null
      const probe = LightProbeGenerator.fromCubeTexture(envMap)
      this.scene!.add(probe as LightProbe)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to load HDR environment", error)
      }
    } finally {
      pmrem.dispose()
    }
  }

  private async loadSpatialAssets() {
    if (!this.scene) return

    const loader = new GLTFLoader()
    if (this.space.dracoDecoderPath) {
      const draco = new DRACOLoader()
      draco.setDecoderPath(this.space.dracoDecoderPath)
      loader.setDRACOLoader(draco)
    }

    await new Promise<void>((resolve, reject) => {
      loader.load(
        this.space.spatialMeshUrl,
        (gltf) => {
          const root = gltf.scene || new Group()
          root.traverse((child) => {
            if (child instanceof Mesh) {
              child.castShadow = true
              child.receiveShadow = true
              const material = child.material
              if (material instanceof MeshStandardMaterial) {
                material.metalness = Math.min(1, material.metalness ?? 0.2 + (this.space.materialBoost ?? 0))
                material.roughness = Math.max(0, Math.min(1, material.roughness ?? 0.6 - (this.space.materialBoost ?? 0)))
              }
              this.collisionMeshes.push(child)
            }
          })
          this.scene!.add(root)

          const bounds = new Box3().setFromObject(root)
          if (!bounds.isEmpty()) {
            this.bounds = bounds
          }

          if (gltf.animations.length) {
            this.mixer = new AnimationMixer(root)
            gltf.animations.forEach((clip) => this.mixer?.clipAction(clip).play())
          }
          resolve()
        },
        undefined,
        (error) => reject(error),
      )
    })
  }

  private populateNavigation() {
    const nodes = this.space.nodes ?? []
    nodes.forEach((node) => this.nodes.set(node.id, node))
    const firstNode = this.nodes.get(this.space.defaultNodeId) ?? nodes[0]
    if (firstNode) {
      this.setCameraToNode(firstNode)
      this.activeNode = firstNode
      this.orbit.yaw = firstNode.orientation?.yaw ?? 0
      this.orbit.pitch = firstNode.orientation?.pitch ?? 0
    }

    if (!this.bounds && nodes.length) {
      const box = new Box3()
      nodes.forEach((node) => box.expandByPoint(new Vector3(node.position[0], node.position[1], node.position[2])))
      this.bounds = box
    }
  }

  private updateAccentColor() {
    const base = new Color(0x6fffd7)
    if (this.scene?.background instanceof Color) {
      const backgroundHsl = { h: 0, s: 0, l: 0 }
      this.scene.background.getHSL(backgroundHsl)
      const baseHsl = { h: 0, s: 0, l: 0 }
      base.getHSL(baseHsl)
      base.setHSL(
        baseHsl.h,
        MathUtils.clamp((baseHsl.s * 3 + backgroundHsl.s) / 4, 0, 1),
        MathUtils.clamp((baseHsl.l * 2 + backgroundHsl.l) / 3, 0, 1),
      )
    }
    if (this.space.outdoor) {
      base.offsetHSL(0, -0.05, 0.05)
    }
    this.accentColor = base
  }

  private getTintedAccent(intensity = 1) {
    const clamped = MathUtils.clamp(intensity, 0, 1)
    const accent = this.accentColor.clone()
    const hsl = { h: 0, s: 0, l: 0 }
    accent.getHSL(hsl)
    const lightness = MathUtils.clamp(hsl.l * 0.6 + 0.4 * clamped, 0, 1)
    const saturation = MathUtils.clamp(hsl.s * 0.7 + 0.3 * clamped, 0, 1)
    accent.setHSL(hsl.h, saturation, lightness)
    return accent
  }

  private createNavigationIndicator() {
    if (!this.scene) return
    if (this.navigationIndicator) {
      this.scene.remove(this.navigationIndicator)
      this.navigationIndicator.geometry.dispose()
      this.navigationIndicator.material.dispose()
      this.navigationIndicator = null
    }

    const geometry = new RingGeometry(0.35, 0.48, 72)
    const material = new MeshBasicMaterial({
      color: this.getTintedAccent(0.9),
      transparent: true,
      opacity: 0,
      side: DoubleSide,
      depthWrite: false,
    })
    const indicator = new Mesh(geometry, material)
    indicator.rotation.x = Math.PI / 2
    indicator.renderOrder = 1000
    indicator.visible = false
    this.scene.add(indicator)
    this.navigationIndicator = indicator
  }

  private populateHotspots() {
    if (!this.scene) return
    this.hotspots = [...(this.space.hotspots ?? [])]
    this.disposeHotspots()

    if (!this.hotspots.length) {
      return
    }

    const group = new Group()
    group.name = "walkthrough-hotspots"
    const accent = this.getTintedAccent(0.85)

    this.hotspotVisuals = this.hotspots.map((hotspot, index) => {
      const sphereGeometry = new SphereGeometry(0.2, 12, 12)
      const baseColor = accent.clone()
      const sphereMaterial = new MeshStandardMaterial({
        color: baseColor.clone(),
        emissive: baseColor.clone().multiplyScalar(0.45),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        roughness: 0.35,
        metalness: 0.05,
      })
      const sphere = new Mesh(sphereGeometry, sphereMaterial)
      sphere.userData.hotspotId = hotspot.id

      const ringGeometry = new RingGeometry(0.22, 0.35, 48)
      const ringMaterial = new MeshBasicMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0.6,
        side: DoubleSide,
        depthWrite: false,
      })
      const ring = new Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.userData.hotspotId = hotspot.id

      const hotspotGroup = new Group()
      hotspotGroup.userData.hotspotId = hotspot.id
      const basePosition = new Vector3(hotspot.position[0], hotspot.position[1], hotspot.position[2])
      hotspotGroup.userData.basePosition = basePosition
      hotspotGroup.position.copy(basePosition)
      hotspotGroup.add(ring)
      hotspotGroup.add(sphere)

      group.add(hotspotGroup)

      let label: HTMLDivElement | undefined
      if (hotspot.title) {
        label = document.createElement("div")
        label.className =
          "pointer-events-none absolute min-w-[96px] -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-md transition-opacity"
        label.style.opacity = "0"
        label.style.zIndex = "3"
        label.innerText = hotspot.title
        this.overlay.appendChild(label)
      }

      const visual: HotspotVisual = {
        hotspot,
        group: hotspotGroup,
        sphere: sphere as Mesh<SphereGeometry, MeshStandardMaterial>,
        ring: ring as Mesh<RingGeometry, MeshBasicMaterial>,
        label,
        baseColor,
        focus: 0,
        index,
      }
      return visual
    })

    this.scene.add(group)
    this.hotspotGroup = group
  }

  private disposeHotspots() {
    if (this.hotspotGroup && this.scene) {
      this.scene.remove(this.hotspotGroup)
    }
    this.hotspotVisuals.forEach((visual) => {
      visual.sphere.geometry.dispose()
      visual.sphere.material.dispose()
      visual.ring.geometry.dispose()
      visual.ring.material.dispose()
      visual.label?.remove()
    })
    this.hotspotVisuals = []
    this.hotspotGroup = null
    this.hoveredHotspotId = null
  }

  private buildAutoTourRoute(): WalkthroughNode[] {
    const nodes = this.space.autoTour?.order?.map((id) => this.nodes.get(id)).filter(Boolean) as WalkthroughNode[]
    if (nodes.length) {
      return nodes
    }
    const tagged = this.space.nodes?.filter((node) => node.tags?.includes("highlight")) ?? []
    if (tagged.length) {
      return tagged
    }
    return Array.from(this.nodes.values())
  }

  private onHotspotActivate(hotspot: WalkthroughHotspot) {
    this.onEvent?.({ type: "hotspot", hotspot })
  }

  private setCameraToNode(node: WalkthroughNode) {
    if (!this.camera) return
    this.camera.position.set(node.position[0], node.position[1] + this.eyeHeight, node.position[2])
    const yaw = node.orientation?.yaw ?? 0
    const pitch = node.orientation?.pitch ?? 0
    this.applyYawPitch(yaw, pitch)
    this.activeNode = node
    this.onEvent?.({ type: "nodechange", node })
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    this.pointerDown = new Vector2(event.clientX, event.clientY)
    this.pointerDownInfo = {
      position: new Vector2(event.clientX, event.clientY),
      time: performance.now(),
      pointerType: event.pointerType,
    }
    this.container.setPointerCapture(event.pointerId)
    this.handlePointerHover(event)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.pointerDown || !this.camera) return
    if (!this.container.hasPointerCapture(event.pointerId)) return
    const deltaX = event.clientX - this.pointerDown.x
    const deltaY = event.clientY - this.pointerDown.y
    this.pointerDown.set(event.clientX, event.clientY)

    const sensitivity = this.space.pointerSensitivity ?? 0.0025
    this.orbit.yaw -= deltaX * sensitivity
    this.orbit.pitch -= deltaY * sensitivity
    this.orbit.pitch = MathUtils.clamp(this.orbit.pitch, -Math.PI / 3, Math.PI / 3)
    this.applyYawPitch(this.orbit.yaw, this.orbit.pitch)
  }

  private handlePointerUp = (event: PointerEvent) => {
    if (this.container.hasPointerCapture(event.pointerId)) {
      this.container.releasePointerCapture(event.pointerId)
    }
    this.pointerDown = null
    const downInfo = this.pointerDownInfo
    this.pointerDownInfo = null
    const isPrimaryButton = event.button === 0 || event.button === -1
    const pointerUpPosition = new Vector2(event.clientX, event.clientY)
    if (downInfo && isPrimaryButton) {
      const distance = downInfo.position.distanceTo(pointerUpPosition)
      const duration = performance.now() - downInfo.time
      if (distance < 6 && duration < 450) {
        this.handlePointerSelection(event)
      }
    }
  }

  private handlePointerHover = (event: PointerEvent) => {
    if (!this.camera || !this.renderer) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointer = new Vector2(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      (-(event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1,
    )

    const now = performance.now()
    if (this.lastPointerPosition) {
      const delta = this.lastPointerPosition.distanceTo(new Vector2(event.clientX, event.clientY))
      const elapsed = Math.max(now - this.lastPointerTimestamp, 16)
      this.pointerVelocity = MathUtils.clamp(delta / elapsed, 0, 1.2)
    }
    this.lastPointerPosition = new Vector2(event.clientX, event.clientY)
    this.lastPointerTimestamp = now

    this.updateSurfaceHover(pointer, event.pointerType)
    this.updateHotspotHover(pointer)
  }

  private handlePointerLeave = () => {
    this.hoverIntersection = null
    this.navigationIndicatorState.visible = false
    this.navigationIndicatorState.targetOpacity = 0
    this.navigationIndicatorState.targetScale = 1
    this.hoveredHotspotId = null
    this.lastPointerPosition = null
    this.pointerVelocity = 0
  }

  private handlePointerSelection(event: PointerEvent) {
    if (this.hoveredHotspotId) {
      const hotspot = this.hotspots.find((item) => item.id === this.hoveredHotspotId)
      if (hotspot) {
        this.navigationIndicatorState.visible = false
        this.navigationIndicatorState.targetOpacity = 0
        this.navigationIndicatorState.targetScale = 1
        if (hotspot.type === "navigation" && hotspot.targetNodeId) {
          this.beginSceneTransition()
          this.navigateToNode(hotspot.targetNodeId, { durationMs: 720, zoomStrength: 0.18 })
        }
        this.onHotspotActivate(hotspot)
      }
      return
    }

    if (!this.hoverIntersection) {
      return
    }

    this.handleTeleportFromSurface()
  }

  private updateSurfaceHover(pointer: Vector2, pointerType: string) {
    if (!this.camera) return
    if (!this.collisionMeshes.length) {
      this.navigationIndicatorState.visible = false
      this.navigationIndicatorState.targetOpacity = 0
      return
    }

    this.raycaster.setFromCamera(pointer, this.camera)
    const intersections = this.raycaster.intersectObjects(this.collisionMeshes, true)
    if (!intersections.length) {
      this.hoverIntersection = null
      this.navigationIndicatorState.visible = false
      this.navigationIndicatorState.targetOpacity = 0
      return
    }

    const hit = intersections[0]
    const normal = hit.face?.normal?.clone() ?? new Vector3(0, 1, 0)
    const normalMatrix = new Matrix3().getNormalMatrix(hit.object.matrixWorld)
    normal.applyMatrix3(normalMatrix).normalize()

    this.hoverIntersection = {
      point: hit.point.clone(),
      normal,
      distance: hit.distance,
    }

    const distanceFactor = MathUtils.clamp(1 - Math.min(hit.distance, 12) / 12, 0, 1)
    const motionFactor = MathUtils.clamp(this.pointerVelocity / 0.55, 0, 1)
    let scale = MathUtils.lerp(0.92, 1.18, motionFactor)
    if (pointerType === "touch") {
      scale += 0.1
    }

    this.navigationIndicatorState.visible = true
    this.navigationIndicatorState.point.copy(hit.point)
    this.navigationIndicatorState.normal.copy(normal)
    this.navigationIndicatorState.distance = hit.distance
    this.navigationIndicatorState.targetOpacity = MathUtils.lerp(0.32, 0.9, distanceFactor)
    this.navigationIndicatorState.targetScale = MathUtils.clamp(scale, 0.85, 1.35)
  }

  private updateHotspotHover(pointer: Vector2) {
    if (!this.camera || !this.hotspotGroup) {
      this.hoveredHotspotId = null
      return
    }

    this.raycaster.setFromCamera(pointer, this.camera)
    const intersections = this.raycaster.intersectObjects(this.hotspotGroup.children, true)
    if (!intersections.length) {
      this.hoveredHotspotId = null
      return
    }

    const hotspotId = this.resolveHotspotId(intersections[0].object)
    this.hoveredHotspotId = hotspotId
    if (hotspotId) {
      this.navigationIndicatorState.visible = false
      this.navigationIndicatorState.targetOpacity = 0
      this.navigationIndicatorState.targetScale = 1
    }
  }

  private resolveHotspotId(object: Object3D | null): string | null {
    let current: Object3D | null = object
    while (current) {
      const id = current.userData?.hotspotId
      if (typeof id === "string") {
        return id
      }
      current = current.parent
    }
    return null
  }

  private handleTeleportFromSurface() {
    if (!this.hoverIntersection) return
    const node = this.findNearestNode(this.hoverIntersection.point)
    if (!node) return

    this.navigationIndicatorState.visible = false
    this.navigationIndicatorState.targetOpacity = 0
    this.navigationIndicatorState.targetScale = 1
    this.navigateToNode(node.id, { durationMs: 680, zoomStrength: 0.16 })
  }

  private findNearestNode(point: Vector3) {
    const connected = this.activeNode?.connectedTo ?? []
    const candidates = connected
      .map((id) => this.nodes.get(id))
      .filter((node): node is WalkthroughNode => Boolean(node))
    const pool = candidates.length ? candidates : Array.from(this.nodes.values())
    let closest: WalkthroughNode | null = null
    let bestDistance = Infinity
    pool.forEach((node) => {
      const nodePosition = new Vector3(node.position[0], node.position[1], node.position[2])
      const distance = nodePosition.distanceTo(point)
      if (distance < bestDistance) {
        bestDistance = distance
        closest = node
      }
    })

    if (!closest) {
      return null
    }

    const maxSnapDistance = 3.8
    return bestDistance <= maxSnapDistance ? closest : null
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.keysPressed[event.key.toLowerCase()] = true
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keysPressed[event.key.toLowerCase()] = false
  }

  private applyYawPitch(yaw: number, pitch: number) {
    if (!this.camera) return
    const direction = new Vector3()
    direction.set(
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(yaw),
    )
    const target = this.camera.position.clone().add(direction)
    this.camera.lookAt(target)
  }

  private update() {
    const delta = this.clock.getDelta()
    this.mixer?.update(delta)
    this.updateTransition()
    this.updateAutoTour()
    this.updateManualMovement(delta)
    this.updateNavigationIndicator(delta)
    this.updateHotspots(delta)
    this.updateSceneFade()
    this.render()
  }

  private updateTransition() {
    if (!this.transition || !this.camera) return
    const elapsed = performance.now() - this.transition.start
    const progress = MathUtils.clamp(elapsed / this.transition.duration, 0, 1)
    const eased = this.transition.easing(progress)
    const position = new Vector3().lerpVectors(this.transition.from, this.transition.to, eased)
    this.camera.position.copy(position)
    this.camera.position.y = this.transition.to.y

    if (this.transition.targetYaw !== undefined) {
      const currentDirection = new Vector3()
      this.camera.getWorldDirection(currentDirection)
      const spherical = sphericalFromDirection(currentDirection)
      const nextYaw = MathUtils.lerp(spherical.theta, this.transition.targetYaw, eased)
      const pitch = MathUtils.lerp(spherical.phi - Math.PI / 2, this.activeNode?.orientation?.pitch ?? 0, eased)
      this.applyYawPitch(nextYaw, pitch)
    }

    if (this.transition.zoom && this.transition.startFov !== undefined) {
      const strength = this.transition.zoom.strength
      const baseline = this.transition.startFov
      const zoomWave = Math.sin(Math.PI * progress)
      const targetFov = baseline * (1 - strength * zoomWave)
      this.camera.fov = MathUtils.lerp(this.camera.fov, targetFov, 0.35)
      this.camera.updateProjectionMatrix()
    }

    if (progress >= 1) {
      if (this.transition.startFov !== undefined) {
        this.camera.fov = this.transition.startFov
        this.camera.updateProjectionMatrix()
      }
      this.transition = null
      if (this.activeNode) {
        this.onEvent?.({ type: "nodechange", node: this.activeNode })
      }
    }
  }

  private updateAutoTour() {
    if (!this.autoTour) return
    if (this.transition) return
    if (performance.now() < this.autoTour.pauseUntil) {
      return
    }

    const { route, index } = this.autoTour
    const nextIndex = (index + 1) % route.length
    this.autoTour.index = nextIndex
    this.autoTour.pauseUntil = performance.now() + this.autoTour.dwell
    this.onEvent?.({ type: "autotour", state: "start", node: route[nextIndex] })
    this.navigateToNode(route[nextIndex].id)
  }

  private updateManualMovement(delta: number) {
    if (!this.space.manualWalkEnabled || !this.camera) {
      return
    }
    const direction = new Vector3()
    const right = new Vector3()
    this.camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()
    right.crossVectors(direction, new Vector3(0, 1, 0)).normalize()

    const velocity = new Vector3()
    if (this.keysPressed["w"] || this.keysPressed["arrowup"]) {
      velocity.add(direction)
    }
    if (this.keysPressed["s"] || this.keysPressed["arrowdown"]) {
      velocity.sub(direction)
    }
    if (this.keysPressed["a"] || this.keysPressed["arrowleft"]) {
      velocity.sub(right)
    }
    if (this.keysPressed["d"] || this.keysPressed["arrowright"]) {
      velocity.add(right)
    }

    if (velocity.lengthSq() === 0) {
      return
    }

    velocity.normalize().multiplyScalar(this.movementSpeed * delta)
    const nextPosition = this.camera.position.clone().add(velocity)
    nextPosition.y = this.eyeHeight

    if (this.bounds) {
      nextPosition.x = MathUtils.clamp(nextPosition.x, this.bounds.min.x, this.bounds.max.x)
      nextPosition.z = MathUtils.clamp(nextPosition.z, this.bounds.min.z, this.bounds.max.z)
    }

    if (!this.collides(nextPosition)) {
      this.camera.position.copy(nextPosition)
    }
  }

  private collides(position: Vector3) {
    if (!this.collisionMeshes.length) {
      return false
    }

    for (const mesh of this.collisionMeshes) {
      const sphere = new Sphere(position, CAMERA_COLLISION_RADIUS)
      const geometry = mesh.geometry
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox()
      }
      const box = geometry.boundingBox
      if (!box) continue
      const transformed = box.clone()
      transformed.applyMatrix4(mesh.matrixWorld)
      if (transformed.intersectsSphere(sphere)) {
        return true
      }
    }

    return false
  }

  private updateNavigationIndicator(delta: number) {
    if (!this.navigationIndicator) {
      return
    }

    if (this.navigationIndicatorState.visible) {
      this.pointerVelocity = Math.max(0, this.pointerVelocity - delta * 0.6)
      if (this.pointerVelocity < 0.05) {
        this.navigationIndicatorState.targetScale = MathUtils.lerp(
          this.navigationIndicatorState.targetScale,
          0.94,
          1 - Math.exp(-delta * 6),
        )
      }
    } else {
      this.pointerVelocity = 0
    }

    const smoothing = 1 - Math.exp(-delta * 12)
    const targetOpacity = this.navigationIndicatorState.visible
      ? this.navigationIndicatorState.targetOpacity
      : 0
    this.navigationIndicatorState.opacity = MathUtils.lerp(
      this.navigationIndicatorState.opacity,
      targetOpacity,
      smoothing,
    )
    this.navigationIndicatorState.scale = MathUtils.lerp(
      this.navigationIndicatorState.scale,
      this.navigationIndicatorState.targetScale,
      smoothing,
    )

    const material = this.navigationIndicator.material as MeshBasicMaterial
    material.opacity = this.navigationIndicatorState.opacity
    const depthFactor = MathUtils.clamp(
      1 - Math.min(this.navigationIndicatorState.distance, 14) / 14,
      0,
      1,
    )
    material.color.copy(this.getTintedAccent(0.7 + depthFactor * 0.3))

    if (this.navigationIndicatorState.opacity <= 0.015) {
      this.navigationIndicator.visible = false
      return
    }

    this.navigationIndicator.visible = true
    const baseScale = MathUtils.clamp(
      0.55 + this.navigationIndicatorState.distance * 0.08,
      0.55,
      2.6,
    )
    this.navigationIndicator.scale.setScalar(baseScale * this.navigationIndicatorState.scale)

    const offset = this.navigationIndicatorState.normal.clone().multiplyScalar(0.01)
    const position = this.navigationIndicatorState.point.clone().add(offset)
    this.navigationIndicator.position.copy(position)

    const quaternion = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      this.navigationIndicatorState.normal.clone().normalize(),
    )
    this.navigationIndicator.setRotationFromQuaternion(quaternion)
  }

  private updateHotspots(delta: number) {
    if (!this.camera) return
    if (!this.hotspotVisuals.length) return
    this.overlayBounds = this.overlay.getBoundingClientRect()
    const smoothing = 1 - Math.exp(-delta * 10)
    const now = performance.now()

    this.hotspotVisuals.forEach((visual) => {
      const basePosition = visual.group.userData.basePosition as Vector3 | undefined
      if (basePosition) {
        const bob = Math.sin(now * 0.0015 + visual.index * 0.6) * 0.05
        visual.group.position.set(basePosition.x, basePosition.y + bob, basePosition.z)
      }

      const occluded = this.isOccluded(visual.group.position.clone())
      visual.group.visible = !occluded

      const targetFocus = this.hoveredHotspotId === visual.hotspot.id ? 1 : 0
      visual.focus = MathUtils.lerp(visual.focus, targetFocus, smoothing)

      const sphereMaterial = visual.sphere.material as MeshStandardMaterial
      const ringMaterial = visual.ring.material as MeshBasicMaterial
      const distance = this.camera!.position.distanceTo(visual.group.position)
      const depthFactor = MathUtils.clamp(1 - Math.min(distance, 18) / 18, 0, 1)
      const accent = this.getTintedAccent(0.65 + depthFactor * 0.35)

      sphereMaterial.color.copy(accent)
      sphereMaterial.opacity = MathUtils.lerp(0.7, 0.95, visual.focus)
      sphereMaterial.emissive.copy(accent.clone().multiplyScalar(0.4 + visual.focus * 0.45))

      ringMaterial.color.copy(accent)
      ringMaterial.opacity = MathUtils.lerp(0.65, 0.95, visual.focus)

      const pulse = 1 + Math.sin(now * 0.004 + visual.index) * 0.02
      const focusScale = MathUtils.lerp(1, 1.1, visual.focus)
      visual.sphere.scale.setScalar(focusScale * pulse)
      visual.ring.scale.setScalar(MathUtils.lerp(1, 1.12, visual.focus) * (1 + Math.sin(now * 0.003 + visual.index) * 0.015))
      visual.ring.quaternion.copy(this.camera!.quaternion)

      if (visual.label) {
        const labelAnchor = visual.group.position.clone().add(new Vector3(0, 0.6, 0))
        const projected = labelAnchor.project(this.camera!)
        if (projected.z < 0 || occluded) {
          visual.label.style.opacity = "0"
        } else {
          const x = ((projected.x + 1) / 2) * this.overlayBounds.width
          const y = ((-projected.y + 1) / 2) * this.overlayBounds.height
          visual.label.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
          const labelOpacity = MathUtils.lerp(0.25, 0.95, visual.focus)
          visual.label.style.opacity = labelOpacity.toFixed(2)
        }
      }
    })
  }

  private beginSceneTransition(duration = 700) {
    this.sceneFade = { start: performance.now(), duration }
    if (this.sceneTransitionOverlay) {
      this.sceneTransitionOverlay.style.opacity = "0"
    }
  }

  private updateSceneFade() {
    if (!this.sceneTransitionOverlay) {
      return
    }

    if (!this.sceneFade) {
      this.sceneTransitionOverlay.style.opacity = "0"
      return
    }

    const elapsed = performance.now() - this.sceneFade.start
    const duration = this.sceneFade.duration
    if (elapsed >= duration) {
      this.sceneTransitionOverlay.style.opacity = "0"
      this.sceneFade = null
      return
    }

    const progress = MathUtils.clamp(elapsed / duration, 0, 1)
    const fadeOutPortion = Math.min(300 / duration, 1)
    let intensity: number
    if (progress <= fadeOutPortion) {
      intensity = MathUtils.lerp(0, 1, progress / Math.max(fadeOutPortion, 0.0001))
    } else {
      const fadeInProgress = (progress - fadeOutPortion) / Math.max(1 - fadeOutPortion, 0.0001)
      intensity = MathUtils.lerp(1, 0, fadeInProgress)
    }

    this.sceneTransitionOverlay.style.opacity = (0.55 * intensity).toFixed(3)
  }

  private updateOverlayHotspots() {
    this.overlay.style.pointerEvents = "none"
    this.overlay.style.position = "absolute"
    this.overlay.style.left = "0"
    this.overlay.style.top = "0"
    this.overlay.style.width = "100%"
    this.overlay.style.height = "100%"
    if (!this.sceneTransitionOverlay) {
      const overlay = document.createElement("div")
      overlay.className = "pointer-events-none absolute inset-0 bg-black"
      overlay.style.opacity = "0"
      overlay.style.transition = "opacity 120ms ease-out"
      overlay.style.zIndex = "1"
      this.overlay.appendChild(overlay)
      this.sceneTransitionOverlay = overlay
    }
  }

  private isOccluded(point: Vector3) {
    if (!this.camera) return false
    this.raycaster.set(this.camera.position, point.clone().sub(this.camera.position).normalize())
    const intersections = this.raycaster.intersectObjects(this.collisionMeshes, true)
    if (!intersections.length) {
      return false
    }
    const distanceToPoint = this.camera.position.distanceTo(point)
    const firstHit = intersections[0]
    return firstHit.distance < distanceToPoint - 0.2
  }

  private render() {
    if (!this.renderer || !this.scene || !this.camera) {
      return
    }
    this.renderer.render(this.scene, this.camera)
  }
}
