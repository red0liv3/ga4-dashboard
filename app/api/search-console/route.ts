import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"
import { ga4Properties } from "../../../lib/properties"

function toSearchConsoleSiteUrl(domain: string) {
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

  const results: any[] = []
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
            rowLimit: 10,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        errors.push({
          property: property.name,
          domain: property.domain,
          siteUrl,
          error: data,
        })
        continue
      }

      results.push({
        property: property.name,
        domain: property.domain,
        siteUrl,
        rows: data.rows || [],
      })
    } catch (error) {
      errors.push({
        property: property.name,
        domain: property.domain,
        siteUrl,
        error,
      })
    }
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    results,
    errors,
  })
}