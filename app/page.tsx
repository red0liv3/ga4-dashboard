"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"

const propertyColors: Record<string, string> = {
  "Symetri Group": "#1f2937",
  "Symetri UK": "#2563eb",
  "Symetri Denmark": "#16a34a",
  "Symetri Finland": "#059669",
  "Symetri Norway": "#0f766e",
  "Symetri Sweden": "#0284c7",
  "Symetri Ireland": "#65a30d",
  "Symetri US": "#7c3aed",
  Naviate: "#f97316",
  Sovelia: "#dc2626",
  "FF Solutions": "#eab308",
  SolidCAD: "#be123c",
}

function formatMonth(value: string) {
  const year = value.slice(0, 4)
  const month = value.slice(4, 6)

  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  })
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-slate-500 mb-2">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    "Symetri",
    "Technology",
    "Acquisition",
  ])
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setSelectedProperties(json.properties?.map((p: any) => p.name) || [])
      })
  }, [])

  const groups = useMemo(() => {
    if (!data?.properties) return []
    return Array.from(new Set(data.properties.map((p: any) => p.group)))
  }, [data])

  const propertiesInSelectedGroups = useMemo(() => {
    if (!data?.properties) return []
    return data.properties.filter((p: any) => selectedGroups.includes(p.group))
  }, [data, selectedGroups])

  const visibleProperties = useMemo(() => {
    return propertiesInSelectedGroups
      .filter((p: any) => selectedProperties.includes(p.name))
      .map((p: any) => p.name)
  }, [propertiesInSelectedGroups, selectedProperties])

  const visibleRows = useMemo(() => {
    if (!data?.rows) return []

    return data.rows.filter(
      (row: any) =>
        row.month &&
        row.month !== "error" &&
        visibleProperties.includes(row.property)
    )
  }, [data, visibleProperties])

  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc: any, row: any) => {
        acc.sessions += row.sessions || 0
        acc.activeUsers += row.activeUsers || 0
        acc.newUsers += row.newUsers || 0
        return acc
      },
      {
        sessions: 0,
        activeUsers: 0,
        newUsers: 0,
      }
    )
  }, [visibleRows])

  const monthlyData = useMemo(() => {
    const grouped: Record<string, any> = {}

    for (const row of visibleRows) {
      if (!grouped[row.month]) {
        grouped[row.month] = {
          rawMonth: row.month,
          month: formatMonth(row.month),
        }
      }

      grouped[row.month][row.property] = row.sessions
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.rawMonth.localeCompare(b.rawMonth)
    )
  }, [visibleRows])

  if (!data) {
    return <main className="p-10">Loading dashboard...</main>
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold">Global Website Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Blended GA4 reporting across selected properties
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KpiCard label="Sessions" value={totals.sessions.toLocaleString()} />
        <KpiCard label="Users" value={totals.activeUsers.toLocaleString()} />
        <KpiCard label="New Users" value={totals.newUsers.toLocaleString()} />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4">Filter Groups</h2>

        <div className="flex flex-wrap gap-3 mb-6">
          {groups.map((group: any) => {
            const active = selectedGroups.includes(group)

            return (
              <button
                key={group}
                onClick={() => {
                  setSelectedGroups((current) =>
                    active
                      ? current.filter((g) => g !== group)
                      : [...current, group]
                  )
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {group}
              </button>
            )
          })}
        </div>

        <h3 className="text-sm font-semibold text-slate-500 mb-3">
          Filter Properties
        </h3>

        <div className="flex flex-wrap gap-3">
          {propertiesInSelectedGroups.map((property: any) => {
            const active = selectedProperties.includes(property.name)

            return (
              <button
                key={property.name}
                onClick={() => {
                  setSelectedProperties((current) =>
                    active
                      ? current.filter((p) => p !== property.name)
                      : [...current, property.name]
                  )
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{
                  backgroundColor: active
                    ? propertyColors[property.name] || "#0f172a"
                    : "#cbd5e1",
                  color: active ? "white" : "#334155",
                }}
              >
                {property.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          Monthly Sessions by Property
        </h2>

        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              {visibleProperties.map((name: string) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="a"
                  fill={propertyColors[name] || "#64748b"}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Property Trend Comparison
        </h2>

        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />

              {visibleProperties.map((name: string) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={propertyColors[name] || "#64748b"}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}