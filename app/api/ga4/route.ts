import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"

const PROPERTY_ID = "319620971"

export async function GET() {
  const session = await getServerSession(authOptions as any)
  const accessToken = (session as any)?.accessToken

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not signed in or missing Google access token", session },
      { status: 401 }
    )
  }

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