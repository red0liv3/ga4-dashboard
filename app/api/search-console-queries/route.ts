import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"
import { ga4Properties } from "../../../lib/properties"

function toSearchConsoleSiteUrl(domain: string) {
  if (domain === "solidcad.ca") {
    return "https://www.solidcad.ca/"
  }

  return `sc-domain:${domain}`
}

export async function GET() {
  const session = await getServerSession(authOptions as any)
  const accessToken = (session as any)?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not signed in or missing Google access token" },
      { status: 401 }
    )
  }

  const queries: any[] = []
  const errors: any[] = []

  for (const property of ga4Properties) {
    const siteUrl = toSearchConsoleSiteUrl(property.domain)

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
          siteUrl
        )}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: "2025-05-01",
            endDate: "2026-05-12",
            dimensions: ["query"],
            rowLimit: 100,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        errors.push({
          property: property.name,
          domain: property.domain,
          error: data,
        })

        continue
      }

      for (const row of data.rows || []) {
        queries.push({
          property: property.name,
          domain: property.domain,
          query: row.keys?.[0] || "",
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        })
      }
    } catch (error) {
      errors.push({
        property: property.name,
        domain: property.domain,
        error,
      })
    }
  }

  const totals = queries.reduce(
    (acc, query) => {
      acc.clicks += query.clicks
      acc.impressions += query.impressions
      return acc
    },
    {
      clicks: 0,
      impressions: 0,
    }
  )

  const averageCtr =
    totals.impressions > 0
      ? totals.clicks / totals.impressions
      : 0

  const averagePosition =
    queries.length > 0
      ? queries.reduce((sum, p) => sum + p.position, 0) /
        queries.length
      : 0

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    totals: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: averageCtr,
      position: averagePosition,
    },
    queries,
    errors,
  })
}