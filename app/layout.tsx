import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { DataProvider } from "@/lib/data-context"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <DataProvider>{children}</DataProvider>
        <Toaster />
        <Analytics />
        <Script src="https://static.matterport.com/showcase-sdk/latest.js" strategy="beforeInteractive" />
      </body>
    </html>
  )
}
