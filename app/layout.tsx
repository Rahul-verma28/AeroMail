import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Aeromail - Enterprise Bulk Dynamic Email Platform",
  description: "Secure client-side bulk email sender featuring dynamic CSV/XLSX template merging, Nodemailer SMTP and Resend integration, dynamic attachments, and real-time paced queue logs.",
  applicationName: "Aeromail",
  keywords: ["email marketing", "bulk email", "cold outreach", "nodemailer client", "resend client", "dynamic email template", "CSV email sender", "MERN Developer Job application tool"],
  authors: [{ name: "Rahul Verma" }],
  creator: "Rahul Verma",
  publisher: "Aeromail",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aeromail.madebyrahul.live",
    title: "Aeromail - Secure Bulk Email Platform",
    description: "Optimized Next.js client for cold outreach email campaigns. Merges local data and dynamic placeholders completely client-side.",
    siteName: "Aeromail",
    images: [
      {
        url: "https://aeromail.madebyrahul.live/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aeromail Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aeromail - Secure Bulk Dynamic Emailing",
    description: "Compose, preview, pace, and transmit personalized mass mailings safely via SMTP or Resend API completely inside your browser.",
    images: ["https://aeromail.madebyrahul.live/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Aeromail",
              "url": "https://aeromail.madebyrahul.live",
              "description": "Secure client-side bulk email sender featuring dynamic CSV/XLSX template merging, Nodemailer SMTP and Resend integration, dynamic attachments, and real-time paced queue logs.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "creator": {
                "@type": "Person",
                "name": "Rahul Verma"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
