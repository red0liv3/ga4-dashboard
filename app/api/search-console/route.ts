import { NextResponse } from "next/server"
import { ga4Properties } from "../../../lib/properties"
import { getAccessToken } from "../../../lib/googleClient"

function toSearchConsoleSiteUrl(domain: string) {
  if (domain === "solidcad.ca") {
    return "https://www.solidcad.ca/"
  }

  return `sc-domain:${domain}`
}

export async function GET() {
  const accessToken = await getAccessToken()
  const pages: any[] = []
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
            dimensions: ["page"],
            rowLimit: 25,
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
        pages.push({
          property: property.name,
          domain: property.domain,
          page: row.keys?.[0] || "",
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

  const totals = pages.reduce(
    (acc, page) => {
      acc.clicks += page.clicks
      acc.impressions += page.impressions
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
    pages.length > 0
      ? pages.reduce((sum, p) => sum + p.position, 0) /
        pages.length
      : 0

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    totals: {
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: averageCtr,
      position: averagePosition,
    },
    pages,
    errors,
  })
}