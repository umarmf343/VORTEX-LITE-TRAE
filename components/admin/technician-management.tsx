"use client"

import type { TechnicianProfile, CaptureService } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Star, Calendar, CheckCircle } from "lucide-react"

interface TechnicianManagementProps {
  technicians: TechnicianProfile[]
  services: CaptureService[]
  onAssignTechnician?: (serviceId: string, technicianId: string) => void
}

export function TechnicianManagement({ technicians, services, onAssignTechnician }: TechnicianManagementProps) {
  const [selectedTech, setSelectedTech] = useState<string | null>(null)

  const pendingServices = services.filter((s) => s.status === "pending")
  const scheduledServices = services.filter((s) => s.status === "scheduled")
  const completedServices = services.filter((s) => s.status === "completed")
  const technicianLookup = Object.fromEntries(technicians.map((tech) => [tech.id, tech]))

  return (
    <div className="space-y-6">
      {/* Technician Directory */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Technician Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedTech === tech.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onClick={() => setSelectedTech(tech.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{tech.name}</p>
                  <p className="text-sm text-gray-600">{tech.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium">{tech.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Specialization: {tech.specialization}</p>
                <p>Completed Jobs: {tech.completedJobs}</p>
                <p>Phone: {tech.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Service Queue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending */}
        <Card className="p-6">
          <h4 className="font-semibold mb-3 text-orange-600">Pending ({pendingServices.length})</h4>
          <div className="space-y-2">
            {pendingServices.map((service) => (
              <div key={service.id} className="border rounded p-2 text-sm">
                <p className="font-medium">{service.clientName}</p>
                <p className="text-gray-600">{service.propertyAddress}</p>
                {selectedTech && (
                  <Button
                    size="sm"
                    onClick={() => onAssignTechnician?.(service.id, selectedTech)}
                    className="mt-2 w-full"
                  >
                    Assign
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Scheduled */}
        <Card className="p-6">
          <h4 className="font-semibold mb-3 text-blue-600 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Scheduled ({scheduledServices.length})
          </h4>
          <div className="space-y-2">
            {scheduledServices.map((service) => (
              <div key={service.id} className="border rounded p-2 text-sm">
                <p className="font-medium">{service.clientName}</p>
                <p className="text-gray-600">{service.scheduledDate?.toLocaleDateString()}</p>
                {service.assignedTechnicianId && (
                  <p className="text-gray-500">
                    Assigned to {technicianLookup[service.assignedTechnicianId]?.name || "Technician"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Completed */}
        <Card className="p-6">
          <h4 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed ({completedServices.length})
          </h4>
          <div className="space-y-2">
            {completedServices.map((service) => (
              <div key={service.id} className="border rounded p-2 text-sm bg-green-50">
                <p className="font-medium">{service.clientName}</p>
                <p className="text-gray-600">{service.propertyAddress}</p>
                {service.assignedTechnicianId && (
                  <p className="text-gray-500 text-xs">
                    Completed by {technicianLookup[service.assignedTechnicianId]?.name || "Technician"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
