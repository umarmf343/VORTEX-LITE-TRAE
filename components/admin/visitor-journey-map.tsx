"use client"

import type { Visitor } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

interface VisitorJourneyMapProps {
  visitors: Visitor[]
  propertyId: string
}

export function VisitorJourneyMap({ visitors, propertyId }: VisitorJourneyMapProps) {
  const propertyVisitors = visitors.filter((v) => v.propertyId === propertyId)

  const journeyData = propertyVisitors.map((visitor, idx) => ({
    visitorId: visitor.id,
    name: visitor.name || `Visitor ${idx + 1}`,
    scenesViewed: visitor.scenesViewed.length,
    duration: visitor.duration,
    hotspotClicks: visitor.hotspotClicks,
    quality: visitor.leadQuality,
  }))

  const timelineData = propertyVisitors.map((visitor, idx) => ({
    time: idx,
    avgDuration: visitor.duration,
    hotspotEngagement: visitor.hotspotClicks,
  }))

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Visitor Journey Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={journeyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="scenesViewed" fill="#3b82f6" name="Scenes Viewed" />
            <Bar dataKey="hotspotClicks" fill="#10b981" name="Hotspot Clicks" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Engagement Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="avgDuration" stroke="#3b82f6" name="Duration (min)" />
            <Line type="monotone" dataKey="hotspotEngagement" stroke="#10b981" name="Hotspot Clicks" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Visitor Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Visitor</th>
                <th className="text-left py-2">Scenes</th>
                <th className="text-left py-2">Duration</th>
                <th className="text-left py-2">Hotspots</th>
                <th className="text-left py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {journeyData.map((row) => (
                <tr key={row.visitorId} className="border-b hover:bg-gray-50">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">{row.scenesViewed}</td>
                  <td className="py-2">{row.duration.toFixed(1)}m</td>
                  <td className="py-2">{row.hotspotClicks}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        row.quality === "hot"
                          ? "bg-red-100 text-red-800"
                          : row.quality === "warm"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {row.quality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
