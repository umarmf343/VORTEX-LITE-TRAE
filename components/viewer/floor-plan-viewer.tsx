"use client"
import { useState } from "react"
import type { FloorPlan, Room } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ZoomIn, ZoomOut, Download } from "lucide-react"

interface FloorPlanViewerProps {
  floorPlan: FloorPlan
  onRoomClick?: (room: Room) => void
  branding: any
}

export function FloorPlanViewer({ floorPlan, onRoomClick, branding }: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room)
    onRoomClick?.(room)
  }

  const generateRoomLabels = () => {
    return floorPlan.rooms.map((room) => ({
      ...room,
      dimensions: room.dimensions || `${Math.round(room.width / 10)}ft x ${Math.round(room.height / 10)}ft`,
      area: Math.round((room.width * room.height) / 100),
    }))
  }

  const roomsWithLabels = generateRoomLabels()

  const handleExportFloorPlan = () => {
    const data = {
      name: floorPlan.name,
      rooms: roomsWithLabels,
      totalArea: roomsWithLabels.reduce((sum, r) => sum + r.area, 0),
      exportedAt: new Date().toISOString(),
    }
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${floorPlan.name}-floor-plan.json`
    link.click()
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Floor Plan Canvas */}
      <div className="flex-1 overflow-auto relative bg-white">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            transition: "transform 0.2s",
          }}
        >
          <img src={floorPlan.imageUrl || "/placeholder.svg"} alt={floorPlan.name} className="w-full h-auto" />
          {/* Room Overlays */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {roomsWithLabels.map((room) => (
              <g key={room.id}>
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill={room.color}
                  opacity="0.2"
                  stroke={room.color}
                  strokeWidth="2"
                  className="pointer-events-auto cursor-pointer hover:opacity-40 transition-opacity"
                  onClick={() => handleRoomClick(room)}
                />
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 - 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-semibold pointer-events-none"
                  fill={room.color}
                >
                  {room.name}
                </text>
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs pointer-events-none"
                  fill={room.color}
                >
                  {room.area} sqft
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-t border-gray-200 p-4 flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} className="gap-2">
            <ZoomOut className="w-4 h-4" />
            Zoom Out
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(Math.min(2, zoom + 0.2))} className="gap-2">
            <ZoomIn className="w-4 h-4" />
            Zoom In
          </Button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={handleExportFloorPlan} className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
        {selectedRoom && (
          <Card className="p-2 bg-gray-50">
            <div className="text-sm">
              <p className="font-semibold">{selectedRoom.name}</p>
              <p className="text-gray-600">{selectedRoom.dimensions}</p>
              <p className="text-gray-600">{Math.round((selectedRoom.width * selectedRoom.height) / 100)} sqft</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
