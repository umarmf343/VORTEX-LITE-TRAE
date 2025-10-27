"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RefreshCw, ZoomIn, ZoomOut } from "@/lib/icons"
import type { ComponentProps } from "react"

type ButtonVariant = ComponentProps<typeof Button>["variant"]
type ButtonSize = ComponentProps<typeof Button>["size"]

interface ZoomControlsProps {
  zoomDisplay: string
  onZoomIn: () => void
  onZoomOut: () => void
  onReset?: () => void
  disableZoomIn?: boolean
  disableZoomOut?: boolean
  disableReset?: boolean
  className?: string
  buttonVariant?: ButtonVariant
  buttonSize?: ButtonSize
  buttonClassName?: string
  showReset?: boolean
}

export function ZoomControls({
  zoomDisplay,
  onZoomIn,
  onZoomOut,
  onReset,
  disableZoomIn,
  disableZoomOut,
  disableReset,
  className,
  buttonVariant = "outline",
  buttonSize = "icon-sm",
  buttonClassName,
  showReset = true,
}: ZoomControlsProps) {
  const showResetButton = showReset && typeof onReset === "function"

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-gray-800 bg-gray-900/60 px-2 py-1",
        className,
      )}
    >
      <Button
        size={buttonSize}
        variant={buttonVariant}
        onClick={onZoomOut}
        disabled={disableZoomOut}
        aria-label="Zoom out"
        className={cn("bg-transparent", buttonClassName)}
        type="button"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="min-w-[3.5rem] px-2 text-center text-xs font-medium text-gray-200">{zoomDisplay}</span>
      <Button
        size={buttonSize}
        variant={buttonVariant}
        onClick={onZoomIn}
        disabled={disableZoomIn}
        aria-label="Zoom in"
        className={cn("bg-transparent", buttonClassName)}
        type="button"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      {showResetButton ? (
        <Button
          size={buttonSize}
          variant={buttonVariant}
          onClick={onReset}
          disabled={disableReset}
          aria-label="Reset zoom"
          className={cn("bg-transparent", buttonClassName)}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
