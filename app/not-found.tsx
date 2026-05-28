import React from "react"
import Link from "next/link"
import { HelpCircle, ChevronLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background font-sans text-foreground overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/5"></div>

      {/* Main Glassmorphic 404 Card */}
      <div className="mx-auto flex max-w-md w-full flex-col items-center justify-center rounded-3xl border border-border bg-card/45 p-8 text-center backdrop-blur-md shadow-2xl shadow-indigo-500/5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md animate-pulse">
          <HelpCircle className="h-8 w-8 text-white" />
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          404
        </h1>
        
        <h2 className="mt-2 text-lg font-bold text-foreground font-sans">
          Page Not Found
        </h2>
        
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          The requested page endpoint does not exist or has been relocated. Return to your dashboard to resume mailing campaigns.
        </p>

        <Link
          href="/"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/15 hover:brightness-105 transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
