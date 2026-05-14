import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"
import { ga4Properties } from "../../../lib/properties"

export async function GET() {
  const session = await getServerSession(authOptions as any)
  const accessToken = (session as any)?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not signed in or missing Google access token" },
      { status: 401 }
    )
  }

  const channels: Record<string, number> = {}
  const errors: any[] = []

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
            dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
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
        const channel = row.dimensionValues?.[0]?.value || "Unknown"
        const sessions = Number(row.metricValues?.[0]?.value || 0)

        channels[channel] = (channels[channel] || 0) + sessions
      }
    } catch (error) {
      errors.push({
        property: property.name,
        error,
      })
    }
  }

  const rows = Object.entries(channels)
    .map(([channel, sessions]) => ({
      channel,
      sessions,
    }))
    .sort((a, b) => b.sessions - a.sessions)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    rows,
    errors,
  })
}