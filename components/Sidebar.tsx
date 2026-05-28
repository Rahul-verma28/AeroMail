"use client"

import React from "react"
import { Mail, Send, Settings, History, FileText, Sun, Moon, X } from "lucide-react"
import { useTheme } from "next-themes"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { theme, setTheme } = useTheme()

  const navItems = [
    { id: "campaign", label: "Campaigns", icon: Send },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "history", label: "History & Logs", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300 animate-fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/95 backdrop-blur-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:bg-card/40 lg:backdrop-blur-md ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between gap-2 px-6 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold tracking-wide text-foreground">
                Aeromail
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-1 uppercase tracking-wider">
                Enterprise Mailer
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 hover:bg-muted text-foreground lg:hidden transition cursor-pointer"
            title="Close Menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (onClose) onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer Details */}
      <div className="border-t border-border/60 p-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2 border border-border/20">
          <span className="text-xs text-muted-foreground pl-2 font-medium">Theme Mode</span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card hover:bg-muted text-foreground transition-all duration-200"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500 animate-spin-slow" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500" />
            )}
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
