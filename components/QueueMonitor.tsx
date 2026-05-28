"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Loader2,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Square,
  AlertCircle,
  Download,
  RotateCcw,
  Clock,
} from "lucide-react"
import { SMTPConfig, ResendConfig } from "@/components/SettingsTab"

interface Contact {
  [key: string]: string | number | boolean | undefined
}

interface Attachment {
  filename: string
  content: string
  contentType: string
  size: number
}

interface LogEntry {
  email: string
  name: string
  status: "sending" | "success" | "failed"
  error?: string
  timestamp: string
}

interface QueueMonitorProps {
  contacts: Contact[]
  subjectTemplate: string
  bodyTemplate: string
  attachments: Attachment[]
  delaySeconds: number
  method: "smtp" | "resend"
  smtpConfig: SMTPConfig | null
  resendConfig: ResendConfig | null
  onCancel: (ended: boolean) => void
  onCampaignComplete?: (report: LogEntry[]) => void
}

export default function QueueMonitor({
  contacts,
  subjectTemplate,
  bodyTemplate,
  attachments,
  delaySeconds,
  method,
  smtpConfig,
  resendConfig,
  onCancel,
  onCampaignComplete,
}: QueueMonitorProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const [logs, setLogsState] = useState<LogEntry[]>([])
  const logsRef = useRef<LogEntry[]>([])
  const [campaignEnded, setCampaignEnded] = useState(false)

  // Wrapper to keep logsRef always in sync with latest state
  const setLogs = (updateFn: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => {
    setLogsState((prev) => {
      const next = typeof updateFn === "function" ? updateFn(prev) : updateFn
      logsRef.current = next
      return next
    })
  }

  const activeWorkerRef = useRef<boolean>(false)
  const campaignStartedRef = useRef<boolean>(false)
  const isPausedRef = useRef<boolean>(false)
  const isStoppedRef = useRef<boolean>(false)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Track references in real-time to avoid closure issues in async loop
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    isStoppedRef.current = isStopped
  }, [isStopped])

  // Helper to compile placeholders
  const renderTemplate = (tmpl: string, contact: Contact) => {
    if (!contact) return tmpl
    let result = tmpl
    Object.keys(contact).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      result = result.replace(regex, String(contact[key] || ""))
    })
    return result
  }

  const getEmail = (c: Contact) => {
    const emailKey = Object.keys(c).find((k) => k.toLowerCase().includes("email")) || Object.keys(c)[0]
    return String(c[emailKey] || "").trim()
  }

  const getName = (c: Contact) => {
    const nameKey = Object.keys(c).find((k) => k.toLowerCase().includes("name")) || Object.keys(c)[1] || Object.keys(c)[0]
    return String(c[nameKey] || "").trim()
  }

  // Trigger main queue processor on mount
  useEffect(() => {
    if (campaignStartedRef.current) return // Avoid restarts on dependency updates
    campaignStartedRef.current = true
    activeWorkerRef.current = true

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const processQueue = async () => {
      let index = 0
      
      while (index < contacts.length) {
        // 1. Handle Stop State
        if (isStoppedRef.current) {
          break
        }

        // 2. Handle Pause State
        if (isPausedRef.current) {
          await sleep(500)
          continue
        }

        const currentContact = contacts[index]
        const recipientEmail = getEmail(currentContact)
        const recipientName = getName(currentContact)

        // Pre-validate email syntax before wasting network traffic
        const validateEmail = (email: string) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        }

        if (!validateEmail(recipientEmail)) {
          const skipEntry: LogEntry = {
            email: recipientEmail,
            name: recipientName,
            status: "failed",
            error: "Syntax Error: Invalid email format",
            timestamp: new Date().toLocaleTimeString(),
          }
          setLogs((prev) => [...prev, skipEntry])
          
          setTimeout(() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
            }
          }, 50)

          index++
          if (index < contacts.length && !isStoppedRef.current) {
            await sleep(100) // Small break instead of full throttle delay
          }
          continue
        }

        // Add "sending" log
        const newEntry: LogEntry = {
          email: recipientEmail,
          name: recipientName,
          status: "sending",
          timestamp: new Date().toLocaleTimeString(),
        }
        setLogs((prev) => [...prev, newEntry])
        
        setTimeout(() => {
          if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
          }
        }, 50)

        // Compile templates
        const compiledSubject = renderTemplate(subjectTemplate, currentContact)
        const compiledBody = renderTemplate(bodyTemplate, currentContact)

        try {
          const response = await fetch("/api/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              method,
              smtpConfig: method === "smtp" ? smtpConfig : undefined,
              resendConfig: method === "resend" ? resendConfig : undefined,
              to: recipientEmail,
              recipientName,
              subject: compiledSubject,
              html: compiledBody.replace(/\n/g, "<br>"), // Format paragraphs
              attachments,
            }),
          })

          const resData = await response.json()

          // Update current log to success or failure
          setLogs((prev) => {
            const updated = [...prev]
            const logIdx = updated.findIndex((l) => l.email === recipientEmail && l.status === "sending")
            if (logIdx !== -1) {
              updated[logIdx].status = resData.success ? "success" : "failed"
              if (!resData.success) {
                updated[logIdx].error = resData.error || "Sending failed"
              }
            }
            return updated
          })
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Network request failed"
          setLogs((prev) => {
            const updated = [...prev]
            const logIdx = updated.findIndex((l) => l.email === recipientEmail && l.status === "sending")
            if (logIdx !== -1) {
              updated[logIdx].status = "failed"
              updated[logIdx].error = errMsg
            }
            return updated
          })
        }

        setTimeout(() => {
          if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
          }
        }, 50)

        // 3. Throttle/Delay between emails (if not last email and not stopped)
        index++
        if (index < contacts.length && !isStoppedRef.current) {
          await sleep(delaySeconds * 1000)
        }
      }

      setCampaignEnded(true)
      activeWorkerRef.current = false

      // Trigger history save and quota update exactly once on loop exit
      if (onCampaignComplete) {
        onCampaignComplete(logsRef.current)
      }
    }

    processQueue()
  }, [contacts, subjectTemplate, bodyTemplate, attachments, delaySeconds, method, smtpConfig, resendConfig, onCampaignComplete])

  // Count summaries
  const successCount = logs.filter((l) => l.status === "success").length
  const failedCount = logs.filter((l) => l.status === "failed").length
  const totalProcessed = logs.filter((l) => l.status !== "sending").length

  const progressPercentage = contacts.length > 0 ? Math.round((totalProcessed / contacts.length) * 100) : 0

  // Export Results to CSV file
  const handleExportCSV = () => {
    const csvHeaders = "Timestamp,Name,Email,Status,Errors\n"
    const csvContent = logs
      .map(
        (l) =>
          `"${l.timestamp}","${l.name.replace(/"/g, '""')}","${l.email}","${l.status}","${(l.error || "").replace(
            /"/g,
            '""'
          )}"`
      )
      .join("\n")

    const blob = new Blob([csvHeaders + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `aeromail_campaign_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Restart failed emails queue
  const handleRetryFailed = () => {
    const failedContacts = contacts.filter((c) => {
      const email = getEmail(c)
      return logs.some((l) => l.email === email && l.status === "failed")
    })

    if (failedContacts.length === 0) return

    setCampaignEnded(false)
    setIsStopped(false)
    setIsPaused(false)
    setLogs([])
    
    // Rerun triggered because of changes in logs / dependencies
    activeWorkerRef.current = false
    campaignStartedRef.current = false
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header title */}
      <div className="flex items-center justify-between border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Campaign Transmission Center</h2>
          <p className="text-sm text-muted-foreground">
            Transmitting emails one-by-one with dynamic placeholder variables and user-controlled pacing.
          </p>
        </div>
        <button
          onClick={() => onCancel(campaignEnded)}
          className="rounded-xl border border-border bg-card/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
        >
          {campaignEnded ? "Return to Dashboard" : "Minimize to Dashboard"}
        </button>
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* PROGRESS CARD (5 COLS) */}
        <div className="md:col-span-5 rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 flex flex-col items-center justify-center space-y-6">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queue Progress</span>

          {/* SVG Circular progress loader */}
          <div className="relative flex items-center justify-center h-44 w-44">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="74"
                className="stroke-muted fill-none"
                strokeWidth="10"
              />
              <circle
                cx="88"
                cy="88"
                r="74"
                className="stroke-indigo-500 transition-all duration-500 ease-out fill-none"
                strokeWidth="10"
                strokeDasharray={464}
                strokeDashoffset={464 - (464 * progressPercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-extrabold text-foreground">{progressPercentage}%</span>
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-widest mt-1">Completed</span>
            </div>
          </div>

          {/* Queue stats widget */}
          <div className="grid grid-cols-2 gap-4 w-full border-t border-border/40 pt-4 text-center">
            <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-2">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide block">Delivered</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{successCount}</span>
            </div>
            <div className="bg-destructive/5 rounded-xl border border-destructive/10 p-2">
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wide block">Failed</span>
              <span className="text-xl font-extrabold text-destructive">{failedCount}</span>
            </div>
          </div>

          {/* Controls button groups */}
          <div className="flex items-center gap-3 w-full border-t border-border/40 pt-4">
            {!campaignEnded ? (
              <>
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
                >
                  {isPaused ? <Play className="h-4 w-4 text-emerald-500" /> : <Pause className="h-4 w-4 text-indigo-500" />}
                  {isPaused ? "Resume Queue" : "Pause Queue"}
                </button>
                <button
                  onClick={() => {
                    setIsStopped(true)
                    setCampaignEnded(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition cursor-pointer"
                >
                  <Square className="h-4 w-4" />
                  Terminate
                </button>
              </>
            ) : (
              <div className="w-full space-y-2">
                {failedCount > 0 && (
                  <button
                    onClick={handleRetryFailed}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-105 transition cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry Failed Contacts ({failedCount})
                  </button>
                )}
                
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LOGS STREAM (7 COLS) */}
        <div className="md:col-span-7 rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Activity Log Stream</span>
              
              {!campaignEnded && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold bg-muted px-2.5 py-0.5 rounded-full border border-border">
                  <Clock className="h-3 w-3 text-indigo-500" />
                  Throttle: {delaySeconds}s delay
                </span>
              )}
            </div>

            {/* Log Stream container */}
            <div
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1 font-mono text-[11px] min-h-[280px]"
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2 py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <span>Booting transmission queue worker...</span>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2 flex items-start gap-3 transition-colors ${
                      log.status === "sending"
                        ? "border-indigo-500/20 bg-indigo-500/5 text-indigo-400"
                        : log.status === "success"
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500 dark:text-emerald-400"
                        : "border-destructive/20 bg-destructive/5 text-destructive"
                    }`}
                  >
                    {log.status === "sending" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mt-0.5" />
                    ) : log.status === "success" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    )}

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="truncate max-w-[200px] title={log.name}">{log.name}</span>
                        <span className="text-[9px] opacity-60 font-medium">{log.timestamp}</span>
                      </div>
                      <div className="opacity-95 text-foreground/90 font-medium truncate">{log.email}</div>
                      
                      {log.status === "sending" && (
                        <div className="text-[9px] opacity-75 font-sans">Connecting SMTP socket...</div>
                      )}
                      
                      {log.status === "success" && (
                        <div className="text-[9px] text-emerald-500 dark:text-emerald-400 font-sans">Message delivered successfully!</div>
                      )}

                      {log.status === "failed" && log.error && (
                        <div className="text-[9px] text-destructive font-sans flex items-start gap-1 font-bold">
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>Error: {log.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
