"use client"

import { useState } from "react"
import type { Lead } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MessageSquare, CheckCircle, Clock, XCircle } from "@/lib/icons"

interface LeadsDashboardProps {
  leads: Lead[]
  onUpdateLead?: (leadId: string, updates: Partial<Lead>) => void
}

export function LeadsDashboard({ leads, onUpdateLead }: LeadsDashboardProps) {
  const [filter, setFilter] = useState<"all" | "new" | "contacted" | "qualified" | "lost">("all")

  const filteredLeads = filter === "all" ? leads : leads.filter((l) => l.status === filter)

  const statusConfig = {
    new: { icon: Clock, color: "text-gray-600", bg: "bg-gray-100" },
    contacted: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-100" },
    qualified: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    lost: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "new", "contacted", "qualified", "lost"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads.map((lead) => {
          const StatusIcon = statusConfig[lead.status].icon
          return (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${statusConfig[lead.status].bg}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${statusConfig[lead.status].color}`} />
                      <span className={statusConfig[lead.status].color}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {lead.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {lead.phone}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{lead.message}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Visit Duration: {lead.visitDuration.toFixed(1)} min</span>
                    <span>Scenes Viewed: {lead.scenesViewed}</span>
                    <span>Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                  {lead.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Notes:</strong> {lead.notes}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:ml-4 md:justify-end">
                  {lead.status !== "qualified" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateLead?.(lead.id, { status: "qualified" })}
                    >
                      Qualify
                    </Button>
                  )}
                  {lead.status !== "contacted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateLead?.(lead.id, { status: "contacted" })}
                    >
                      Contact
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
