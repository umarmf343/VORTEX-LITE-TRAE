import { describe, expect, it, vi, beforeAll, afterEach, beforeEach } from "vitest"
import { fireEvent, render, screen, act } from "@testing-library/react"

import type { SphrSpace } from "@/lib/types"
import { SphrViewer } from "../sphr-viewer"

vi.mock("three", () => {
  class Vector3 {
    x: number
    y: number
    z: number

    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }

    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
      return this
    }

    copy(vector: Vector3) {
      this.x = vector.x
      this.y = vector.y
      this.z = vector.z
      return this
    }

    normalize() {
      const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) || 1
      this.x /= length
      this.y /= length
      this.z /= length
      return this
    }

    project() {
      this.x /= 2
      this.y /= 2
      this.z = 0.5
      return this
    }
  }

  class Scene {
    background: any
    private readonly objects: unknown[] = []
    add(object: unknown) {
      this.objects.push(object)
    }
  }

  class PerspectiveCamera {
    aspect = 1
    position = {
      set: vi.fn(),
    }
    lookAt = vi.fn()
    updateProjectionMatrix = vi.fn()
  }

  class SphereGeometry {
    scale = vi.fn()
    dispose = vi.fn()
  }

  class MeshBasicMaterial {
    map: any = null
    dispose = vi.fn()
  }

  class Mesh {
    constructor(public geometry: SphereGeometry, public material: MeshBasicMaterial) {}
  }

  class TextureLoader {
    crossOrigin?: string
    load = vi.fn((url: string, onLoad: (texture: any) => void) => {
      setTimeout(() => {
        onLoad({
          dispose: vi.fn(),
          colorSpace: "",
          minFilter: 0,
        })
      }, 0)
    })
  }

  class WebGLRenderer {
    domElement = document.createElement("canvas")
    outputColorSpace = ""
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = vi.fn()
    dispose = vi.fn()
  }

  class Color {
    setScalar = vi.fn(() => this)
  }

  return {
    Scene,
    PerspectiveCamera,
    SphereGeometry,
    MeshBasicMaterial,
    Mesh,
    TextureLoader,
    WebGLRenderer,
    Vector3,
    MathUtils: { degToRad: (deg: number) => (deg * Math.PI) / 180 },
    LinearFilter: 1,
    SRGBColorSpace: "srgb",
    BackSide: 1,
    Color,
  }
})

vi.mock("three/examples/jsm/controls/OrbitControls", () => ({
  OrbitControls: class {
    enableDamping = true
    enablePan = false
    enableZoom = true
    rotateSpeed = 0
    maxDistance = 0
    minDistance = 0
    target = {
      copy: vi.fn(),
    }

    constructor(public camera: unknown, public domElement: unknown) {}

    update = vi.fn()
    dispose = vi.fn()
  },
}))

const buildSpace = (): SphrSpace => ({
  initialNodeId: "entry",
  defaultFov: 90,
  description: "Demo SPHR space",
  nodes: [
    {
      id: "entry",
      name: "Entry",
      panoramaUrl: "/panorama/entry",
      initialYaw: 0,
      initialPitch: 0,
      hotspots: [
        {
          id: "entry-to-living",
          title: "Go to Living",
          type: "navigation",
          yaw: 10,
          pitch: -4,
          targetNodeId: "living",
        },
      ],
    },
    {
      id: "living",
      name: "Living",
      panoramaUrl: "/panorama/living",
      initialYaw: 20,
      initialPitch: 0,
      hotspots: [],
    },
  ],
})

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})

let rafSpy: ReturnType<typeof vi.spyOn> | null = null
let cafSpy: ReturnType<typeof vi.spyOn> | null = null

beforeEach(() => {
  let callCount = 0
  rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
    callCount += 1
    if (callCount <= 5) {
      setTimeout(() => callback(0), 0)
    }
    return callCount as unknown as number
  })
  cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
})

afterEach(() => {
  rafSpy?.mockRestore()
  cafSpy?.mockRestore()
  rafSpy = null
  cafSpy = null
})

describe("SphrViewer", () => {
  it("shows cursor indicator when the user moves pointer", async () => {
    const space = buildSpace()
    render(<SphrViewer space={space} />)

    const root = screen.getByTestId("sphr-viewer-root")
    root.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    await act(async () => {
      fireEvent.pointerMove(root, { clientX: 120, clientY: 160 })
      await Promise.resolve()
    })
    expect(screen.getByTestId("cursor-indicator")).toBeInTheDocument()
  })

  it("navigates to the target node when a navigation hotspot is clicked", async () => {
    const space = buildSpace()
    const handleNodeChange = vi.fn()

    render(
      <SphrViewer
        space={space}
        onNodeChange={handleNodeChange}
      />,
    )

    const hotspotButtons = await screen.findAllByRole("button", { name: /go to living/i })
    await act(async () => {
      fireEvent.click(hotspotButtons[0])
      await Promise.resolve()
    })

    const fadeOverlay = screen.getAllByTestId("scene-fade-overlay")[0]
    expect(fadeOverlay.className).toContain("opacity-80")

    const livingHeadings = await screen.findAllByRole("heading", { name: "Living" })
    expect(livingHeadings.length).toBeGreaterThan(0)
  })

  it("renders a helpful fallback when no nodes exist", () => {
    render(<SphrViewer space={{ nodes: [], initialNodeId: "", description: "Empty" }} />)
    expect(
      screen.getByText(/No panorama nodes configured for this property/i),
    ).toBeInTheDocument()
  })
})
