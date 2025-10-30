import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  LightProbe,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Sphere,
  Spherical,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
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
}

interface AutoTourState {
  route: WalkthroughNode[]
  index: number
  pauseUntil: number
  dwell: number
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
  private hotspotElements = new Map<string, HTMLButtonElement>()
  private collisionMeshes: Mesh[] = []
  private transition: TransitionState | null = null
  private activeNode: WalkthroughNode | null = null
  private keysPressed: Record<string, boolean> = {}
  private autoTour: AutoTourState | null = null
  private movementSpeed = 1.75
  private orbit = { yaw: 0, pitch: 0 }
  private pointerDown: Vector2 | null = null
  private eyeHeight: number
  private bounds: Box3 | null = null
  private overlayBounds: DOMRect | null = null
  private raycaster = new Raycaster()
  private hdrTexture: Texture | null = null

  constructor(options: ImmersiveWalkthroughEngineOptions) {
    this.container = options.container
    this.overlay = options.overlay
    this.space = options.space
    this.onEvent = options.onEvent
    this.eyeHeight = options.space.eyeHeight ?? 1.7

    this.container.addEventListener("pointerdown", this.handlePointerDown)
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

    this.populateNavigation()
    this.populateHotspots()
    this.updateOverlayHotspots()

    this.onEvent?.({ type: "ready" })

    this.start()
  }

  dispose() {
    this.stop()

    this.container.removeEventListener("pointerdown", this.handlePointerDown)
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
    this.hotspotElements.forEach((element) => element.remove())
    this.hotspotElements.clear()
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

  navigateToNode(nodeId: string, options?: { immediate?: boolean }) {
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
    this.transition = {
      from,
      to,
      start: performance.now(),
      duration: node.transitionDurationMs ?? DEFAULT_TRANSITION_MS,
      easing: easeInOutCubic,
      targetYaw: node.orientation?.yaw,
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

    await new Promise<void>((resolve, reject) => {
      new RGBELoader().load(
        this.space.hdrEnvironmentUrl!,
        (texture) => {
          this.hdrTexture = texture
          const envMap = pmrem.fromEquirectangular(texture).texture
          envMap.mapping = EquirectangularReflectionMapping
          this.scene!.environment = envMap
          this.scene!.background = null
          const probe = LightProbeGenerator.fromCubeTexture(envMap)
          this.scene!.add(probe as LightProbe)
          resolve()
        },
        undefined,
        (error) => reject(error),
      )
    })
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

  private populateHotspots() {
    this.hotspots = [...(this.space.hotspots ?? [])]
    this.hotspotElements.forEach((element) => element.remove())
    this.hotspotElements.clear()

    this.hotspots.forEach((hotspot) => {
      const element = document.createElement("button")
      element.type = "button"
      element.className =
        "absolute min-w-[32px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/80 px-3 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-emerald-500"
      element.style.pointerEvents = "auto"
      element.style.opacity = "0"
      element.tabIndex = 0
      element.innerText = hotspot.title
      element.addEventListener("click", () => this.onHotspotActivate(hotspot))
      this.overlay.appendChild(element)
      this.hotspotElements.set(hotspot.id, element)
    })
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
    this.container.setPointerCapture(event.pointerId)
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
    this.updateHotspots()
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

    if (progress >= 1) {
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

  private updateHotspots() {
    if (!this.camera) return
    this.overlayBounds = this.overlay.getBoundingClientRect()

    this.hotspots.forEach((hotspot) => {
      const element = this.hotspotElements.get(hotspot.id)
      if (!element) return

      const position = new Vector3(hotspot.position[0], hotspot.position[1], hotspot.position[2])
      const occluded = this.isOccluded(position)
      if (occluded) {
        element.style.opacity = "0"
        return
      }

      const screen = position.clone()
      screen.project(this.camera!)
      if (screen.z < 0) {
        element.style.opacity = "0"
        return
      }

      const x = ((screen.x + 1) / 2) * this.overlayBounds.width
      const y = ((-screen.y + 1) / 2) * this.overlayBounds.height
      element.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
      element.style.opacity = "1"
    })
  }

  private updateOverlayHotspots() {
    this.overlay.style.pointerEvents = "none"
    this.overlay.style.position = "absolute"
    this.overlay.style.left = "0"
    this.overlay.style.top = "0"
    this.overlay.style.width = "100%"
    this.overlay.style.height = "100%"
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
