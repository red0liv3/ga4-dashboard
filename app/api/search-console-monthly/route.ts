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
  const rows: any[] = []
  const errors: any[] = []

  for (const property of ga4Properties) {
    if (!property.domain) continue

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
            startDate: "2025-04-01",
            endDate: new Date().toISOString().split("T")[0],
            dimensions: ["date"],
            rowLimit: 25000,
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
        rows.push({
          property: property.name,
          domain: property.domain,
          date: row.keys?.[0] || "",
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

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    rows,
    errors,
  })
}