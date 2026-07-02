import { GoogleAuth } from "google-auth-library"

const auth = new GoogleAuth({
  credentials: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ],
})

export async function getAccessToken() {
  const client = await auth.getClient()

  const token = await client.getAccessToken()

  if (!token.token) {
    throw new Error("Unable to obtain Google access token")
  }

  return token.token
}