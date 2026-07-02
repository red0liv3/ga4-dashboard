import { NextResponse } from "next/server"
import { getAccessToken } from "../../../lib/googleClient"

const PROPERTY_ID = "319620971"

export async function GET() {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      }),
    }
  )

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}