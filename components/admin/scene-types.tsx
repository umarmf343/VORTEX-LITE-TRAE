"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Plus, Trash2 } from "lucide-react"
import type { SceneTypeConfig } from "@/lib/types"

interface SceneTypesProps {
  propertyId: string
  scenes?: SceneTypeConfig[]
  onAddSceneType?: (scene: SceneTypeConfig) => void
  onRemoveSceneType?: (sceneId: string) => void
}

const sceneTypeOptions: ReadonlyArray<SceneTypeConfig["type"]> = [
  "equirectangular",
  "sphere",
  "cube",
  "cylinder",
]

const isSceneType = (value: string): value is SceneTypeConfig["type"] =>
  (sceneTypeOptions as readonly string[]).includes(value)

export function SceneTypes({ propertyId, scenes = [], onAddSceneType, onRemoveSceneType }: SceneTypesProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    sceneId: "",
    type: "equirectangular" as SceneTypeConfig["type"],
    imageUrl: "",
    description: "",
  })

  const handleAddSceneType = () => {
    if (formData.sceneId && formData.imageUrl) {
      const newScene: SceneTypeConfig = {
        id: `scene-type-${Date.now()}`,
        propertyId,
        ...formData,
      }
      onAddSceneType?.(newScene)
      setFormData({ sceneId: "", type: "equirectangular", imageUrl: "", description: "" })
      setShowForm(false)
    }
  }

  const sceneTypeDescriptions = {
    cube: "6-sided cube map - Best for indoor spaces",
    sphere: "360° spherical panorama - Most common format",
    cylinder: "Cylindrical projection - Good for wide spaces",
    equirectangular: "Equirectangular projection - Standard 360° format",
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-lg">Scene Types</h3>
              <p className="text-sm text-gray-600">Configure 360° panorama formats for each scene</p>
            </div>
          </div>
        </div>

        <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2 mb-4">
          <Plus className="w-4 h-4" />
          Add Scene Type
        </Button>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <input
              type="text"
              placeholder="Scene ID"
              value={formData.sceneId}
              onChange={(e) => setFormData({ ...formData, sceneId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <select
              value={formData.type}
              onChange={(e) => {
                if (isSceneType(e.target.value)) {
                  setFormData({ ...formData, type: e.target.value })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="equirectangular">Equirectangular (Standard)</option>
              <option value="sphere">Sphere (360°)</option>
              <option value="cube">Cube Map</option>
              <option value="cylinder">Cylinder</option>
            </select>
            <input
              type="text"
              placeholder="Panorama Image URL"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded h-20"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddSceneType} className="flex-1">
                Add Scene Type
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {scenes.length === 0 ? (
            <p className="text-gray-500 text-sm">No scene types configured yet</p>
          ) : (
            scenes.map((scene) => (
              <div key={scene.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{scene.sceneId}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {scene.type} - {sceneTypeDescriptions[scene.type]}
                  </p>
                  {scene.description && <p className="text-sm text-gray-500 mt-1">{scene.description}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveSceneType?.(scene.id)}
                  className="gap-1 text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold mb-3">Scene Type Guide</h4>
        <div className="space-y-2 text-sm">
          {Object.entries(sceneTypeDescriptions).map(([type, desc]) => (
            <div key={type} className="flex gap-2">
              <span className="font-medium capitalize text-blue-900 min-w-24">{type}:</span>
              <span className="text-blue-800">{desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
