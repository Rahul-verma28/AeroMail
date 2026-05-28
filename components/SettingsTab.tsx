"use client"

import React, { useState } from "react"
import { Shield, Server, Key, CheckCircle2, RefreshCw } from "lucide-react"

export interface SMTPConfig {
  host: string
  port: string
  secure: boolean
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

export interface ResendConfig {
  apiKey: string
  fromEmail: string
  fromName: string
}

interface SettingsTabProps {
  onSave: (method: "smtp" | "resend", smtp: SMTPConfig, resend: ResendConfig) => void
  onResetQuota?: () => void
}

export default function SettingsTab({ onSave, onResetQuota }: SettingsTabProps) {
  // Lazy state initializers to prevent React 19 set-state-in-effect warnings
  const [method, setMethod] = useState<"smtp" | "resend">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aeromail_method")
      if (saved === "smtp" || saved === "resend") return saved
    }
    return "smtp"
  })

  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aeromail_smtp")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse saved SMTP", e)
        }
      }
    }
    // Default fallback values pre-configured for Gmail SMTP!
    return {
      host: "smtp.gmail.com",
      port: "465",
      secure: true,
      user: "",
      pass: "",
      fromEmail: "",
      fromName: "",
    }
  })

  const [resendConfig, setResendConfig] = useState<ResendConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aeromail_resend")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse saved Resend", e)
        }
      }
    }
    return {
      apiKey: "",
      fromEmail: "",
      fromName: "",
    }
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleSMTPChange = (key: keyof SMTPConfig, value: string | boolean) => {
    setSMTPConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleResendChange = (key: keyof ResendConfig, value: string) => {
    setResendConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem("aeromail_method", method)
    localStorage.setItem("aeromail_smtp", JSON.stringify(smtpConfig))
    localStorage.setItem("aeromail_resend", JSON.stringify(resendConfig))

    onSave(method, smtpConfig, resendConfig)

    setSaveStatus("Settings saved successfully!")
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

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
          to: method === "smtp" ? smtpConfig.user : "test@resend.dev",
          subject: "Test Connection",
          html: "<p>Test</p>",
          isTestConnection: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "Connection succeeded! Credentials verified.",
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed. Please check details.",
        })
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Network error. Failed to reach verification endpoint."
      setTestResult({
        success: false,
        message: errMsg,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Configuration & Credentials</h2>
        <p className="text-sm text-muted-foreground">
          Configure SMTP servers or Resend API key. Settings are cached securely in your local browser storage.
        </p>
      </div>

      {/* Tabs selector */}
      <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1 border border-border/40">
        <button
          onClick={() => { setMethod("smtp"); setTestResult(null); }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${method === "smtp"
            ? "bg-card text-foreground shadow-sm border border-border/30"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Server className="h-4 w-4" />
          SMTP Server (Gmail, AWS SES, etc.)
        </button>
        <button
          onClick={() => { setMethod("resend"); setTestResult(null); }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${method === "resend"
            ? "bg-card text-foreground shadow-sm border border-border/30"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <Key className="h-4 w-4" />
          Resend API Integration
        </button>
      </div>

      {/* Configuration Inputs Card */}
      <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        {method === "smtp" ? (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-md font-semibold text-foreground border-b border-border/40 pb-2">
              <Server className="h-4 w-4 text-indigo-500" />
              SMTP Settings
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SMTP Host</label>
                <input
                  type="text"
                  placeholder="e.g. smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => handleSMTPChange("host", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Port</label>
                  <input
                    type="text"
                    placeholder="e.g. 465 or 587"
                    value={smtpConfig.port}
                    onChange={(e) => handleSMTPChange("port", e.target.value)}
                    className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-1 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={smtpConfig.secure}
                      onChange={(e) => handleSMTPChange("secure", e.target.checked)}
                      className="rounded border-border bg-background text-indigo-600 focus:ring-indigo-500"
                    />
                    SSL/TLS (Secure)
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username / Email</label>
                  <span className="text-[10px] text-indigo-500 font-bold">Gmail login email</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. rahul@gmail.com"
                  value={smtpConfig.user}
                  onChange={(e) => handleSMTPChange("user", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password / App Password</label>
                  <span className="text-[10px] text-amber-500 font-bold">16-char App Password</span>
                </div>
                <input
                  type="password"
                  placeholder="e.g. vofq pdwg fboj vdzp"
                  value={smtpConfig.pass}
                  onChange={(e) => handleSMTPChange("pass", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender From Email</label>
                  <span className="text-[10px] text-muted-foreground font-bold">From header alias</span>
                </div>
                <input
                  type="email"
                  placeholder="e.g. rahul@gmail.com"
                  value={smtpConfig.fromEmail}
                  onChange={(e) => handleSMTPChange("fromEmail", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender From Name</label>
                  <span className="text-[10px] text-muted-foreground font-bold">From Name header</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Rahul Verma"
                  value={smtpConfig.fromName}
                  onChange={(e) => handleSMTPChange("fromName", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-md font-semibold text-foreground border-b border-border/40 pb-2">
              <Key className="h-4 w-4 text-purple-500" />
              Resend Integration
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resend API Key</label>
              <input
                type="password"
                placeholder="re_..."
                value={resendConfig.apiKey}
                onChange={(e) => handleResendChange("apiKey", e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender From Email</label>
                <input
                  type="email"
                  placeholder="e.g. onboard@yourdomain.com"
                  value={resendConfig.fromEmail}
                  onChange={(e) => handleResendChange("fromEmail", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sender From Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aeromail Campaign"
                  value={resendConfig.fromName}
                  onChange={(e) => handleResendChange("fromName", e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Result Message Box */}
        {testResult && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm transition-all duration-300 animate-slide-in ${testResult.success
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/20 bg-destructive/10 text-destructive-foreground"
              }`}
          >
            <Shield className="h-5 w-5 shrink-0 text-indigo-500" />
            <div>
              <p className="font-semibold">{testResult.success ? "Verification Successful" : "Verification Failed"}</p>
              <p className="mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Buttons Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            100% Client-Side Local Storage Encrypted
          </div>

          <div className="flex items-center gap-3">
            {onResetQuota && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to reset your today's sent transmissions counter back to 0?")) {
                    onResetQuota()
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/15 transition cursor-pointer"
              >
                Reset Daily Counter
              </button>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50 transition cursor-pointer"
            >
              {testing ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Server className="h-4 w-4 text-muted-foreground" />
              )}
              Test Connection
            </button>

            <button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:brightness-105 transition cursor-pointer shadow-md shadow-indigo-500/15"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {saveStatus && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
          {saveStatus}
        </div>
      )}
    </div>
  )
}
