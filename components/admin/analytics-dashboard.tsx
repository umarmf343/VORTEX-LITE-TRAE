"use client"
import type { Property, Visitor, Lead } from "@/lib/types"
import { Card } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Eye, Users, Clock, TrendingUp, Zap } from "lucide-react"

interface AnalyticsDashboardProps {
  property: Property
  visitors: Visitor[]
  leads: Lead[]
}

export function AnalyticsDashboard({ property, visitors, leads }: AnalyticsDashboardProps) {
  const propertyVisitors = visitors.filter((v) => v.propertyId === property.id)
  const propertyLeads = leads.filter((l) => l.propertyId === property.id)

  const avgDuration =
    propertyVisitors.length > 0
      ? (propertyVisitors.reduce((sum, v) => sum + v.duration, 0) / propertyVisitors.length).toFixed(1)
      : 0

  const conversionRate =
    propertyVisitors.length > 0 ? ((propertyLeads.length / propertyVisitors.length) * 100).toFixed(1) : 0

  // Chart data
  const visitTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dayVisits = propertyVisitors.filter((v) => {
      const vDate = new Date(v.visitedAt)
      return vDate.toDateString() === date.toDateString()
    }).length
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      visits: dayVisits,
    }
  })

  const leadQualityData = [
    { name: "Hot", value: propertyVisitors.filter((v) => v.leadQuality === "hot").length },
    { name: "Warm", value: propertyVisitors.filter((v) => v.leadQuality === "warm").length },
    { name: "Cold", value: propertyVisitors.filter((v) => v.leadQuality === "cold").length },
  ]

  const COLORS = ["#ef4444", "#f97316", "#3b82f6"]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Visits</p>
              <p className="text-2xl font-bold">{propertyVisitors.length}</p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Unique Visitors</p>
              <p className="text-2xl font-bold">{new Set(propertyVisitors.map((v) => v.sessionId)).size}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Duration</p>
              <p className="text-2xl font-bold">{avgDuration}m</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Leads Generated</p>
              <p className="text-2xl font-bold">{propertyLeads.length}</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold">{conversionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Visit Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">Lead Quality Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadQualityData}
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
      </div>

      {/* Recent Leads */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Recent Leads</h3>
        <div className="space-y-3">
          {propertyLeads.slice(0, 5).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{lead.name}</p>
                <p className="text-sm text-gray-600">{lead.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{lead.phone}</p>
                <p
                  className={`text-xs px-2 py-1 rounded ${
                    lead.status === "qualified"
                      ? "bg-green-100 text-green-800"
                      : lead.status === "contacted"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {lead.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
