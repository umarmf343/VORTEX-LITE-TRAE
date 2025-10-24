"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { TooltipProps as RechartsTooltipProps } from "recharts"
import type {
  NameType as TooltipNameType,
  Payload as RechartsTooltipPayload,
  ValueType as TooltipValueType,
} from "recharts/types/component/DefaultTooltipContent"
import type {
  LegendPayload as RechartsLegendPayload,
  VerticalAlignmentType as LegendVerticalAlign,
} from "recharts/types/component/DefaultLegendContent"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, value]) => value.theme || value.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const DEFAULT_INDICATOR_COLOR = "var(--muted-foreground)"

type DefaultTooltipValue = TooltipValueType
type DefaultTooltipName = TooltipNameType
type TooltipEntry = RechartsTooltipPayload<DefaultTooltipValue, DefaultTooltipName>
type LegendEntry = RechartsLegendPayload
type ChartTooltipProps = RechartsTooltipProps<DefaultTooltipValue, DefaultTooltipName>
type ChartFormatter = ChartTooltipProps["formatter"]
type ChartLabelFormatter = ChartTooltipProps["labelFormatter"]

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: ChartTooltipProps["active"]
  payload?: ReadonlyArray<TooltipEntry>
  indicator?: "line" | "dot" | "dashed"
  hideLabel?: boolean
  hideIndicator?: boolean
  label?: React.ReactNode
  labelFormatter?: ChartLabelFormatter
  labelClassName?: string
  formatter?: ChartFormatter
  color?: string
  nameKey?: string
  labelKey?: string
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  ...rest
}: ChartTooltipContentProps) {
  const { config } = useChart()
  const payloadEntries = payload ?? []

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || payloadEntries.length === 0) {
      return null
    }

    const [firstEntry] = payloadEntries
    if (!firstEntry) {
      return null
    }

    const key = `${labelKey || firstEntry.dataKey || firstEntry.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, firstEntry, key)
    const computedLabel =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label ?? label
        : itemConfig?.label ?? label

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(computedLabel, payloadEntries)}
        </div>
      )
    }

    if (!computedLabel) {
      return null
    }

    return (
      <div className={cn("font-medium", labelClassName)}>{normalizeLabel(computedLabel)}</div>
    )
  }, [config, hideLabel, label, labelClassName, labelFormatter, labelKey, payloadEntries])

  if (!active || payloadEntries.length === 0) {
    return null
  }

  const nestLabel = payloadEntries.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
      {...rest}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payloadEntries.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || index}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = getIndicatorColor(item, color)

          let customContent: React.ReactNode | undefined
          let overrideLabel: DefaultTooltipName | undefined
          let overrideValue: React.ReactNode | undefined

          if (formatter && item.value !== undefined && item.name !== undefined) {
            const result = formatter(item.value, item.name, item, index, payloadEntries)
            if (Array.isArray(result)) {
              overrideValue = result[0]
              overrideLabel = result[1]
            } else if (typeof result !== "undefined") {
              customContent = result
            }
          }

          const resolvedLabel = normalizeLabel(
            overrideLabel ?? itemConfig?.label ?? item.name ?? item.dataKey ?? key,
          )
          const resolvedValue =
            overrideValue ?? formatTooltipValue(item.value)

          return (
            <div
              key={key}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center",
              )}
            >
              {typeof customContent !== "undefined" ? (
                customContent
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          },
                        )}
                        style={{
                          "--color-bg": indicatorColor ?? DEFAULT_INDICATOR_COLOR,
                          "--color-border": indicatorColor ?? DEFAULT_INDICATOR_COLOR,
                        } as React.CSSProperties}
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {resolvedLabel}
                      </span>
                    </div>
                    {resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== "" ? (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {resolvedValue}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

interface ChartLegendContentProps extends React.HTMLAttributes<HTMLDivElement> {
  hideIcon?: boolean
  payload?: ReadonlyArray<LegendEntry>
  verticalAlign?: LegendVerticalAlign
  nameKey?: string
}

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
  ...rest
}: ChartLegendContentProps) {
  const { config } = useChart()

  if (!payload || payload.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
      {...rest}
    >
      {payload.map((item, index) => {
        const key = `${nameKey || item.dataKey || item.value || index}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const legendColor = item.color ?? getLegendFill(item)
        const label = itemConfig?.label ?? item.value ?? key

        return (
          <div
            key={key}
            className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: legendColor ?? DEFAULT_INDICATOR_COLOR,
                }}
              />
            )}
            {label}
          </div>
        )
      })}
    </div>
  )
}

function getIndicatorColor(entry: TooltipEntry, override?: string) {
  if (override) {
    return override
  }

  if (typeof entry.color === "string") {
    return entry.color
  }

  if (entry.payload && typeof entry.payload === "object") {
    const candidate = (entry.payload as { fill?: unknown }).fill
    if (typeof candidate === "string") {
      return candidate
    }
  }

  return undefined
}

function getLegendFill(entry: LegendEntry) {
  if (typeof entry.color === "string") {
    return entry.color
  }

  if (entry.payload && typeof entry.payload === "object") {
    const candidate = (entry.payload as { value?: { fill?: string } }).value?.fill
    if (typeof candidate === "string") {
      return candidate
    }
  }

  return undefined
}

function normalizeLabel(value: unknown): React.ReactNode {
  if (typeof value === "function") {
    return value.name || "(anonymous)"
  }

  return value as React.ReactNode
}

function formatTooltipValue(value: TooltipEntry["value"]) {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  if (typeof value === "number") {
    return value.toLocaleString()
  }

  return value ?? ""
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: TooltipEntry | LegendEntry | undefined,
  key: string,
) {
  if (!payload || typeof payload !== "object") {
    return undefined
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
