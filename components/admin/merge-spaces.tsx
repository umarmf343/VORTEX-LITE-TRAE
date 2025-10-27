"use client"

import type { Property, PropertyMerge } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Plus, Trash2 } from "@/lib/icons"

interface MergeSpacesProps {
  properties: Property[]
  merges: PropertyMerge[]
  onCreateMerge?: (merge: PropertyMerge) => void
  onDeleteMerge?: (mergeId: string) => void
}

export function MergeSpaces({ properties, merges, onCreateMerge, onDeleteMerge }: MergeSpacesProps) {
  const [mergeName, setMergeName] = useState("")
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [floorOrder, setFloorOrder] = useState<string[]>([])

  const handleAddProperty = (propId: string) => {
    if (!selectedProperties.includes(propId)) {
      setSelectedProperties([...selectedProperties, propId])
      setFloorOrder([...floorOrder, propId])
    }
  }

  const handleRemoveProperty = (propId: string) => {
    setSelectedProperties(selectedProperties.filter((id) => id !== propId))
    setFloorOrder(floorOrder.filter((id) => id !== propId))
  }

  const handleCreateMerge = () => {
    if (mergeName && selectedProperties.length > 1) {
      const newMerge: PropertyMerge = {
        id: `merge-${Date.now()}`,
        name: mergeName,
        properties: selectedProperties,
        floorOrder,
        createdAt: new Date(),
      }
      onCreateMerge?.(newMerge)
      setMergeName("")
      setSelectedProperties([])
      setFloorOrder([])
    }
  }

  const moveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...floorOrder]
      ;[newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
      setFloorOrder(newOrder)
    }
  }

  const moveDown = (index: number) => {
    if (index < floorOrder.length - 1) {
      const newOrder = [...floorOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setFloorOrder(newOrder)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create New Merge */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create Property Merge</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Merge Name (e.g., Downtown Complex)"
            value={mergeName}
            onChange={(e) => setMergeName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Select Properties</label>
            <div className="grid grid-cols-2 gap-2">
              {properties.map((prop) => (
                <Button
                  key={prop.id}
                  variant={selectedProperties.includes(prop.id) ? "default" : "outline"}
                  onClick={() =>
                    selectedProperties.includes(prop.id) ? handleRemoveProperty(prop.id) : handleAddProperty(prop.id)
                  }
                  className="text-xs justify-start"
                >
                  {selectedProperties.includes(prop.id) && <Plus className="w-3 h-3 mr-1" />}
                  {prop.name}
                </Button>
              ))}
            </div>
          </div>

          {selectedProperties.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-2">Floor Order</label>
              <div className="space-y-2">
                {floorOrder.map((propId, index) => {
                  const prop = properties.find((p) => p.id === propId)
                  return (
                    <div key={propId} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                      <span className="text-sm font-medium">
                        Floor {index + 1}: {prop?.name}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => moveUp(index)} disabled={index === 0}>
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveDown(index)}
                          disabled={index === floorOrder.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Button onClick={handleCreateMerge} disabled={selectedProperties.length < 2} className="w-full">
            Create Merge
          </Button>
        </div>
      </Card>

      {/* Existing Merges */}
      {merges.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Existing Merges</h3>
          <div className="space-y-3">
            {merges.map((merge) => (
              <div key={merge.id} className="flex items-center justify-between bg-gray-100 p-3 rounded">
                <div>
                  <p className="font-medium">{merge.name}</p>
                  <p className="text-sm text-gray-600">{merge.properties.length} properties</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => onDeleteMerge?.(merge.id)} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
