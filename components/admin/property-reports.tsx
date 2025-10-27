"use client"

import type {
  AdvancedAnalyticsReport,
  HotspotMetrics,
  Property,
  SceneEngagementMetrics,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, FileJson, FileText } from "@/lib/icons"
import { useState } from "react"

interface PropertyReportsProps {
  property: Property
}

export function PropertyReports({ property }: PropertyReportsProps) {
  const [reportFormat, setReportFormat] = useState<"pdf" | "json" | "csv">("json")

  const downloadBlob = (blob: Blob, filename: string) => {
    if (typeof document === "undefined") {
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateReport = (): AdvancedAnalyticsReport => {
    const stats = property.stats
    return {
      propertyId: property.id,
      generatedAt: new Date(),
      period: "month",
      totalVisits: stats.totalVisits,
      uniqueVisitors: stats.uniqueVisitors,
      avgDuration: stats.avgDuration,
      conversionRate: stats.conversionRate,
      leadsGenerated: stats.leadsGenerated,
      deviceBreakdown: {
        desktop: Math.round(stats.totalVisits * 0.6),
        mobile: Math.round(stats.totalVisits * 0.35),
        vr: Math.round(stats.totalVisits * 0.05),
      },
      referralSources: {
        google: Math.round(stats.totalVisits * 0.4),
        direct: Math.round(stats.totalVisits * 0.3),
        social: Math.round(stats.totalVisits * 0.2),
        other: Math.round(stats.totalVisits * 0.1),
      },
      sceneEngagement: Object.entries(stats.scenePopularity || {}).reduce<Record<string, SceneEngagementMetrics>>(
        (acc, [sceneId, views]) => {
          const scene = property.scenes.find((s) => s.id === sceneId)
          acc[sceneId] = {
            sceneId,
            sceneName: scene?.name || "Unknown",
            views: typeof views === "number" ? views : Number(views),
            avgDwellTime: scene?.dwellTime || 0,
            exitRate: Math.random() * 30,
            nextSceneTransitions: {},
          }
          return acc
        },
        {},
      ),
      hotspotPerformance: Object.entries(stats.hotspotEngagement || {}).reduce<Record<string, HotspotMetrics>>(
        (acc, [hotspotId, clicks]) => {
          const hotspot = property.scenes.flatMap((s) => s.hotspots).find((h) => h.id === hotspotId)
          const clickCount = typeof clicks === "number" ? clicks : Number(clicks)
          acc[hotspotId] = {
            hotspotId,
            title: hotspot?.title || "Unknown",
            clicks: clickCount,
            clickRate: stats.totalVisits > 0 ? (clickCount / stats.totalVisits) * 100 : 0,
            conversionRate: Math.random() * 20,
          }
          return acc
        },
        {},
      ),
      visitorJourney: [],
    }
  }

  const handleExport = () => {
    const report = generateReport()

    if (reportFormat === "json") {
      const dataStr = JSON.stringify(report, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      downloadBlob(
        dataBlob,
        `${property.name}-report-${new Date().toISOString().split("T")[0]}.json`,
      )
      return
    }

    if (reportFormat === "csv") {
      let csv = "Property Report\n"
      csv += `Property: ${property.name}\n`
      csv += `Generated: ${new Date().toISOString()}\n\n`
      csv += "Metric,Value\n"
      csv += `Total Visits,${report.totalVisits}\n`
      csv += `Unique Visitors,${report.uniqueVisitors}\n`
      csv += `Avg Duration (min),${report.avgDuration}\n`
      csv += `Conversion Rate (%),${report.conversionRate}\n`
      csv += `Leads Generated,${report.leadsGenerated}\n`

      const dataBlob = new Blob([csv], { type: "text/csv" })
      downloadBlob(
        dataBlob,
        `${property.name}-report-${new Date().toISOString().split("T")[0]}.csv`,
      )
      return
    }

    alert("PDF export is not available in this demo build. Please choose JSON or CSV instead.")
  }

  const report = generateReport()

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Generate Report</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <div className="flex gap-2">
              {(["json", "csv", "pdf"] as const).map((format) => (
                <Button
                  key={format}
                  variant={reportFormat === format ? "default" : "outline"}
                  onClick={() => setReportFormat(format)}
                  className="gap-2"
                >
                  {format === "json" && <FileJson className="w-4 h-4" />}
                  {format === "csv" && <FileText className="w-4 h-4" />}
                  {format === "pdf" && <FileText className="w-4 h-4" />}
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </Card>

      {/* Report Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Report Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Visits</p>
            <p className="text-2xl font-bold">{report.totalVisits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unique Visitors</p>
            <p className="text-2xl font-bold">{report.uniqueVisitors}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Duration (min)</p>
            <p className="text-2xl font-bold">{report.avgDuration.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold">{report.conversionRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Leads Generated</p>
            <p className="text-2xl font-bold">{report.leadsGenerated}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Generated</p>
            <p className="text-sm font-semibold">{report.generatedAt.toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      {/* Device Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Device Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(report.deviceBreakdown).map(([device, count]) => (
            <div key={device} className="flex items-center justify-between">
              <span className="capitalize">{device}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(count / report.totalVisits) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral Sources */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Referral Sources</h3>
        <div className="space-y-2">
          {Object.entries(report.referralSources).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between">
              <span className="capitalize">{source}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(count / report.totalVisits) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default PropertyReports
