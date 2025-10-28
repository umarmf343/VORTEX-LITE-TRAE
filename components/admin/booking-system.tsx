"use client"

import type { BookingSlot } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar, Clock, Check } from "@/lib/icons"
import { useState } from "react"

interface BookingSystemProps {
  propertyId: string
  slots: BookingSlot[]
  onBook?: (slotId: string, booking: { name: string; email: string; phone?: string }) => Promise<void> | void
}

export function BookingSystem({ propertyId, slots, onBook }: BookingSystemProps) {
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [visitorInfo, setVisitorInfo] = useState({ name: "", email: "", phone: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBooking = async () => {
    if (!selectedSlot || !visitorInfo.name || !visitorInfo.email) {
      return
    }
    try {
      setIsSubmitting(true)
      await onBook?.(selectedSlot.id, visitorInfo)
      setSelectedSlot(null)
      setVisitorInfo({ name: "", email: "", phone: "" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableSlots = slots.filter((s) => s.available && s.propertyId === propertyId)
  const bookedSlots = slots.filter((s) => !s.available && s.propertyId === propertyId)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Available Booking Slots
        </h3>

        <div className="space-y-3">
          {availableSlots.length > 0 ? (
            availableSlots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedSlot?.id === slot.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedSlot(slot)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <div>
                      <p className="font-semibold">{slot.date.toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.time} ({slot.duration} min)
                      </p>
                    </div>
                  </div>
                  {selectedSlot?.id === slot.id && <Check className="w-5 h-5 text-blue-500" />}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No available slots at the moment</p>
          )}
        </div>
      </Card>

      {selectedSlot && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">Complete Your Booking</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={visitorInfo.name}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="email"
              placeholder="Email"
              value={visitorInfo.email}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={visitorInfo.phone}
              onChange={(e) => setVisitorInfo({ ...visitorInfo, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleBooking} className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Scheduling…" : "Confirm Booking"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedSlot(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {bookedSlots.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Booked Slots</h3>
          <div className="space-y-2">
            {bookedSlots.map((slot) => (
              <div key={slot.id} className="p-3 bg-gray-100 rounded-lg text-sm">
                <p className="font-semibold">
                  {slot.date.toLocaleDateString()} at {slot.time}
                </p>
                <p className="text-gray-600">Booked by: {slot.bookedBy}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default BookingSystem
