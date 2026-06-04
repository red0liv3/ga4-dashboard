import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"
import { ga4Properties } from "../../../lib/properties"

export async function GET() {
  const session = await getServerSession(authOptions as any)
  const accessToken = (session as any)?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing auth" },
      { status: 401 }
    )
  }

  const rows: any[] = []
  const errors: any[] = []

  for (const property of ga4Properties) {
    if (!property.domain) continue

    const siteUrl =
      property.domain === "solidcad.ca"
        ? "https://www.solidcad.ca/"
        : `sc-domain:${property.domain}`

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
            endDate: new Date()
              .toISOString()
              .split("T")[0],

            dimensions: ["date"],

            rowLimit: 25000,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        errors.push({
          property: property.name,
          error: data,
        })

        continue
      }

      for (const row of data.rows || []) {
        rows.push({
          property: property.name,
          date: row.keys[0],
          clicks: row.clicks || 0,
        })
      }
    } catch (error) {
      errors.push({
        property: property.name,
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