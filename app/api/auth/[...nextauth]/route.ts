import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { allowedUsers } from "@/config/allowedUsers"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
  "openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: { 
    async signIn({ profile }: any) {
      return allowedUsers
        .map(email => email.toLowerCase())
        .includes(profile?.email?.toLowerCase())
    },
    async jwt({ token, account }: any) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      ;(session as any).accessToken = token.accessToken
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }