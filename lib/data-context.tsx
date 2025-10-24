"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import type { Property, Lead, Visitor } from "./types"
import { mockProperties, mockLeads, mockVisitors } from "./mock-data"

interface DataContextType {
  properties: Property[]
  leads: Lead[]
  visitors: Visitor[]
  addProperty: (property: Property) => void
  updateProperty: (id: string, property: Partial<Property>) => void
  deleteProperty: (id: string) => void
  addLead: (lead: Lead) => void
  updateLead: (id: string, lead: Partial<Lead>) => void
  addVisitor: (visitor: Visitor) => void
  getPropertyStats: (propertyId: string) => any
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(mockProperties)
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [visitors, setVisitors] = useState<Visitor[]>(mockVisitors)

  const addProperty = useCallback((property: Property) => {
    setProperties((prev) => [...prev, property])
  }, [])

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])

  const deleteProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addLead = useCallback((lead: Lead) => {
    setLeads((prev) => [...prev, lead])
  }, [])

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const addVisitor = useCallback((visitor: Visitor) => {
    setVisitors((prev) => [...prev, visitor])
  }, [])

  const getPropertyStats = useCallback(
    (propertyId: string) => {
      const propertyVisitors = visitors.filter((v) => v.propertyId === propertyId)
      const propertyLeads = leads.filter((l) => l.propertyId === propertyId)

      return {
        totalVisits: propertyVisitors.length,
        uniqueVisitors: new Set(propertyVisitors.map((v) => v.sessionId)).size,
        avgDuration:
          propertyVisitors.length > 0
            ? propertyVisitors.reduce((sum, v) => sum + v.duration, 0) / propertyVisitors.length
            : 0,
        leadsGenerated: propertyLeads.length,
        conversionRate: propertyVisitors.length > 0 ? (propertyLeads.length / propertyVisitors.length) * 100 : 0,
      }
    },
    [visitors, leads],
  )

  return (
    <DataContext.Provider
      value={{
        properties,
        leads,
        visitors,
        addProperty,
        updateProperty,
        deleteProperty,
        addLead,
        updateLead,
        addVisitor,
        getPropertyStats,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within DataProvider")
  }
  return context
}
