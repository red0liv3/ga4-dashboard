import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"
import { ga4Properties } from "../../../lib/properties"
import { getAccessToken } from "../../../lib/googleClient"

type DashboardRow = {
  month: string
  property: string
  domain: string
  group: string
  country: string
  sessions: number
  activeUsers: number
  newUsers: number
  engagedSessions: number
  userEngagementDuration: number
  engagementRate: number
  error?: unknown
}

export async function GET() {
  const session = await getServerSession(authOptions as any)

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 }
    )
  }

  const accessToken = await getAccessToken()
  const rows: DashboardRow[] = []
  const errors: unknown[] = []

  for (const property of ga4Properties) {
    try {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property.propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: "2025-04-01", endDate: "today" }],
            dimensions: [{ name: "yearMonth" }],
            metrics: [
              { name: "sessions" },
              { name: "activeUsers" },
              { name: "newUsers" },
              { name: "engagedSessions" },
              { name: "userEngagementDuration" },
              { name: "engagementRate" },
            ],
            orderBys: [
              {
                dimension: {
                  dimensionName: "yearMonth",
                },
              },
            ],
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
          month: row.dimensionValues?.[0]?.value || "",
          property: property.name,
          domain: property.domain,
          group: property.group,
          country: property.country,
          sessions: Number(row.metricValues?.[0]?.value || 0),
          activeUsers: Number(row.metricValues?.[1]?.value || 0),
          newUsers: Number(row.metricValues?.[2]?.value || 0),
          engagedSessions: Number(row.metricValues?.[3]?.value || 0),
          userEngagementDuration: Number(row.metricValues?.[4]?.value || 0),
          engagementRate: Number(row.metricValues?.[5]?.value || 0),
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
    properties: ga4Properties,
    rows,
    errors,
  })
}