"use client"

import type { Property, Visitor, Lead } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download } from "lucide-react"

interface AdvancedAnalyticsProps {
  property: Property
  visitors: Visitor[]
  leads: Lead[]
}

export function AdvancedAnalytics({ property, visitors, leads }: AdvancedAnalyticsProps) {
  const propertyVisitors = visitors.filter((v) => v.propertyId === property.id)
  const propertyLeads = leads.filter((l) => l.propertyId === property.id)

  const scenePopularityData = property.scenes.map((scene) => ({
    name: scene.name,
    views: scene.viewCount || 0,
    dwellTime: scene.dwellTime || 0,
  }))

  const hotspotEngagementData = property.scenes
    .flatMap((scene) =>
      scene.hotspots.map((hotspot) => ({
        name: hotspot.title,
        clicks: hotspot.clickCount || 0,
      })),
    )
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  const deviceData = [
    { name: "Desktop", value: propertyVisitors.filter((v) => v.deviceType === "desktop").length },
    { name: "Mobile", value: propertyVisitors.filter((v) => v.deviceType === "mobile").length },
    { name: "VR", value: propertyVisitors.filter((v) => v.deviceType === "vr").length },
  ]

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b"]

  const handleExportReport = () => {
    const report = {
      property: property.name,
      generatedAt: new Date().toISOString(),
      summary: {
        totalVisits: propertyVisitors.length,
        uniqueVisitors: new Set(propertyVisitors.map((v) => v.sessionId)).size,
        avgDuration: (propertyVisitors.reduce((sum, v) => sum + v.duration, 0) / propertyVisitors.length).toFixed(1),
        leadsGenerated: propertyLeads.length,
        conversionRate: ((propertyLeads.length / propertyVisitors.length) * 100).toFixed(1),
      },
      scenePopularity: scenePopularityData,
      hotspotEngagement: hotspotEngagementData,
      deviceDistribution: deviceData,
      leads: propertyLeads,
    }

    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${property.name}-report-${new Date().toISOString().split("T")[0]}.json`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExportReport} className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Scene Popularity */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Scene Popularity & Dwell Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scenePopularityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="views" fill="#3b82f6" name="Views" />
            <Bar yAxisId="right" dataKey="dwellTime" fill="#10b981" name="Dwell Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Hotspot Engagement */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Top Hotspots by Engagement</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hotspotEngagementData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="clicks" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Device Distribution */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Device Type Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={deviceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {COLORS.map((color, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Visitor Engagement Details */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Visitor Engagement Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Visitor</th>
                <th className="text-left py-2">Duration</th>
                <th className="text-left py-2">Scenes</th>
                <th className="text-left py-2">Hotspots</th>
                <th className="text-left py-2">Device</th>
                <th className="text-left py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {propertyVisitors.map((visitor) => (
                <tr key={visitor.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{visitor.name || "Anonymous"}</td>
                  <td className="py-2">{visitor.duration.toFixed(1)}m</td>
                  <td className="py-2">{visitor.scenesViewed.length}</td>
                  <td className="py-2">{visitor.hotspotClicks}</td>
                  <td className="py-2 capitalize">{visitor.deviceType || "unknown"}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        visitor.leadQuality === "hot"
                          ? "bg-red-100 text-red-800"
                          : visitor.leadQuality === "warm"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {visitor.leadQuality}
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
