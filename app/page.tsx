"use client"

import React, { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import CampaignTab from "@/components/CampaignTab"
import TemplatesTab, { EmailTemplate } from "@/components/TemplatesTab"
import HistoryTab, { HistoricalCampaign } from "@/components/HistoryTab"
import SettingsTab, { SMTPConfig, ResendConfig } from "@/components/SettingsTab"
import QueueMonitor from "@/components/QueueMonitor"
import { ShieldAlert, ShieldCheck, Sparkles, Loader2, Menu } from "lucide-react"

interface Contact {
  [key: string]: string | number | boolean | undefined
  __selected: boolean
  __emailStatus?: "valid" | "invalid"
}

interface Attachment {
  filename: string
  content: string
  contentType: string
  size: number
}

interface QueuePayload {
  contacts: Contact[]
  subjectTemplate: string
  bodyTemplate: string
  attachments: Attachment[]
  delaySeconds: number
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>("campaign")
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplate[]>([])
  
  // Server-safe default values matching SSR to prevent hydration mismatches
  const [method, setMethod] = useState<"smtp" | "resend">("smtp")
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig | null>({
    host: "smtp.gmail.com",
    port: "465",
    secure: true,
    user: "",
    pass: "",
    fromEmail: "",
    fromName: "",
  })
  const [resendConfig, setResendConfig] = useState<ResendConfig | null>(null)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const [sentCount, setSentCount] = useState<number>(0)

  // Load configuration and templates from localStorage securely on mount
  useEffect(() => {
    const savedMethod = localStorage.getItem("aeromail_method")
    const m = (savedMethod === "smtp" || savedMethod === "resend") ? savedMethod : "smtp"
    setMethod(m)

    const savedSMTP = localStorage.getItem("aeromail_smtp")
    let smtpVal = smtpConfig
    if (savedSMTP) {
      try {
        const parsed = JSON.parse(savedSMTP)
        setSMTPConfig(parsed)
        smtpVal = parsed
      } catch {
        console.error("Failed to parse saved SMTP in root")
      }
    }

    const savedResend = localStorage.getItem("aeromail_resend")
    let resendVal = resendConfig
    if (savedResend) {
      try {
        const parsed = JSON.parse(savedResend)
        setResendConfig(parsed)
        resendVal = parsed
      } catch {
        console.error("Failed to parse saved Resend in root")
      }
    }

    if (m === "smtp" && smtpVal) {
      setIsConfigured(!!(smtpVal.host && smtpVal.user))
    } else if (m === "resend" && resendVal) {
      setIsConfigured(!!resendVal.apiKey)
    }

    // Load templates
    const defaultTemplates: EmailTemplate[] = [
      {
        id: "job-application",
        name: "Job Application - Software Engineer / MERN Developer",
        subject: "Application for Software Engineer Position - Rahul Verma",
        body: "Hello {{Name}},\n\nI am Rahul Verma, currently working as a Junior Software Engineer (MERN Stack) at PC Solutions.\n\nI have hands-on experience in Full Stack Development with technologies like React.js, Next.js, Node.js, Express.js, MongoDB, SQL, Docker, AWS EC2, CI/CD workflows, authentication systems, and scalable production deployments.\n\nI’m currently exploring Full Stack / MERN / Backend opportunities and have attached my resume for your consideration.\n\nIf my profile aligns with any current or upcoming opportunities in your team or network at {{Company}}, I would genuinely appreciate your consideration.\n\nThanks & Regards,\nRahul Verma\n9956298858",
      },
      {
        id: "job-follow-up",
        name: "Job Application Follow-Up",
        subject: "Following Up: Application for Software Engineer Role - Rahul Verma",
        body: "Hello {{Name}},\n\nI hope you're having a great week.\n\nI'm writing to briefly follow up on the application I submitted for the Software Engineer / MERN Stack position. I remain highly enthusiastic about the opportunity to contribute to {{Company}}'s engineering team.\n\nWith my background in full-stack MERN development, building production Next.js apps, AWS cloud infrastructure, and CI/CD pipelines at PC Solutions, I am confident I can bring immediate value to your current projects.\n\nI have re-attached my resume here for your convenience. Please let me know if there are any other details or reference materials I can provide.\n\nThank you so much for your time and consideration.\n\nWarm regards,\nRahul Verma\n9956298858",
      },
    ]

    const savedTemplatesData = localStorage.getItem("aeromail_templates")
    if (savedTemplatesData) {
      try {
        const parsed = JSON.parse(savedTemplatesData) as EmailTemplate[]
        let updated = [...parsed]
        const hasJobTmpl = parsed.some((t) => t.id === "job-application")
        const hasFollowUpTmpl = parsed.some((t) => t.id === "job-follow-up")
        
        let modified = false
        if (!hasJobTmpl) {
          updated.push(defaultTemplates[0])
          modified = true
        }
        if (!hasFollowUpTmpl) {
          updated = updated.filter((t) => t.id !== "follow-up-2" && t.id !== "job-follow-up")
          updated.push(defaultTemplates[1])
          modified = true
        }
        
        if (modified) {
          localStorage.setItem("aeromail_templates", JSON.stringify(updated))
        }
        setSavedTemplates(updated)
      } catch (e) {
        console.error("Failed to parse templates", e)
        setSavedTemplates(defaultTemplates)
      }
    } else {
      localStorage.setItem("aeromail_templates", JSON.stringify(defaultTemplates))
      setSavedTemplates(defaultTemplates)
    }

    // Load sent quota tracker from localStorage securely on mount
    const todayStr = new Date().toISOString().split("T")[0]
    const storedSent = localStorage.getItem("aeromail_sent_tracker")
    if (storedSent) {
      try {
        const parsed = JSON.parse(storedSent)
        if (parsed.date === todayStr) {
          setSentCount(parsed.count || 0)
        } else {
          localStorage.setItem("aeromail_sent_tracker", JSON.stringify({ date: todayStr, count: 0 }))
          setSentCount(0)
        }
      } catch {
        localStorage.setItem("aeromail_sent_tracker", JSON.stringify({ date: todayStr, count: 0 }))
      }
    } else {
      localStorage.setItem("aeromail_sent_tracker", JSON.stringify({ date: todayStr, count: 0 }))
    }

    setMounted(true)
  }, [])

  // Queue Monitor launch state
  const [isQueueRunning, setIsQueueRunning] = useState(false)
  const [queuePayload, setQueuePayload] = useState<QueuePayload | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Sync settings when modified
  const handleSettingsSave = (
    newMethod: "smtp" | "resend",
    newSMTP: SMTPConfig,
    newResend: ResendConfig
  ) => {
    setMethod(newMethod)
    setSMTPConfig(newSMTP)
    setResendConfig(newResend)

    if (newMethod === "smtp" && newSMTP.host && newSMTP.user) {
      setIsConfigured(true)
    } else if (newMethod === "resend" && newResend.apiKey) {
      setIsConfigured(true)
    } else {
      setIsConfigured(false)
    }
  }

  const getDailyLimit = () => {
    if (method === "resend") return 100
    if (method === "smtp" && smtpConfig?.host?.toLowerCase()?.includes("gmail")) return 500
    return 1000
  }
  const dailyLimit = getDailyLimit()

  // Handle completed campaigns and append to local ledger
  const handleCampaignComplete = (runLogs: Array<{ email: string; name: string; status: "sending" | "success" | "failed"; error?: string; timestamp: string }>) => {
    const successCount = runLogs.filter((l) => l.status === "success").length
    const failedCount = runLogs.filter((l) => l.status === "failed").length

    const mappedLogs = runLogs.map((l) => ({
      email: l.email,
      name: l.name,
      status: (l.status === "sending" ? "failed" : l.status) as "success" | "failed",
      error: l.error,
      timestamp: l.timestamp,
    }))

    const newCampaign: HistoricalCampaign = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      total: runLogs.length,
      successCount,
      failedCount,
      logs: mappedLogs,
    }

    const savedHistory = localStorage.getItem("aeromail_history")
    let currentHistory: HistoricalCampaign[] = []
    
    if (savedHistory) {
      try {
        currentHistory = JSON.parse(savedHistory)
      } catch {
        console.error("Failed to parse history log")
      }
    }

    const updatedHistory = [newCampaign, ...currentHistory]
    localStorage.setItem("aeromail_history", JSON.stringify(updatedHistory))

    // Update Sent Quota Tracker
    if (successCount > 0) {
      const todayStr = new Date().toISOString().split("T")[0]
      const nextCount = sentCount + successCount
      setSentCount(nextCount)
      localStorage.setItem("aeromail_sent_tracker", JSON.stringify({ date: todayStr, count: nextCount }))
    }
  }

  const launchCampaign = (payload: QueuePayload) => {
    if (!isConfigured) {
      alert("Credentials configuration is incomplete. Please configure your SMTP server or Resend API key first.")
      setActiveTab("settings")
      return
    }

    const campaignSize = payload.contacts.length
    const remainingQuota = dailyLimit - sentCount

    if (remainingQuota <= 0) {
      alert(`Daily transmission quota exceeded! You have already sent ${sentCount} / ${dailyLimit} emails today. Please wait until tomorrow or upgrade SMTP provider details to send more.`)
      return
    }

    if (campaignSize > remainingQuota) {
      const proceed = confirm(
        `Warning: This campaign contains ${campaignSize} recipients, but your remaining daily quota is only ${remainingQuota} (Today: ${sentCount} / ${dailyLimit} sent).\n\nLaunching this campaign may cause your email provider to block or fail subsequent messages once the limit is hit.\n\nDo you want to proceed anyway?`
      )
      if (!proceed) return
    }

    setQueuePayload(payload)
    setIsQueueRunning(true)
    setIsMinimized(false)
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-all duration-300">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/5"></div>

      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Layout container */}
      <main className="pl-0 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <h1 className="sr-only">Aeromail - Enterprise Bulk Dynamic Email Platform</h1>
        
        {/* TOP STATUS NAVIGATION BAR */}
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-background/30 px-4 lg:px-8 backdrop-blur-md sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted lg:hidden transition cursor-pointer animate-fade-in"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/30 px-3 py-1.5 rounded-full select-none">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              Bulk Dynamic Placement System Active
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mounted && (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/30 px-3.5 py-1.5 rounded-full select-none">
                <span className={`h-2 w-2 rounded-full ${sentCount >= dailyLimit ? "bg-destructive animate-pulse" : "bg-indigo-500 animate-pulse"}`} />
                <span>Today: {sentCount} / {dailyLimit} Sent</span>
              </div>
            )}

            {!mounted ? (
              <div className="h-8 w-44 animate-pulse rounded-full bg-muted/40 border border-border/30" />
            ) : isConfigured ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                {method === "smtp" ? "SMTP Active Connection" : "Resend API Active"}
              </div>
            ) : (
              <div
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/15 transition cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Action Required: Settings Empty
              </div>
            )}
          </div>
        </header>

        {/* ACTIVE PANEL TABS CONTENT */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {!mounted ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
              <div className="h-16 w-16 rounded-2xl overflow-hidden border border-border bg-muted/40 shadow-xl p-0.5 animate-bounce-slow">
                <img src="/logo.png" alt="Aeromail Logo" className="h-full w-full object-cover" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Initializing secure environment...</p>
            </div>
          ) : (
            <>
              {/* Keep QueueMonitor mounted when running so it doesn't lose execution state! */}
              {isQueueRunning && queuePayload && (
                <div className={(activeTab === "campaign" && !isMinimized) ? "" : "hidden"}>
                  <QueueMonitor
                    contacts={queuePayload.contacts}
                    subjectTemplate={queuePayload.subjectTemplate}
                    bodyTemplate={queuePayload.bodyTemplate}
                    attachments={queuePayload.attachments}
                    delaySeconds={queuePayload.delaySeconds}
                    method={method}
                    smtpConfig={smtpConfig}
                    resendConfig={resendConfig}
                    onCancel={(ended) => {
                      if (ended) {
                        setIsQueueRunning(false)
                        setQueuePayload(null)
                        setIsMinimized(false)
                      } else {
                        setIsMinimized(true)
                      }
                    }}
                    onCampaignComplete={handleCampaignComplete}
                  />
                </div>
              )}

              {activeTab === "campaign" && (!isQueueRunning || !queuePayload || isMinimized) && (
                <CampaignTab
                  onLaunch={launchCampaign}
                  savedTemplates={savedTemplates}
                />
              )}

              {activeTab === "templates" && (
                <TemplatesTab templates={savedTemplates} onTemplatesChange={setSavedTemplates} />
              )}

              {activeTab === "history" && <HistoryTab />}

              {activeTab === "settings" && (
                <SettingsTab
                  onSave={handleSettingsSave}
                  onResetQuota={() => {
                    setSentCount(0)
                    const todayStr = new Date().toISOString().split("T")[0]
                    localStorage.setItem("aeromail_sent_tracker", JSON.stringify({ date: todayStr, count: 0 }))
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating Minimized Queue Monitor Widget */}
      {isQueueRunning && isMinimized && queuePayload && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border border-border bg-card/85 p-4 backdrop-blur-lg shadow-2xl shadow-indigo-500/10 animate-slide-in max-w-sm border-indigo-500/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate">Mailing campaign active</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Processing list in background...
            </p>
          </div>
          <button
            onClick={() => {
              setIsMinimized(false)
              setActiveTab("campaign")
            }}
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-500 transition cursor-pointer shrink-0 animate-pulse"
          >
            View Monitor
          </button>
        </div>
      )}
    </div>
  )
}
