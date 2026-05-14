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

function isHomepage(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.pathname === "/" || parsed.pathname === "/home/"
  } catch {
    return false
  }
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
  const [searchData, setSearchData] = useState<any>(null)

  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    "Symetri",
    "Technology",
    "Acquisition",
  ])

  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [sortField, setSortField] = useState("clicks")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setSelectedProperties(json.properties?.map((p: any) => p.name) || [])
      })

    fetch("/api/search-console")
      .then((res) => res.json())
      .then(setSearchData)
      .catch(() => setSearchData(null))
  }, [])

  const groups = useMemo(() => {
    if (!data?.properties) return []
    return Array.from(new Set(data.properties.map((p: any) => p.group)))
  }, [data])

  const propertiesInSelectedGroups = useMemo(() => {
    if (!data?.properties) return []
    return data.properties.filter((p: any) => selectedGroups.includes(p.group))
  }, [data, selectedGroups])

  const visiblePropertyNames = useMemo(() => {
    return propertiesInSelectedGroups
      .filter((p: any) => selectedProperties.includes(p.name))
      .map((p: any) => p.name)
  }, [propertiesInSelectedGroups, selectedProperties])

  const visibleRows = useMemo(() => {
    if (!data?.rows) return []

    return data.rows.filter((row: any) => {
      return (
        row.month &&
        row.month !== "error" &&
        visiblePropertyNames.includes(row.property)
      )
    })
  }, [data, visiblePropertyNames])

  const totalsByProperty = useMemo(() => {
    const totals: Record<string, number> = {}

    for (const row of visibleRows) {
      totals[row.property] = (totals[row.property] || 0) + row.sessions
    }

    return totals
  }, [visibleRows])

  const sortedVisibleProperties = useMemo(() => {
    return [...visiblePropertyNames].sort(
      (a: string, b: string) =>
        (totalsByProperty[b] || 0) - (totalsByProperty[a] || 0)
    )
  }, [visiblePropertyNames, totalsByProperty])

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

  const filteredSearchPages = useMemo(() => {
    if (!searchData?.pages) return []

    return searchData.pages.filter(
      (page: any) =>
        visiblePropertyNames.includes(page.property) && !isHomepage(page.page)
    )
  }, [searchData, visiblePropertyNames])

  const visibleSearchPages = useMemo(() => {
    const sorted = [...filteredSearchPages]

    sorted.sort((a: any, b: any) => {
      let comparison = 0

      if (sortField === "property") {
        comparison = a.property.localeCompare(b.property)
      } else if (sortField === "page") {
        comparison = a.page.localeCompare(b.page)
      } else {
        comparison = (a[sortField] || 0) - (b[sortField] || 0)
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted.slice(0, 25)
  }, [filteredSearchPages, sortField, sortDirection])

  const searchTotals = useMemo(() => {
    const clicks = filteredSearchPages.reduce(
      (sum: number, row: any) => sum + row.clicks,
      0
    )

    const impressions = filteredSearchPages.reduce(
      (sum: number, row: any) => sum + row.impressions,
      0
    )

    const ctr = impressions > 0 ? clicks / impressions : 0

    const position =
      filteredSearchPages.length > 0
        ? filteredSearchPages.reduce(
            (sum: number, row: any) => sum + row.position,
            0
          ) / filteredSearchPages.length
        : 0

    return {
      clicks,
      impressions,
      ctr,
      position,
    }
  }, [filteredSearchPages])

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  if (!data) {
    return <main className="p-10">Loading dashboard...</main>
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Global Website Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Blended GA4 and Search Console reporting across selected properties
        </p>
      </div>

      <div className="sticky top-4 z-50 bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>

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
                className="rounded-full px-4 py-2 text-sm font-semibold"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KpiCard label="Sessions" value={totals.sessions.toLocaleString()} />
        <KpiCard label="Users" value={totals.activeUsers.toLocaleString()} />
        <KpiCard label="New Users" value={totals.newUsers.toLocaleString()} />
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

              {sortedVisibleProperties.map((name: string) => (
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

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
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

              {sortedVisibleProperties.map((name: string) => (
                <Line
                  key={name}
                  type="linear"
                  dataKey={name}
                  stroke={propertyColors[name] || "#64748b"}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KpiCard
          label="Organic Clicks"
          value={searchTotals.clicks.toLocaleString()}
        />
        <KpiCard
          label="Search Impressions"
          value={searchTotals.impressions.toLocaleString()}
        />
        <KpiCard
          label="Average CTR"
          value={`${(searchTotals.ctr * 100).toFixed(1)}%`}
        />
        <KpiCard
          label="Average Position"
          value={searchTotals.position.toFixed(1)}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Top Organic Landing Pages
        </h2>

        {!searchData ? (
          <p className="text-slate-500">Loading Search Console data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th
                    className="py-3 pr-4 cursor-pointer"
                    onClick={() => handleSort("property")}
                  >
                    Property
                  </th>
                  <th
                    className="py-3 pr-4 cursor-pointer"
                    onClick={() => handleSort("page")}
                  >
                    Page
                  </th>
                  <th
                    className="py-3 pr-4 text-right cursor-pointer"
                    onClick={() => handleSort("clicks")}
                  >
                    Clicks
                  </th>
                  <th
                    className="py-3 pr-4 text-right cursor-pointer"
                    onClick={() => handleSort("impressions")}
                  >
                    Impressions
                  </th>
                  <th
                    className="py-3 pr-4 text-right cursor-pointer"
                    onClick={() => handleSort("ctr")}
                  >
                    CTR
                  </th>
                  <th
                    className="py-3 pr-4 text-right cursor-pointer"
                    onClick={() => handleSort("position")}
                  >
                    Position
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleSearchPages.map((page: any, index: number) => (
                  <tr key={`${page.page}-${index}`} className="border-b">
                    <td className="py-3 pr-4 font-medium">{page.property}</td>
                    <td className="py-3 pr-4 max-w-xl truncate">
                      <a
                        href={page.page}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {page.page}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {page.clicks.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {page.impressions.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {(page.ctr * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {page.position.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {searchData?.errors?.length > 0 && (
          <p className="text-sm text-amber-600 mt-4">
            Some Search Console properties could not be loaded. This does not
            affect the rest of the dashboard.
          </p>
        )}
      </div>
    </main>
  )
}