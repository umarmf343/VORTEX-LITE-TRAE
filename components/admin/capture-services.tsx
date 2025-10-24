"use client"

import type React from "react"

import { useEffect, useState } from "react"
import type { CaptureService, Property } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, User, Phone, Mail } from "lucide-react"

interface CaptureServicesProps {
  services: CaptureService[]
  properties?: Property[]
  onUpdateService?: (id: string, updates: Partial<CaptureService>) => void
  onCreateService?: (service: CaptureService) => void
}

type CaptureServiceFormData = {
  propertyId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  propertyAddress: string
  serviceType: CaptureService["serviceType"]
  notes: string
}

const serviceTypeOptions: ReadonlyArray<CaptureService["serviceType"]> = ["basic", "premium", "vr"]

const isCaptureServiceType = (value: string): value is CaptureService["serviceType"] =>
  (serviceTypeOptions as readonly string[]).includes(value)

export function CaptureServices({ services, properties = [], onUpdateService, onCreateService }: CaptureServicesProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CaptureServiceFormData>({
    propertyId: properties[0]?.id || "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    propertyAddress: "",
    serviceType: "premium",
    notes: "",
  })

  const handleServiceTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isCaptureServiceType(event.target.value)) {
      setFormData({ ...formData, serviceType: event.target.value })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newService: CaptureService = {
      id: `capture-${Date.now()}`,
      propertyId: formData.propertyId || properties[0]?.id,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      propertyAddress: formData.propertyAddress,
      serviceType: formData.serviceType,
      status: "pending",
      notes: formData.notes,
      createdAt: new Date(),
    }
    onCreateService?.(newService)
    setFormData({
      propertyId: properties[0]?.id || "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      propertyAddress: "",
      serviceType: "premium",
      notes: "",
    })
    setShowForm(false)
  }

  useEffect(() => {
    setFormData((prev) => ({ ...prev, propertyId: properties[0]?.id || "" }))
  }, [properties])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Capture Services</h2>
        <Button onClick={() => setShowForm(!showForm)}>Request Capture Service</Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-blue-50">
          <h3 className="font-semibold mb-4">New Capture Service Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Client Name"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              />
              <div className="flex flex-col gap-2">
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Property Address"
                  value={formData.propertyAddress}
                  onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                  className="px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Type</label>
              <select value={formData.serviceType} onChange={handleServiceTypeChange} className="w-full px-3 py-2 border rounded">
                <option value="basic">Basic (360° Photos)</option>
                <option value="premium">Premium (360° + Video)</option>
                <option value="vr">VR (Full 3D Model)</option>
              </select>
            </div>
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded h-24"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Submit Request
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Services List */}
      <div className="grid gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  <h3 className="font-semibold">{service.clientName}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      service.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : service.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : service.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{service.propertyAddress}</span>
                  </div>
                  {service.propertyId && (
                    <div className="text-xs text-gray-500 pl-6">Property ID: {service.propertyId}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {service.clientEmail}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {service.clientPhone}
                  </div>
                  {service.scheduledDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(service.scheduledDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {service.notes && <p className="text-sm text-gray-700 mt-2">{service.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateService?.(service.id, { status: "scheduled" })}
                  disabled={service.status !== "pending"}
                >
                  Schedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateService?.(service.id, { status: "completed" })}
                  disabled={service.status === "completed"}
                >
                  Complete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
