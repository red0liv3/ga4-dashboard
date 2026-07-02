import { NextResponse } from "next/server"
import { ga4Properties } from "../../../lib/properties"
import { getAccessToken } from "../../../lib/googleClient"

export async function GET() {
  const accessToken = await getAccessToken()
  const rows: any[] = []
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
            dateRanges: [
              {
                startDate: "365daysAgo",
                endDate: "today",
              },
            ],
            dimensions: [
              {
                name: "userAgeBracket",
              },
            ],
            metrics: [
              {
                name: "activeUsers",
              },
              {
                name: "engagementRate",
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
          property: property.name,
          age: row.dimensionValues?.[0]?.value,
          users: Number(
            row.metricValues?.[0]?.value || 0
          ),
          engagementRate:
            Number(
              row.metricValues?.[1]?.value || 0
            ) * 100,
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