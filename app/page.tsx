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
  PieChart,
  Pie,
  Cell,
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

const channelColors = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#dc2626",
  "#7c3aed",
  "#0f766e",
  "#eab308",
  "#64748b",
]

const regionMap: Record<string, string[]> = {
  Europe: [
    "Symetri UK",
    "Symetri Ireland",
    "Symetri Sweden",
    "Symetri Denmark",
    "Symetri Finland",
    "Symetri Norway",
  ],
  Nordic: [
    "Symetri Sweden",
    "Symetri Denmark",
    "Symetri Finland",
    "Symetri Norway",
  ],
  "UK&I": ["Symetri UK", "Symetri Ireland"],
  USA: ["Symetri US"],
  Canada: ["SolidCAD"],
  LATAM: ["FF Solutions"],
  Technology: ["Naviate", "Sovelia"],
}

const RESULTS_PER_PAGE = 10

function formatMonth(value: string) {
  const year = value.slice(0, 4)
  const month = value.slice(4, 6)

  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  })
}

function formatWeekLabel(value: string) {
  const year = Number(value.slice(0, 4))
  const week = Number(value.slice(4))
  const date = new Date(year, 0, 1 + (week - 1) * 7)

  return date.toLocaleDateString("en-GB", {
    month: "short",
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

function channelCategory(channel: string) {
  const value = channel.toLowerCase()

  if (value.includes("organic")) return "Organic"
  if (
    value.includes("paid") ||
    value.includes("display") ||
    value.includes("cross-network")
  ) {
    return "Paid"
  }

  if (value.includes("social") || value.includes("video")) return "Social"
  if (value.includes("email")) return "Email"
  if (value.includes("referral")) return "Referral"
  if (value.includes("direct")) return "Direct"

  return "Other"
}

function KpiCard({
  label,
  value,
  mom,
  yoy,
}: {
  label: string
  value: string
  mom?: number
  yoy?: number
}) {
  function ChangeLine({
    label,
    value,
  }: {
    label: string
    value?: number
  }) {
    if (value === undefined) return null

    const positive = value >= 0

    return (
      <p
        className={`mt-1 text-sm font-medium ${
          positive ? "text-green-600" : "text-red-600"
        }`}
      >
        {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}% {label}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-slate-500 mb-2">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>

      <div className="mt-3">
        <ChangeLine label="MoM" value={mom} />
        <ChangeLine label="YoY" value={yoy} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [searchData, setSearchData] = useState<any>(null)
  const [channelData, setChannelData] = useState<any>(null)
  const [weeklyData, setWeeklyData] = useState<any>(null)
  const [searchMonthlyData, setSearchMonthlyData] = useState<any>(null)
  const [chartRange, setChartRange] = useState("12")
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [sortField, setSortField] = useState("clicks")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)

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

    fetch("/api/channels")
      .then((res) => res.json())
      .then(setChannelData)
      .catch(() => setChannelData(null))

    fetch("/api/search-console-monthly")
      .then((res) => res.json())
      .then(setSearchMonthlyData)
      .catch(() => setSearchMonthlyData(null))

    fetch("/api/weekly-trends")
      .then((res) => res.json())
      .then(setWeeklyData)
      .catch(() => setWeeklyData(null))
  }, [])

  const groups = useMemo(() => {
    if (!data?.properties) return []
    return Array.from(new Set(data.properties.map((p: any) => p.group)))
  }, [data])

  const propertiesInSelectedGroups = useMemo(() => {
    if (!data?.properties) return []

    const regionProperties =
      selectedRegion === null ? null : regionMap[selectedRegion] || []

    if (regionProperties === null) {
      return data.properties
    }

    return data.properties.filter((p: any) =>
      regionProperties.includes(p.name)
    )
  }, [data, selectedRegion])

  const visiblePropertyNames = useMemo(() => {
    return propertiesInSelectedGroups
      .filter((p: any) => selectedProperties.includes(p.name))
      .map((p: any) => p.name)
  }, [propertiesInSelectedGroups, selectedProperties])

  const visibleRows = useMemo(() => {
    if (!data?.rows) return []

    const currentMonth = new Date()
      .toISOString()
      .slice(0, 7)
      .replace("-", "")

    return data.rows.filter(
      (row: any) =>
        row.month &&
        row.month !== "error" &&
        row.month !== currentMonth &&
        visiblePropertyNames.includes(row.property)
    )
  }, [data, visiblePropertyNames])

  const visibleRowsForSelectedRange = useMemo(() => {
    const months = Array.from(
      new Set(visibleRows.map((row: any) => row.month))
    )
      .sort()
      .slice(chartRange === "1" ? -1 : chartRange === "3" ? -3 : -12)

    return visibleRows.filter((row: any) => months.includes(row.month))
  }, [visibleRows, chartRange])

  const totals = useMemo(() => {
    return visibleRowsForSelectedRange.reduce(
      (acc: any, row: any) => {
        acc.sessions += row.sessions || 0
        acc.activeUsers += row.activeUsers || 0
        acc.newUsers += row.newUsers || 0
        acc.engagedSessions += row.engagedSessions || 0
        acc.userEngagementDuration += row.userEngagementDuration || 0        
        return acc
      },
      {
        sessions: 0,
        activeUsers: 0,
        newUsers: 0,
        engagedSessions: 0,
        userEngagementDuration: 0,
      }
    )
  }, [visibleRowsForSelectedRange])

  const engagementRate =
    totals.sessions > 0 ? totals.engagedSessions / totals.sessions : 0

  const averageEngagementTime =
    totals.activeUsers > 0 ? totals.userEngagementDuration / totals.activeUsers : 0
  
  const totalsByProperty = useMemo(() => {
    const totals: Record<string, number> = {}

    for (const row of visibleRows) {
      totals[row.property] = (totals[row.property] || 0) + row.sessions
    }

    return totals
  }, [visibleRows])

  const sortedVisibleProperties = useMemo(() => {
    return [...visiblePropertyNames].sort(
      (a, b) => (totalsByProperty[b] || 0) - (totalsByProperty[a] || 0)
    )
  }, [visiblePropertyNames, totalsByProperty])

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
      grouped[row.month][`${row.property}_users`] = row.activeUsers
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.rawMonth.localeCompare(b.rawMonth)
    )
  }, [visibleRows])

  const monthlyChartData = useMemo(() => {
    return monthlyData.slice(-12)
  }, [monthlyData])

const filteredMonthlyChartData = useMemo(() => {
  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7)
    .replace("-", "")

  const completeMonths = monthlyChartData.filter(
    (row: any) => row.rawMonth !== currentMonth
  )

  switch (chartRange) {
    case "1":
      return completeMonths.slice(-1)

    case "3":
      return completeMonths.slice(-3)

    case "12":
    default:
      return completeMonths.slice(-12)
  }
}, [monthlyChartData, chartRange])

const monthComparison = useMemo(() => {
  if (monthlyData.length < 2) return null

  function totalForMonth(monthRow: any, keys: string[]) {
    return keys.reduce((sum, key) => sum + (monthRow[key] || 0), 0)
  }

  function percentChange(current: number, previous: number) {
    if (!previous) return undefined
    return ((current - previous) / previous) * 100
  }

  const latest = monthlyData[monthlyData.length - 1]
  const previous = monthlyData[monthlyData.length - 2]

  const latestRawMonth = latest.rawMonth
  const sameMonthLastYear = `${
    Number(latestRawMonth.slice(0, 4)) - 1
  }${latestRawMonth.slice(4, 6)}`

  const lastYear = monthlyData.find(
    (row: any) => row.rawMonth === sameMonthLastYear
  )

  const latestSessions = totalForMonth(latest, sortedVisibleProperties)
  const previousSessions = totalForMonth(previous, sortedVisibleProperties)
  const lastYearSessions = lastYear
    ? totalForMonth(lastYear, sortedVisibleProperties)
    : 0

  const latestUsers = totalForMonth(
    latest,
    sortedVisibleProperties.map((p) => `${p}_users`)
  )

  const previousUsers = totalForMonth(
    previous,
    sortedVisibleProperties.map((p) => `${p}_users`)
  )

  const lastYearUsers = lastYear
    ? totalForMonth(
        lastYear,
        sortedVisibleProperties.map((p) => `${p}_users`)
      )
    : 0

  return {
    sessionsMom: percentChange(latestSessions, previousSessions),
    sessionsYoy: percentChange(latestSessions, lastYearSessions),
    usersMom: percentChange(latestUsers, previousUsers),
    usersYoy: percentChange(latestUsers, lastYearUsers),
  }
}, [monthlyData, sortedVisibleProperties])

const searchComparison = useMemo(() => {
  if (!searchMonthlyData?.rows) return null

  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7)
    .replace("-", "")

  const grouped: Record<string, number> = {}

  for (const row of searchMonthlyData.rows) {
    if (!visiblePropertyNames.includes(row.property)) continue

    const month = row.date.slice(0, 7).replace("-", "")

    if (month === currentMonth) continue

    grouped[month] = (grouped[month] || 0) + row.clicks
  }

  const months = Object.keys(grouped).sort()

  if (months.length < 2) return null

  const latestMonth = months[months.length - 1]
  const previousMonth = months[months.length - 2]

  const sameMonthLastYear = `${
    Number(latestMonth.slice(0, 4)) - 1
  }${latestMonth.slice(4, 6)}`

  function percentChange(current: number, previous: number) {
    if (!previous) return undefined
    return ((current - previous) / previous) * 100
  }

  return {
    clicksMom: percentChange(grouped[latestMonth], grouped[previousMonth]),
    clicksYoy: percentChange(grouped[latestMonth], grouped[sameMonthLastYear]),
  }
}, [searchMonthlyData, visiblePropertyNames])




  const engagementTrendData = useMemo(() => {
    const grouped: Record<string, any> = {}

    for (const row of visibleRows) {
      if (!grouped[row.month]) {
        grouped[row.month] = {
          rawMonth: row.month,
          month: formatMonth(row.month),
        }
      }

      const sessions = row.sessions || 0
      const engagedSessions = row.engagedSessions || 0

      grouped[row.month][row.property] =
        sessions > 0
          ? (engagedSessions / sessions) * 100
          : 0
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.rawMonth.localeCompare(b.rawMonth)
    )
  }, [visibleRows]) 

  const filteredEngagementTrendData = useMemo(() => {
    switch (chartRange) {
      case "1":
        return engagementTrendData.slice(-1)

      case "3":
        return engagementTrendData.slice(-3)

      case "12":
      default:
        return engagementTrendData.slice(-12)
    }
  }, [engagementTrendData, chartRange])  
  
  const weeklyChartData = useMemo(() => {
    if (!weeklyData?.rows) return []

    const grouped: Record<string, any> = {}

    for (const row of weeklyData.rows) {
      const currentMonth = new Date()
        .toISOString()
        .slice(0, 7)
        .replace("-", "")

      if (row.week?.startsWith(currentMonth.slice(0, 4))) {
        const weekMonth = formatWeekLabel(row.week)
        const thisMonth = new Date().toLocaleDateString("en-GB", {
          month: "short",
        })

        if (weekMonth === thisMonth) continue
      }      
      if (!visiblePropertyNames.includes(row.property)) continue

      if (!grouped[row.week]) {
        grouped[row.week] = {
          rawWeek: row.week,
          week: formatWeekLabel(row.week),
        }
      }

      grouped[row.week][row.property] = row.sessions
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.rawWeek.localeCompare(b.rawWeek)
    )
  }, [weeklyData, visiblePropertyNames])

  const weeklyEngagementData = useMemo(() => {
    if (!weeklyData?.rows) return []

    const grouped: Record<string, any> = {}

    for (const row of weeklyData.rows) {
      if (!visiblePropertyNames.includes(row.property)) continue

      if (!grouped[row.week]) {
        grouped[row.week] = {
          rawWeek: row.week,
          week: formatWeekLabel(row.week),
        }
      }

      const sessions = row.sessions || 0
      const engagedSessions = row.engagedSessions || 0

      grouped[row.week][row.property] =
        sessions > 0 ? (engagedSessions / sessions) * 100 : 0
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.rawWeek.localeCompare(b.rawWeek)
    )
  }, [weeklyData, visiblePropertyNames])

  const filteredWeeklyEngagementData = useMemo(() => {
    switch (chartRange) {
      case "1":
        return weeklyEngagementData.slice(-4)

      case "3":
        return weeklyEngagementData.slice(-13)

      case "12":
      default:
        return weeklyEngagementData.slice(-52)
    }
  }, [weeklyEngagementData, chartRange])

  const filteredWeeklyChartData = useMemo(() => {
    switch (chartRange) {
      case "1":
        return weeklyChartData.slice(-4)
      case "3":
        return weeklyChartData.slice(-13)
      case "12":
      default:
        return weeklyChartData.slice(-52)
    }
  }, [weeklyChartData, chartRange])  
  
  const filteredSearchPages = useMemo(() => {
    if (!searchData?.pages) return []

    return searchData.pages.filter(
      (page: any) =>
        visiblePropertyNames.includes(page.property) && !isHomepage(page.page)
    )
  }, [searchData, visiblePropertyNames])

  const sortedSearchPages = useMemo(() => {
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

    return sorted
  }, [filteredSearchPages, sortField, sortDirection])

  const totalPages = Math.min(
    5,
    Math.ceil(sortedSearchPages.length / RESULTS_PER_PAGE)
  )

  const visibleSearchPages = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE
    return sortedSearchPages.slice(start, start + RESULTS_PER_PAGE)
  }, [sortedSearchPages, currentPage])

  const filteredSearchRowsForSelectedRange = useMemo(() => {
    if (!searchMonthlyData?.rows) return []

    const months = Array.from(
      new Set(
        searchMonthlyData.rows
          .filter((row: any) => visiblePropertyNames.includes(row.property))
          .map((row: any) => row.date.slice(0, 7).replace("-", ""))
      )
    )
      .sort()
      .slice(chartRange === "1" ? -1 : chartRange === "3" ? -3 : -12)

    return searchMonthlyData.rows.filter((row: any) => {
      const month = row.date.slice(0, 7).replace("-", "")

      return (
        visiblePropertyNames.includes(row.property) &&
        months.includes(month)
      )
    })
  }, [searchMonthlyData, visiblePropertyNames, chartRange])

  const searchClicksForSelectedRange = useMemo(() => {
    return filteredSearchRowsForSelectedRange.reduce(
      (sum: number, row: any) => sum + row.clicks,
      0
    )
  }, [filteredSearchRowsForSelectedRange])
  
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

  const filteredChannels = useMemo(() => {
    if (!channelData?.rows) return []

  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7)
    .replace("-", "")

  const availableMonths = Array.from(
    new Set(
      channelData.rows
        .filter((r: any) => visiblePropertyNames.includes(r.property))
        .map((r: any) => r.month)
    )
  )
  .sort()
  .filter((month) => month !== currentMonth)
  .slice(chartRange === "1" ? -1 : chartRange === "3" ? -3 : -12)

  const grouped: Record<string, number> = {}

  for (const row of channelData.rows) {
    if (!visiblePropertyNames.includes(row.property)) continue
    if (!availableMonths.includes(row.month)) continue

    const category = channelCategory(row.channel)

    grouped[category] = (grouped[category] || 0) + row.sessions
  }

  return Object.entries(grouped)
    .map(([channel, sessions]) => ({
      channel,
      sessions,
    }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [channelData, visiblePropertyNames, chartRange])

  const propertyShareData = useMemo(() => {
    const grouped: Record<string, number> = {}

    for (const row of visibleRowsForSelectedRange) {
      if (!visiblePropertyNames.includes(row.property)) continue

      grouped[row.property] =
        (grouped[row.property] || 0) + row.sessions
    }

    return Object.entries(grouped)
      .map(([property, sessions]) => ({
        property,
        sessions,
      }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [visibleRowsForSelectedRange, visiblePropertyNames])  

  const totalPropertyShareSessions = useMemo(() => {
    return propertyShareData.reduce(
      (sum: number, row: any) => sum + row.sessions,
      0
    )
  }, [propertyShareData])  
  
  const totalChannelSessions = useMemo(() => {
    return filteredChannels.reduce(
      (sum: number, row: any) => sum + row.sessions,
      0
    )
  }, [filteredChannels])

  function handleSort(field: string) {
    setCurrentPage(1)

    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedRegion, selectedProperties])

if (!data) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-6">
          Building dashboard
        </h1>

        <div className="mt-8 flex justify-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-400 animate-bounce" />
          <div className="h-3 w-3 rounded-full bg-slate-400 animate-bounce [animation-delay:200ms]" />
          <div className="h-3 w-3 rounded-full bg-slate-400 animate-bounce [animation-delay:400ms]" />
        </div>
      </div>
    </main>
  )
}

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Global Website Dashboard</h1>
        <p className="text-slate-500 mt-2">
          Blended GA4 and Search Console reporting
        </p>
      </div>

      <div className="sticky top-4 z-50 bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Annual", value: "12" },
              { label: "Quarter", value: "3" },
              { label: "Month", value: "1" },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setChartRange(range.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  chartRange === range.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedRegion(null)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selectedRegion === null
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              All
            </button>

            {Object.keys(regionMap).map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedRegion === region
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>        
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
  <KpiCard
    label="Sessions"
    value={totals.sessions.toLocaleString()}
    mom={monthComparison?.sessionsMom}
    yoy={monthComparison?.sessionsYoy}
  />

  <KpiCard
    label="Users"
    value={totals.activeUsers.toLocaleString()}
    mom={monthComparison?.usersMom}
    yoy={monthComparison?.usersYoy}
  />

  <KpiCard
    label="Organic Clicks"
    value={searchClicksForSelectedRange.toLocaleString()}
    mom={searchComparison?.clicksMom}
    yoy={searchComparison?.clicksYoy}
  />
</div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          Monthly Sessions by Property
        </h2>

        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredMonthlyChartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                wrapperStyle={{
                  zIndex: 9999,
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              />
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
            <LineChart data={filteredWeeklyChartData}>
              <XAxis dataKey="week" interval={4} />
              <YAxis />
              <Tooltip
                wrapperStyle={{
                  zIndex: 9999,
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              />
              <Legend />
              {sortedVisibleProperties.map((name: string) => (
                <Line
                  key={name}
                  type="linear"
                  dataKey={name}
                  stroke={propertyColors[name] || "#64748b"}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
<div className="bg-white rounded-2xl p-6 shadow-sm mb-10 break-inside-avoid">
  <h2 className="text-2xl font-semibold mb-6">
    Sessions by Property
  </h2>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={propertyShareData}
            dataKey="sessions"
            nameKey="property"
            innerRadius={90}
            outerRadius={150}
            paddingAngle={2}
          >
            {propertyShareData.map((entry: any) => (
              <Cell
                key={entry.property}
                fill={propertyColors[entry.property] || "#64748b"}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value: any, name: any) => {
              const sessions = Number(value)
              const percent =
                totalPropertyShareSessions > 0
                  ? (sessions / totalPropertyShareSessions) * 100
                  : 0

              return [
                `${sessions.toLocaleString()} sessions (${percent.toFixed(
                  1
                )}%)`,
                name,
              ]
            }}
            wrapperStyle={{
              zIndex: 9999,
            }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
            }}
          />

          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>

    <div>
      <p className="text-slate-500 mb-2">
        Total selected sessions
      </p>

      <h3 className="text-4xl font-bold mb-6">
        {totalPropertyShareSessions.toLocaleString()}
      </h3>

      <div className="space-y-3">
        {propertyShareData.map((row: any) => {
          const percent =
            totalPropertyShareSessions > 0
              ? (row.sessions / totalPropertyShareSessions) * 100
              : 0

          return (
            <div
              key={row.property}
              className="flex items-center justify-between border-b border-slate-200 pb-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      propertyColors[row.property] || "#64748b",
                  }}
                />

                <span className="font-medium">{row.property}</span>
              </div>

              <div className="text-right">
                <div className="font-semibold">
                  {row.sessions.toLocaleString()}
                </div>

                <div className="text-xs text-slate-500">
                  {percent.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  </div>
</div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-2xl font-semibold mb-6">
          Traffic Acquisition Mix
        </h2>

        {!channelData ? (
          <p className="text-slate-500">Loading channel data...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredChannels}
                    dataKey="sessions"
                    nameKey="channel"
                    innerRadius={90}
                    outerRadius={150}
                    paddingAngle={2}
                  >
                    {filteredChannels.map((entry: any, index: number) => (
                      <Cell
                        key={entry.channel}
                        fill={channelColors[index % channelColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                  formatter={(value: any, name: any) => {
                    const sessions = Number(value)
                    const percent =
                      totalChannelSessions > 0
                        ? (sessions / totalChannelSessions) * 100
                        : 0

                    return [
                      `${sessions.toLocaleString()} sessions (${percent.toFixed(1)}%)`,
                      name,
                    ]
                  }}
                  wrapperStyle={{
                    zIndex: 9999,
                  }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-slate-500 mb-2">Total sessions by channel</p>
              <h3 className="text-4xl font-bold mb-6">
                {totalChannelSessions.toLocaleString()}
              </h3>

              <div className="space-y-3">
                {filteredChannels.map((row: any, index: number) => {
                  const percent =
                    totalChannelSessions > 0
                      ? (row.sessions / totalChannelSessions) * 100
                      : 0

                  return (
                    <div
                      key={row.channel}
                      className="flex items-center justify-between border-b border-slate-200 pb-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              channelColors[index % channelColors.length],
                          }}
                        />
                        <span className="font-medium">{row.channel}</span>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">
                          {row.sessions.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <KpiCard
          label="Engaged Sessions"
          value={totals.engagedSessions.toLocaleString()}
        />

        <KpiCard
          label="Avg Engagement Time"
          value={`${Math.round(averageEngagementTime)}s`}
        />

        <KpiCard
          label="Engagement Rate"
          value={`${(engagementRate * 100).toFixed(1)}%`}
        />
      </div>      

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          Engagement Rate Trend
        </h2>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredWeeklyEngagementData}>
              <XAxis
                dataKey="week"
                interval={4}
              />

              <YAxis tickFormatter={(value) => `${value}%`} />

                <Tooltip
                  formatter={(value: any) =>
                    `${Number(value).toFixed(1)}%`
                  }
                  wrapperStyle={{
                    zIndex: 9999,
                  }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    opacity: 1,
                  }}
                />

              <Legend />

              {sortedVisibleProperties.map((name: string) => (
                <Line
                  key={name}
                  type="linear"
                  dataKey={name}
                  stroke={propertyColors[name] || "#64748b"}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
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
                    <tr key={`${page.page}-${index}`} className="border-b border-slate-200">
                      <td className="py-3 pr-4 font-medium">
                        {page.property}
                      </td>
                      <td className="py-3 pr-4 max-w-xl truncate">
                        <a
                          href={page.page}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00A3E0] hover:underline"
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

            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-2 rounded bg-slate-200 disabled:opacity-50"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded ${
                      currentPage === page
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-2 rounded bg-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {searchData?.errors?.length > 0 && (
          <p className="text-sm text-[#800020] mt-4">
            Search Console data could not be loaded for:{" "}
            {searchData.errors
              .map((error: any) => error.property)
              .join(", ")}
            .
          </p>
        )}
      </div>
    </main>
  )
}