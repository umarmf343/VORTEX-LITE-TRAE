"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cable as Cube, Plus, Trash2, Eye } from "lucide-react"

interface Model3D {
  id: string
  name: string
  url: string
  format: "gltf" | "glb" | "obj"
  sceneId?: string
  scale: number
}

interface Models3DProps {
  propertyId: string
  models?: Model3D[]
  onAddModel?: (model: Model3D) => void
  onRemoveModel?: (modelId: string) => void
}

export function Models3D({ propertyId, models = [], onAddModel, onRemoveModel }: Models3DProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", url: "", format: "glb" as const, scale: 1 })
  const [selectedModel, setSelectedModel] = useState<Model3D | null>(null)

  const handleAddModel = () => {
    if (formData.name && formData.url) {
      const newModel: Model3D = {
        id: `model-${Date.now()}`,
        ...formData,
      }
      onAddModel?.(newModel)
      setFormData({ name: "", url: "", format: "glb", scale: 1 })
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Cube className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-lg">3D Models</h3>
              <p className="text-sm text-gray-600">Add 3D models to your property scenes</p>
            </div>
          </div>
        </div>

        <Button onClick={() => setShowForm(!showForm)} className="w-full gap-2 mb-4">
          <Plus className="w-4 h-4" />
          Add 3D Model
        </Button>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <input
              type="text"
              placeholder="Model Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              placeholder="Model URL (GLTF/GLB/OBJ)"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <select
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="glb">GLB (Binary)</option>
              <option value="gltf">GLTF (JSON)</option>
              <option value="obj">OBJ</option>
            </select>
            <input
              type="number"
              placeholder="Scale"
              value={formData.scale}
              onChange={(e) => setFormData({ ...formData, scale: Number.parseFloat(e.target.value) })}
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddModel} className="flex-1">
                Add Model
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {models.length === 0 ? (
            <p className="text-gray-500 text-sm">No 3D models added yet</p>
          ) : (
            models.map((model) => (
              <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{model.name}</p>
                  <p className="text-sm text-gray-600">
                    {model.format.toUpperCase()} • Scale: {model.scale}x
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 bg-transparent"
                    onClick={() => setSelectedModel(model)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRemoveModel?.(model.id)}
                    className="gap-1 text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {selectedModel && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Preview: {selectedModel.name}</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedModel(null)}>
              Close
            </Button>
          </div>
          <div className="bg-gray-900 rounded h-96 flex items-center justify-center">
            <p className="text-gray-400">3D Model Viewer - {selectedModel.format.toUpperCase()}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
