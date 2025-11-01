"use client"
import type { Property } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Edit, Trash2, BarChart3 } from "@/lib/icons"
import { cn, formatCurrency } from "@/lib/utils"

interface PropertyListProps {
  properties: Property[]
  onView?: (property: Property) => void
  onEdit?: (property: Property) => void
  onDelete?: (propertyId: string) => void
  onStats?: (property: Property) => void
}

export function PropertyList({ properties, onView, onEdit, onDelete, onStats }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <Card className="p-8 text-center border border-dashed border-gray-300 bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">No properties yet</h3>
        <p className="text-gray-600 text-sm">
          Add a property to start managing tours, analytics, and sharing tools from the dashboard.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {properties.map((property) => (
        <Card key={property.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex flex-col gap-4 md:flex-row">
            <img
              src={property.thumbnail || "/placeholder.svg"}
              alt={property.name}
              className="w-32 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{property.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{property.address}</p>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 uppercase tracking-wide",
                    property.privacy === "private"
                      ? "border-amber-500/60 bg-amber-100 text-amber-700"
                      : "border-emerald-500/60 bg-emerald-100 text-emerald-700",
                  )}
                >
                  {property.privacy}
                </span>
                <span>Timezone: {property.timezone}</span>
                <span>Units: {property.defaultUnits === "imperial" ? "Imperial" : "Metric"}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                <span>{formatCurrency(property.price)}</span>
                <span>{property.bedrooms} bed</span>
                <span>{property.bathrooms} bath</span>
                <span>{property.sqft.toLocaleString()} sqft</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onView?.(property)} className="gap-2">
                  <Eye className="w-4 h-4" />
                  View Tour
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStats?.(property)} className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit?.(property)} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete?.(property.id)}
                  className="gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
