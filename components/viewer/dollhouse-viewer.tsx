"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { DollhouseFloorMetadata, DollhouseModel, DollhouseRoomMetadata } from "@/lib/types"
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

interface DollhouseViewerProps {
  model: DollhouseModel
  activeSceneId?: string
  onRoomSelect?: (room: DollhouseRoomMetadata, floor: DollhouseFloorMetadata) => void
}

const DEFAULT_ROOM_COLOR = new Color("#1f2937")
const HOVER_EMISSIVE = new Color("#60a5fa")

export function DollhouseViewer({ model, activeSceneId, onRoomSelect }: DollhouseViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rootGroupRef = useRef<Group | null>(null)
  const floorGroupsRef = useRef<Map<number, Group>>(new Map())
  const roomMeshesRef = useRef<Map<string, Mesh<BoxGeometry, MeshStandardMaterial>>>(new Map())
  const disposablesRef = useRef<Array<{ geometry: BoxGeometry; material: MeshStandardMaterial }>>([])
  const pointerRef = useRef(new Vector2())
  const raycasterRef = useRef(new Raycaster())
  const hoveredMeshRef = useRef<Mesh<BoxGeometry, MeshStandardMaterial> | null>(null)
  const [activeFloor, setActiveFloor] = useState<number | null>(null)
  const [autoRotatePreview, setAutoRotatePreview] = useState(() => model.autoRotatePreview ?? true)
  const [hoveredRoom, setHoveredRoom] = useState<DollhouseRoomMetadata | null>(null)

  const sortedFloors = useMemo(() => [...model.floors].sort((a, b) => a.floor - b.floor), [model.floors])

  useEffect(() => {
    setAutoRotatePreview(model.autoRotatePreview ?? true)
  }, [model.dollhouseId, model.autoRotatePreview])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.domElement.classList.add("h-full", "w-full")
    rendererRef.current = renderer

    const scene = new Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = true
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI / 2
    controlsRef.current = controls

    const ambient = new AmbientLight(0xffffff, 0.8)
    scene.add(ambient)
    const directional = new DirectionalLight(0xffffff, 0.8)
    directional.position.set(30, 50, 30)
    scene.add(directional)

    container.appendChild(renderer.domElement)

    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      rendererRef.current.setSize(clientWidth, clientHeight)
      cameraRef.current.aspect = clientWidth / clientHeight
      cameraRef.current.updateProjectionMatrix()
    }

    const renderLoop = () => {
      controlsRef.current?.update()
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }

    renderer.setAnimationLoop(renderLoop)
    window.addEventListener("resize", handleResize)

    const handlePointerMove = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current) return
      const rect = rendererRef.current.domElement.getBoundingClientRect()
      pointerRef.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(pointerRef.current, cameraRef.current)
      const meshes = Array.from(roomMeshesRef.current.values())
      const intersections = raycaster.intersectObjects(meshes, false)
      if (intersections.length === 0) {
        if (hoveredMeshRef.current) {
          hoveredMeshRef.current.material.emissive.setHex(0x000000)
          hoveredMeshRef.current.material.opacity = hoveredMeshRef.current.userData.opacity ?? 0.9
        }
        hoveredMeshRef.current = null
        setHoveredRoom(null)
        return
      }
      const intersection = intersections[0].object as Mesh<BoxGeometry, MeshStandardMaterial>
      if (hoveredMeshRef.current !== intersection) {
        if (hoveredMeshRef.current) {
          hoveredMeshRef.current.material.emissive.setHex(0x000000)
          hoveredMeshRef.current.material.opacity = hoveredMeshRef.current.userData.opacity ?? 0.9
        }
        hoveredMeshRef.current = intersection
        intersection.material.emissive.copy(HOVER_EMISSIVE)
        intersection.material.opacity = 1
      }
      const room = intersection.userData.room as DollhouseRoomMetadata | undefined
      if (room) {
        setHoveredRoom(room)
      }
    }

    const handlePointerLeave = () => {
      if (hoveredMeshRef.current) {
        hoveredMeshRef.current.material.emissive.setHex(0x000000)
        hoveredMeshRef.current.material.opacity = hoveredMeshRef.current.userData.opacity ?? 0.9
      }
      hoveredMeshRef.current = null
      setHoveredRoom(null)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current) return
      const rect = rendererRef.current.domElement.getBoundingClientRect()
      pointerRef.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(pointerRef.current, cameraRef.current)
      const intersections = raycaster.intersectObjects(Array.from(roomMeshesRef.current.values()), false)
      if (intersections.length === 0) return
      const mesh = intersections[0].object as Mesh<BoxGeometry, MeshStandardMaterial>
      const room = mesh.userData.room as DollhouseRoomMetadata | undefined
      const floorMeta = mesh.userData.floor as DollhouseFloorMetadata | undefined
      if (room && floorMeta) {
        onRoomSelect?.(room, floorMeta)
      }
    }

    renderer.domElement.addEventListener("pointermove", handlePointerMove)
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave)
    renderer.domElement.addEventListener("click", handlePointerDown)

    return () => {
      window.removeEventListener("resize", handleResize)
      renderer.domElement.removeEventListener("pointermove", handlePointerMove)
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave)
      renderer.domElement.removeEventListener("click", handlePointerDown)
      renderer.setAnimationLoop(null)
      renderer.dispose()
      controls.dispose()
      container.removeChild(renderer.domElement)
      rendererRef.current = null
      controlsRef.current = null
      sceneRef.current = null
      cameraRef.current = null
    }
  }, [onRoomSelect])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !controlsRef.current || !cameraRef.current) return

    if (rootGroupRef.current) {
      scene.remove(rootGroupRef.current)
      rootGroupRef.current.children.forEach((child) => {
        child.traverse((object) => {
          if (object instanceof Mesh) {
            object.geometry.dispose()
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
      })
    }

    disposablesRef.current.forEach(({ geometry, material }) => {
      geometry.dispose()
      material.dispose()
    })
    disposablesRef.current = []

    roomMeshesRef.current.clear()
    floorGroupsRef.current.clear()

    const root = new Group()
    rootGroupRef.current = root

    const floorGap = model.floorGap ?? 2

    for (const floor of sortedFloors) {
      const floorGroup = new Group()
      floorGroup.name = `floor-${floor.floor}`
      const baseElevation = floor.baseElevation ?? (floor.floor - 1) * (floor.height + floorGap)
      floorGroup.position.y = baseElevation

      for (const room of floor.rooms) {
        const geometry = new BoxGeometry(room.width, room.height, room.depth)
        const baseColor = room.color ? new Color(room.color) : DEFAULT_ROOM_COLOR.clone()
        const material = new MeshStandardMaterial({
          color: baseColor,
          metalness: 0.1,
          roughness: 0.6,
          transparent: true,
          opacity: room.opacity ?? 0.9,
        })
        const mesh = new Mesh(geometry, material)
        mesh.position.set(room.position.x, room.position.y + room.height / 2, room.position.z)
        mesh.castShadow = false
        mesh.receiveShadow = true
        mesh.userData = { room, floor, opacity: room.opacity ?? 0.9 }
        floorGroup.add(mesh)
        roomMeshesRef.current.set(room.id, mesh)
        disposablesRef.current.push({ geometry, material })
      }

      floorGroupsRef.current.set(floor.floor, floorGroup)
      root.add(floorGroup)
    }

    scene.add(root)

    const boundingBox = new Box3().setFromObject(root)
    const center = new Vector3()
    boundingBox.getCenter(center)
    const size = new Vector3()
    boundingBox.getSize(size)
    const maxDimension = Math.max(size.x, size.y, size.z)

    controlsRef.current.target.copy(center)
    const distance = maxDimension * 1.4
    cameraRef.current.position.set(center.x + distance, center.y + distance, center.z + distance)
    cameraRef.current.near = 0.1
    cameraRef.current.far = Math.max(2000, distance * 10)
    cameraRef.current.updateProjectionMatrix()
    controlsRef.current.maxDistance = distance * 3
    controlsRef.current.minDistance = Math.max(6, maxDimension * 0.4)
    controlsRef.current.update()

  }, [model, sortedFloors])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    if (autoRotatePreview) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.5
      const timeout = window.setTimeout(() => {
        controls.autoRotate = false
        setAutoRotatePreview(false)
      }, 6000)
      return () => window.clearTimeout(timeout)
    }
    controls.autoRotate = false
  }, [autoRotatePreview])

  useEffect(() => {
    if (!floorGroupsRef.current) return
    floorGroupsRef.current.forEach((group, floor) => {
      const visible = activeFloor === null || floor === activeFloor
      group.visible = visible
      group.children.forEach((child) => {
        if (child instanceof Mesh) {
          const material = child.material as MeshStandardMaterial
          if (visible) {
            material.opacity = child.userData.opacity ?? 0.9
          } else {
            material.opacity = 0.1
          }
        }
      })
    })
  }, [activeFloor])

  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !controlsRef.current) return
    if (!activeSceneId) return

    const roomEntry = Array.from(roomMeshesRef.current.entries()).find(([, mesh]) => {
      const room = mesh.userData.room as DollhouseRoomMetadata | undefined
      return room?.sceneId === activeSceneId
    })
    if (!roomEntry) return
    const [_, mesh] = roomEntry
    const target = new Vector3()
    mesh.getWorldPosition(target)
    controlsRef.current.target.lerp(target, 0.6)
  }, [activeSceneId])

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div ref={containerRef} className="absolute inset-0" aria-label="Dollhouse 3D view" />

      <div className="pointer-events-none absolute inset-x-0 top-6 flex items-center justify-center">
        <div className="rounded-full bg-black/70 px-4 py-2 text-xs font-medium uppercase tracking-wide text-blue-200 shadow-lg">
          Dollhouse Overview
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 text-[11px] text-gray-200 sm:flex-row">
        <span className="rounded-full bg-black/70 px-3 py-1 shadow-lg">Scroll to zoom</span>
        <span className="rounded-full bg-black/70 px-3 py-1 shadow-lg">Drag to rotate</span>
        <span className="rounded-full bg-black/70 px-3 py-1 shadow-lg">Click a room to enter</span>
      </div>

      {hoveredRoom ? (
        <div className="pointer-events-none absolute left-6 top-6 rounded-lg border border-blue-500/40 bg-black/70 px-4 py-3 text-sm text-blue-100 shadow-lg">
          <div className="text-xs uppercase tracking-wide text-blue-300">{hoveredRoom.name}</div>
          {hoveredRoom.tags?.length ? (
            <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-300">
              {hoveredRoom.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-800/80 px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="absolute right-6 top-6 flex flex-col gap-2">
        <div className="rounded-lg border border-gray-800 bg-black/70 p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Floors</div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeFloor === null ? "default" : "outline"}
              onClick={() => setActiveFloor(null)}
              className="pointer-events-auto px-3"
            >
              All
            </Button>
            {sortedFloors.map((floor) => (
              <Button
                key={floor.floor}
                size="sm"
                variant={activeFloor === floor.floor ? "default" : "outline"}
                onClick={() => setActiveFloor(floor.floor)}
                className="pointer-events-auto px-3"
              >
                {floor.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const controls = controlsRef.current
            if (!controls || !cameraRef.current || !rootGroupRef.current) return
            const boundingBox = new Box3().setFromObject(rootGroupRef.current)
            const center = new Vector3()
            boundingBox.getCenter(center)
            controls.target.copy(center)
            const size = new Vector3()
            boundingBox.getSize(size)
            const distance = Math.max(size.x, size.y, size.z) * 1.4
            cameraRef.current.position.set(center.x + distance, center.y + distance, center.z + distance)
            controls.update()
            setAutoRotatePreview(false)
            window.setTimeout(() => setAutoRotatePreview(true), 0)
          }}
          className="pointer-events-auto"
        >
          Reset View
        </Button>
      </div>
    </div>
  )
}
