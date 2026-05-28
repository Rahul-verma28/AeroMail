"use client"

import React, { useState } from "react"
import { History, Download, Trash2, CheckCircle } from "lucide-react"

export interface HistoricalCampaign {
  id: string
  timestamp: string
  total: number
  successCount: number
  failedCount: number
  logs: Array<{
    email: string
    name: string
    status: "success" | "failed"
    error?: string
    timestamp: string
  }>
}

export default function HistoryTab() {
  // Lazy state initializer to load logs from localStorage cleanly without cascading render effects
  const [runs, setRuns] = useState<HistoricalCampaign[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aeromail_history")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse history log", e)
        }
      }
    }
    return []
  })

  const handleDeleteRun = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this campaign report from your history?")) {
      const updated = runs.filter((r) => r.id !== id)
      setRuns(updated)
      localStorage.setItem("aeromail_history", JSON.stringify(updated))
    }
  }

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL campaign histories? This action is irreversible.")) {
      setRuns([])
      localStorage.removeItem("aeromail_history")
    }
  }

  const handleExportCSV = (campaign: HistoricalCampaign) => {
    const csvHeaders = "Timestamp,Name,Email,Status,Errors\n"
    const csvContent = campaign.logs
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
    link.setAttribute("download", `aeromail_report_run_${campaign.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Campaign Transmission Logs</h2>
          <p className="text-sm text-muted-foreground">
            Review detailed execution records and delivery metrics for all your past bulk runs.
          </p>
        </div>

        {runs.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/25 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Wipe Logs
          </button>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-20 bg-card/20 rounded-2xl border border-border border-dashed flex flex-col items-center gap-2">
          <History className="h-10 w-10 text-muted-foreground/60" />
          <span>No historical campaigns recorded yet. Launch your first queue run!</span>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const successRate = run.total > 0 ? Math.round((run.successCount / run.total) * 100) : 0

            return (
              <div
                key={run.id}
                className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 hover:border-indigo-500/20 transition-all duration-300 space-y-4"
              >
                {/* Header run stats */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border/40 pb-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold tracking-wider block">LAUNCH DATE</span>
                    <span className="text-xs font-extrabold text-foreground">{run.timestamp}</span>
                  </div>

                  <div className="flex gap-4 text-xs font-semibold text-foreground">
                    <div className="text-center">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Total Recipients</span>
                      <span className="text-sm font-extrabold">{run.total}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Delivered</span>
                      <span className="text-sm font-extrabold text-emerald-500">{run.successCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Failed</span>
                      <span className="text-sm font-extrabold text-destructive">{run.failedCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Success Rate</span>
                      <span className="text-sm font-extrabold text-indigo-500">{successRate}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV(run)}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-muted transition cursor-pointer"
                      title="Download Campaign Report"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleDeleteRun(run.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition"
                      title="Delete Campaign History"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* mini logs collapsed grid */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block pb-1">Sample Log Details</span>
                  {run.logs.slice(0, 5).map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs font-mono py-1 border-b border-border/20"
                    >
                      <span className="truncate max-w-[200px] text-foreground font-medium">{log.name} &lt;{log.email}&gt;</span>
                      <div className="flex items-center gap-1.5">
                        {log.status === "success" ? (
                          <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-sans font-bold">
                            <CheckCircle className="h-3 w-3" /> Delivered
                          </span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1 text-[10px] font-sans font-bold" title={log.error}>
                            <History className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {run.logs.length > 5 && (
                    <div className="text-center text-[10px] text-muted-foreground font-medium pt-1">
                      ...and {run.logs.length - 5} more records. Export CSV to download the complete transmission ledger.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
