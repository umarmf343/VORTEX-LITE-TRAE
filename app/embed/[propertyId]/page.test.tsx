import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/dynamic", () => ({
  default: () => (props: Record<string, unknown>) => <div data-testid="tour-player" {...props} />,
}))

const toastMock = vi.fn()

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

type MockDataContext = {
  properties: any[]
  isLoading: boolean
  addLead: ReturnType<typeof vi.fn>
  getFloorPlan: ReturnType<typeof vi.fn>
  [key: string]: unknown
}

const makeDataHook = (overrides: Partial<MockDataContext> = {}): MockDataContext => ({
  properties: [],
  isLoading: false,
  addLead: vi.fn(),
  getFloorPlan: vi.fn(),
  ...overrides,
})

const useDataMock = vi.fn(() => makeDataHook())

vi.mock("@/lib/data-context", () => ({
  useData: useDataMock,
}))

describe("EmbedPage", () => {
  beforeEach(() => {
    toastMock.mockClear()
    useDataMock.mockReset()
    useDataMock.mockImplementation(() => makeDataHook())
  })

  it("shows loading state when context is loading", async () => {
    const { default: EmbedPage } = await import("@/app/embed/[propertyId]/page")
    useDataMock.mockReturnValueOnce(makeDataHook({ isLoading: true }))

    render(<EmbedPage params={{ propertyId: "prop-1" }} />)
    expect(screen.getByText(/Preparing your tour experience/i)).toBeInTheDocument()
  })

  it("renders tour details when property is found", async () => {
    const { default: EmbedPage } = await import("@/app/embed/[propertyId]/page")
    useDataMock.mockReturnValueOnce(
      makeDataHook({
        properties: [
          {
            id: "prop-abc",
            name: "Showcase Residence",
            address: "500 Showcase Blvd",
          },
        ] as unknown as any[],
        getFloorPlan: vi.fn(() => undefined),
      }),
    )

    render(<EmbedPage params={{ propertyId: encodeURIComponent("prop-abc") }} />)

    expect(screen.getByText("Showcase Residence")).toBeInTheDocument()
    expect(screen.getByText("500 Showcase Blvd")).toBeInTheDocument()
  })

  it("renders not found message when property is missing", async () => {
    const { default: EmbedPage } = await import("@/app/embed/[propertyId]/page")
    useDataMock.mockReturnValueOnce(makeDataHook({ properties: [] }))

    render(<EmbedPage params={{ propertyId: "missing" }} />)
    expect(screen.getByText(/Tour not found/i)).toBeInTheDocument()
  })
})
