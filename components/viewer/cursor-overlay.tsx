"use client"

import { memo } from "react"

interface CursorOverlayProps {
  x: number
  y: number
  visible: boolean
  active?: boolean
}

export const CursorOverlay = memo(function CursorOverlay({ x, y, visible, active = false }: CursorOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[60] transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
          active ? "border-emerald-400/90 scale-110" : "border-white/40"
        } transition-transform duration-150`}
        style={{ left: `${x}px`, top: `${y}px`, width: "44px", height: "44px" }}
      >
        <span className="absolute inset-0 animate-ping rounded-full border border-white/20" />
      </span>
    </div>
  )
})
