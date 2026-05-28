"use client"

import React, { useState, useEffect } from "react"
import { FileText, Plus, Trash2, Edit3, Save, X, Sparkles, CheckCircle2 } from "lucide-react"

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

interface TemplatesTabProps {
  templates: EmailTemplate[]
  onTemplatesChange: (templates: EmailTemplate[]) => void
}

export default function TemplatesTab({ templates, onTemplatesChange }: TemplatesTabProps) {
  // Creation/Edit States
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const [toast, setToast] = useState<string | null>(null)

  const saveTemplatesToStorage = (updated: EmailTemplate[]) => {
    localStorage.setItem("aeromail_templates", JSON.stringify(updated))
    onTemplatesChange(updated)
  }

  const handleSave = () => {
    if (!name || !subject || !body) {
      alert("All fields are required to save a template.")
      return
    }

    if (editingId) {
      // Modify
      const updated = templates.map((t) =>
        t.id === editingId ? { ...t, name, subject, body } : t
      )
      saveTemplatesToStorage(updated)
      setToast("Template modified successfully!")
    } else {
      // Create new: Fully pure deterministic ID generator to prevent Date.now() impurity warnings!
      const pureId = name.replace(/\s+/g, "-").toLowerCase() + "-" + templates.length
      const newTmpl: EmailTemplate = {
        id: pureId,
        name,
        subject,
        body,
      }
      const updated = [newTmpl, ...templates]
      saveTemplatesToStorage(updated)
      setToast("Template created successfully!")
    }

    resetForm()
    setTimeout(() => setToast(null), 3000)
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingId(null)
    setName("")
    setSubject("")
    setBody("")
  }

  const handleEdit = (tmpl: EmailTemplate) => {
    setEditingId(tmpl.id)
    setName(tmpl.name)
    setSubject(tmpl.subject)
    setBody(tmpl.body)
    setIsEditing(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updated = templates.filter((t) => t.id !== id)
      saveTemplatesToStorage(updated)
      setToast("Template removed.")
      setTimeout(() => setToast(null), 3000)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Email Template Library</h2>
          <p className="text-sm text-muted-foreground">
            Save and reuse your custom subjects and dynamic email compositions.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        )}
      </div>

      {isEditing ? (
        /* TEMPLATE COMPOSER EDITOR */
        <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 space-y-4 animate-slide-in">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h3 className="flex items-center gap-2 text-md font-bold text-foreground">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              {editingId ? "Modify Existing Template" : "Draft New Template"}
            </h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Template Name</label>
              <input
                type="text"
                placeholder="e.g. Outreach Campaign - Round 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Subject</label>
              <input
                type="text"
                placeholder="e.g. Hello {{Name}}!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Body Content</label>
              <textarea
                rows={10}
                placeholder="Write your email body here... Supports inline dynamic variables like {{Name}} or {{Company}}."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border/40 pt-4 mt-6">
            <button
              onClick={resetForm}
              className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105 transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Template
            </button>
          </div>
        </div>
      ) : (
        /* TEMPLATES LIST GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.length === 0 ? (
            <div className="md:col-span-2 text-center text-sm text-muted-foreground py-20 bg-card/20 rounded-2xl border border-border border-dashed flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
              <span>Your library is empty. Click &apos;Create Template&apos; above.</span>
            </div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-border/40 pb-2">
                    <h3 className="font-bold text-foreground truncate max-w-[240px] text-sm" title={tmpl.name}>{tmpl.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(tmpl)}
                        className="text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 p-1 rounded-lg transition"
                        title="Edit Template"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded-lg transition"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-xs font-medium text-foreground">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Subject</span>
                      <div className="truncate bg-background/50 rounded-lg border border-border px-3 py-1.5 mt-1">{tmpl.subject}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Body Preview</span>
                      <div className="bg-background/50 rounded-lg border border-border px-3 py-2 mt-1 text-[11px] font-sans font-medium line-clamp-3 text-muted-foreground whitespace-pre-wrap">
                        {tmpl.body}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
          {toast}
        </div>
      )}
    </div>
  )
}
