"use client"

import type { Property } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useEffect, useState } from "react"

interface PropertyComparisonProps {
  properties: Property[]
  onClose?: () => void
}

export function PropertyComparison({ properties, onClose }: PropertyComparisonProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>(properties.slice(0, 2).map((p) => p.id))

  useEffect(() => {
    setSelectedProperties((prev) => {
      if (properties.length === 0) {
        return []
      }

      const availableIds = properties.map((property) => property.id)
      const retained = prev.filter((id) => availableIds.includes(id))
      const minimumSelection = Math.min(availableIds.length, Math.max(2, retained.length))
      const isSameSelection =
        retained.length === prev.length && retained.every((id, index) => id === prev[index])

      if (retained.length >= minimumSelection) {
        return isSameSelection ? prev : retained
      }

      const additions = availableIds
        .filter((id) => !retained.includes(id))
        .slice(0, minimumSelection - retained.length)

      return [...retained, ...additions]
    })
  }, [properties])

  const comparisonProperties = properties.filter((p) => selectedProperties.includes(p.id))

  const features = [
    { label: "Price", key: "price" },
    { label: "Bedrooms", key: "bedrooms" },
    { label: "Bathrooms", key: "bathrooms" },
    { label: "Square Feet", key: "sqft" },
    { label: "Virtual Tour", key: "scenes" },
    { label: "Floor Plan", key: "floorPlanId" },
    { label: "Day/Night Mode", key: "dayNightImages" },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Properties to Compare</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {properties.map((prop) => (
            <Button
              key={prop.id}
              variant={selectedProperties.includes(prop.id) ? "default" : "outline"}
              onClick={() => {
                if (selectedProperties.includes(prop.id)) {
                  setSelectedProperties(selectedProperties.filter((id) => id !== prop.id))
                } else if (selectedProperties.length < 4) {
                  setSelectedProperties([...selectedProperties, prop.id])
                }
              }}
              className="text-xs"
            >
              {prop.name.split(" ")[0]}
            </Button>
          ))}
        </div>
      </Card>

      {comparisonProperties.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left font-semibold">Feature</th>
                {comparisonProperties.map((prop) => (
                  <th key={prop.id} className="border border-gray-300 p-3 text-center font-semibold">
                    <div className="text-sm">{prop.name}</div>
                    <div className="text-xs text-gray-600">${(prop.price / 1000000).toFixed(1)}M</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.key} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3 font-medium">{feature.label}</td>
                  {comparisonProperties.map((prop) => (
                    <td key={prop.id} className="border border-gray-300 p-3 text-center">
                      {feature.key === "price" && `$${(prop.price / 1000000).toFixed(1)}M`}
                      {feature.key === "bedrooms" && prop.bedrooms}
                      {feature.key === "bathrooms" && prop.bathrooms}
                      {feature.key === "sqft" && prop.sqft.toLocaleString()}
                      {feature.key === "scenes" && (
                        <div className="flex items-center justify-center gap-1">
                          <Check className="w-4 h-4 text-green-600" />
                          {prop.scenes.length} scenes
                        </div>
                      )}
                      {feature.key === "floorPlanId" && (
                        <div className="flex items-center justify-center">
                          {prop.floorPlanId ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                      {feature.key === "dayNightImages" && (
                        <div className="flex items-center justify-center">
                          {prop.dayNightImages ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onClose && (
        <Button variant="outline" onClick={onClose}>
          Close Comparison
        </Button>
      )}
    </div>
  )
}
