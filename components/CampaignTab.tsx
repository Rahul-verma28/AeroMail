"use client"

import React, { useState, useRef } from "react"
import * as XLSX from "xlsx"
import {
  Upload,
  FileSpreadsheet,
  FileCode,
  FileUp,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Check,
  Play,
  Paperclip,
  Clock,
  Sparkles,
} from "lucide-react"

interface Contact {
  [key: string]: string | number | boolean | undefined
  __selected: boolean
  __emailStatus?: "valid" | "invalid"
}

interface Attachment {
  filename: string
  content: string // Base64 content
  contentType: string
  size: number
}

interface CampaignTabProps {
  onLaunch: (payload: {
    contacts: Contact[]
    subjectTemplate: string
    bodyTemplate: string
    attachments: Attachment[]
    delaySeconds: number
  }) => void
  savedTemplates: Array<{ id: string; name: string; subject: string; body: string }>
}

export default function CampaignTab({ onLaunch, savedTemplates }: CampaignTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  
  // Drafting Template State
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  
  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([])
  
  // Settings
  const [delaySeconds, setDelaySeconds] = useState(2)

  // CSV/Table State
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<Contact | null>(null)
  const itemsPerPage = 8

  // Interactive Live Preview State
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isPreviewMode, setIsPreviewMode] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Regex to validate emails
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Handle spreadsheet file parsing
  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const data = new Uint8Array(arrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(worksheet, { defval: "" })

        if (rawJson.length === 0) {
          alert("The uploaded file appears to be empty.")
          return
        }

        // Get headers
        const headers = Object.keys(rawJson[0]).filter((key) => !key.startsWith("__"))
        
        // Find email column candidates
        const emailCol = headers.find((h) => h.toLowerCase().includes("email")) || headers[0]

        // Map and validate rows
        const formattedContacts: Contact[] = rawJson.map((row) => {
          const emailVal = String(row[emailCol] || "").trim()
          return {
            ...row,
            __selected: true,
            __emailStatus: validateEmail(emailVal) ? "valid" : "invalid",
          }
        })

        setColumns(headers)
        setContacts(formattedContacts)
        setPreviewIndex(0)
        
        // Dynamic subject pre-fill
        if (!subject) setSubject("Hello {{Name}} - Updates from Aeromail")
        if (!body) {
          setBody(
            "Hi {{Name}},\n\nWe wanted to share some exciting news with you regarding your position as {{Title}} at {{Company}}.\n\nPlease find the attached document for more details.\n\nBest Regards,\nRahul Verma"
          )
        }
      } catch (err: unknown) {
        console.error("Failed to parse", err)
        alert("Failed to parse file. Ensure it is a valid CSV or XLSX document.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // File drop listeners
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  // Attachment upload helper
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (evt) => {
          const base64Content = evt.target?.result as string
          const newAtt: Attachment = {
            filename: file.name,
            content: base64Content,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          }
          setAttachments((prev) => [...prev, newAtt])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Placeholder parser
  const renderTemplate = (tmpl: string, contact: Contact) => {
    if (!contact) return tmpl
    let result = tmpl
    columns.forEach((col) => {
      const regex = new RegExp(`{{${col}}}`, "g")
      result = result.replace(regex, String(contact[col] || ""))
    })
    return result
  }

  // In-place table cell edits
  const startEditingRow = (index: number) => {
    setEditingRowIndex(index)
    setEditingData({ ...contacts[index] })
  }

  const saveEditingRow = (index: number) => {
    if (editingData) {
      const updatedContacts = [...contacts]
      
      // Auto-revalidate email if it changed
      const emailCol = columns.find((h) => h.toLowerCase().includes("email")) || columns[0]
      const emailVal = String(editingData[emailCol] || "").trim()
      
      // Immutability compliant state update to satisfy React 19 linter!
      const updatedData: Contact = {
        ...editingData,
        __emailStatus: (validateEmail(emailVal) ? "valid" : "invalid") as "valid" | "invalid"
      }

      updatedContacts[index] = updatedData
      setContacts(updatedContacts)
      setEditingRowIndex(null)
      setEditingData(null)
    }
  }

  const deleteRow = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index)
    setContacts(updated)
    if (previewIndex >= updated.length && updated.length > 0) {
      setPreviewIndex(updated.length - 1)
    }
  }

  const toggleRowSelect = (index: number) => {
    const updated = [...contacts]
    updated[index].__selected = !updated[index].__selected
    setContacts(updated)
  }

  const toggleAllRows = (selected: boolean) => {
    const updated = contacts.map((c) => ({ ...c, __selected: selected }))
    setContacts(updated)
  }

  const loadFromTemplate = (tmplId: string) => {
    const selected = savedTemplates.find((t) => t.id === tmplId)
    if (selected) {
      setSubject(selected.subject)
      setBody(selected.body)
    }
  }

  // Filter & Paginate contacts
  const filteredContacts = contacts.filter((c) => {
    return columns.some((col) => String(c[col] || "").toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage)
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const selectedCount = contacts.filter((c) => c.__selected).length
  const totalAttachmentsSize = attachments.reduce((acc, curr) => acc + curr.size, 0)
  const attachmentsSizeMB = (totalAttachmentsSize / (1024 * 1024)).toFixed(2)

  const handleLaunchCampaign = () => {
    const sendingContacts = contacts.filter((c) => c.__selected)
    if (sendingContacts.length === 0) {
      alert("No contacts are selected to send. Please check your contact selections.")
      return
    }
    if (!subject) {
      alert("Please specify a subject for the email.")
      return
    }
    if (!body) {
      alert("Please write a body for the email.")
      return
    }

    onLaunch({
      contacts: sendingContacts,
      subjectTemplate: subject,
      bodyTemplate: body,
      attachments,
      delaySeconds,
    })
  }

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Launch Custom Email Campaign</h2>
          <p className="text-sm text-muted-foreground">
            Draft customized dynamic placeholders, view recipient-specific live previews, and upload files.
          </p>
        </div>
        
        {contacts.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2 text-xs font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              Throttle:
              <select
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                className="bg-transparent font-bold focus:outline-none cursor-pointer border-b border-muted-foreground"
              >
                <option value={1} className="bg-card text-foreground">1 sec</option>
                <option value={2} className="bg-card text-foreground">2 sec</option>
                <option value={5} className="bg-card text-foreground">5 sec</option>
                <option value={10} className="bg-card text-foreground">10 sec</option>
                <option value={30} className="bg-card text-foreground">30 sec</option>
              </select>
            </div>
            
            <button
              onClick={handleLaunchCampaign}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5.5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/15 hover:brightness-105 transition cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Launch Campaign ({selectedCount})
            </button>
          </div>
        )}
      </div>

      {contacts.length === 0 ? (
        /* STEP 1: DROPZONE FILE UPLOADER */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex min-h-[350px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
              : "border-border hover:border-indigo-500/60 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Upload className="h-8 w-8 text-white animate-bounce-slow" />
          </div>
          <h3 className="mt-6 text-lg font-bold text-foreground">Upload your contacts mailing list</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Supports Excel (<code className="rounded bg-muted px-1">.xlsx</code>, <code className="rounded bg-muted px-1">.xls</code>) or Comma-Separated Values (<code className="rounded bg-muted px-1">.csv</code>) files.
          </p>
          <div className="mt-6 flex gap-4 text-xs font-semibold text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl border border-border/30">
            <span className="flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Excel Spreadsheet</span>
            <span className="h-3 w-px bg-border/80"></span>
            <span className="flex items-center gap-1"><FileCode className="h-3.5 w-3.5 text-blue-500" /> CSV Database</span>
          </div>
        </div>
      ) : (
        /* STEP 2: DRAFT & DATATABLE */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* LEFT: EMAIL COMPOSER PANEL (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Draft Compose Card */}
            <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="flex items-center gap-2 text-md font-bold text-foreground">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                  Email Template Composer
                </h3>
                
                {savedTemplates.length > 0 && (
                  <select
                    onChange={(e) => loadFromTemplate(e.target.value)}
                    className="rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Load Saved Template...</option>
                    {savedTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Placeholders Insert Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Click columns to insert as placeolder:</span>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        // Append to the active field
                        setBody((prev) => prev + `{{${col}}}`)
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border/85 bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-indigo-500 hover:text-white transition duration-200"
                    >
                      <Plus className="h-3 w-3" />
                      {col}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Greetings {{Name}}!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* Body Area */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Body (Rich HTML/Text)</label>
                  <span className="text-[10px] text-muted-foreground">Line breaks compile to paragraph breaks</span>
                </div>
                <textarea
                  rows={10}
                  placeholder="Draft your message body here... Support HTML as well."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-indigo-500 focus:outline-none transition font-sans"
                />
              </div>
            </div>

            {/* Attachments Card */}
            <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="flex items-center gap-2 text-md font-bold text-foreground">
                  <Paperclip className="h-4.5 w-4.5 text-blue-500" />
                  Campaign Attachments
                </h3>
                <span className={`text-xs font-semibold ${totalAttachmentsSize > 10 * 1024 * 1024 ? "text-destructive" : "text-muted-foreground"}`}>
                  {attachmentsSizeMB} MB / 10 MB Max
                </span>
              </div>

              <div className="flex items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/30 p-4">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 text-center">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Click to upload files</span>
                  <span className="text-[10px] text-muted-foreground">PDF, CSV, PNG, XLSX, ZIP etc.</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 border border-border/30 text-xs font-medium text-foreground hover:bg-muted transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[200px]" title={att.filename}>{att.filename}</span>
                        <span className="text-[10px] text-muted-foreground">({(att.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-muted-foreground hover:text-destructive transition p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: DYNAMIC PREVIEW & CONTACT MANAGER (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Split Switch for Preview / Manage */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 border border-border/40">
              <button
                onClick={() => setIsPreviewMode(true)}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isPreviewMode
                    ? "bg-card text-foreground border border-border/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Live dynamic preview
              </button>
              <button
                onClick={() => setIsPreviewMode(false)}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  !isPreviewMode
                    ? "bg-card text-foreground border border-border/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Manage database ({contacts.length})
              </button>
            </div>

            {isPreviewMode ? (
              /* PANEL A: LIVE DYNAMIC RECIPIENT PREVIEW */
              <div className="rounded-2xl border border-border bg-card/45 p-6 backdrop-blur-md shadow-lg shadow-black/5 space-y-4 flex flex-col justify-between min-h-[480px]">
                <div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dynamic Email Rendering</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/15">Live</span>
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Metadata indicators */}
                    <div className="rounded-xl bg-muted/40 p-3 border border-border/30 text-xs text-foreground space-y-1 font-medium">
                      <div>
                        <span className="text-muted-foreground">To Recipient:</span>{" "}
                        {String(contacts[previewIndex]?.Email || contacts[previewIndex]?.[columns.find(c => c.toLowerCase().includes("email")) || columns[0]] || "n/a")}
                      </div>
                      <div><span className="text-muted-foreground">Status Verification:</span> {contacts[previewIndex]?.__emailStatus === "valid" ? (
                        <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 text-[10px]">Valid Syntax</span>
                      ) : (
                        <span className="text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/15 text-[10px]">Invalid Email Address</span>
                      )}</div>
                    </div>

                    {/* Compiled Subject */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Subject Preview</span>
                      <div className="rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm font-semibold text-foreground truncate">
                        {renderTemplate(subject, contacts[previewIndex]) || <span className="text-muted-foreground italic">Subject is empty</span>}
                      </div>
                    </div>

                    {/* Compiled Body */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Body Preview</span>
                      <div className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-foreground overflow-y-auto max-h-[220px] whitespace-pre-wrap leading-relaxed min-h-[160px]">
                        {renderTemplate(body, contacts[previewIndex]) || <span className="text-muted-foreground italic">Email body is empty</span>}
                      </div>
                    </div>

                    {/* Attachments Preview inside rendering preview */}
                    {attachments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Attachments Preview ({attachments.length})</span>
                        <div className="rounded-xl border border-border bg-background/50 p-2 space-y-1 max-h-[110px] overflow-y-auto">
                          {attachments.map((att, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 border border-border/40 text-xs font-semibold text-foreground/90"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[200px]" title={att.filename}>{att.filename}</span>
                              <span className="text-[10px] text-muted-foreground font-normal ml-auto">({(att.size / 1024).toFixed(1)} KB)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scroller control footer */}
                <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-4">
                  <button
                    disabled={previewIndex === 0}
                    onClick={() => setPreviewIndex((prev) => prev - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 disabled:opacity-30 cursor-pointer transition"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" />
                  </button>
                  <span className="text-xs font-bold text-foreground">
                    Record {previewIndex + 1} of {contacts.length}
                  </span>
                  <button
                    disabled={previewIndex === contacts.length - 1}
                    onClick={() => setPreviewIndex((prev) => prev + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted hover:bg-muted/80 disabled:opacity-30 cursor-pointer transition"
                  >
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              /* PANEL B: MANAGE imported data and EDIT rows */
              <div className="rounded-2xl border border-border bg-card/45 p-5 backdrop-blur-md shadow-lg shadow-black/5 space-y-4">
                
                {/* Search Bar / Table controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <input
                    type="text"
                    placeholder="Search database..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="rounded-lg border border-border/70 bg-background/50 px-3 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none transition w-full sm:w-auto"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllRows(true)}
                      className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/15 cursor-pointer hover:bg-indigo-500/20"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => toggleAllRows(false)}
                      className="text-[10px] font-bold text-muted-foreground bg-muted/65 px-2.5 py-1 rounded-md border border-border cursor-pointer hover:bg-muted"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Table list */}
                <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                  {paginatedContacts.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">No matching records found.</div>
                  ) : (
                    paginatedContacts.map((contact) => {
                      // Retrieve actual index in global contacts array
                      const originalIndex = contacts.findIndex((c) => c === contact)
                      const isEditing = editingRowIndex === originalIndex

                      return (
                        <div
                          key={originalIndex}
                          className={`rounded-xl border p-3.5 space-y-2.5 transition duration-200 ${
                            contact.__selected
                              ? "border-indigo-500/30 bg-indigo-500/5"
                              : "border-border/60 bg-background/20 opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-foreground">
                              <input
                                type="checkbox"
                                checked={contact.__selected}
                                onChange={() => toggleRowSelect(originalIndex)}
                                className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                              />
                              Row {originalIndex + 1}
                            </label>
                            
                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveEditingRow(originalIndex)}
                                    className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded transition border border-emerald-500/20"
                                    title="Save edits"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingRowIndex(null)}
                                    className="text-muted-foreground hover:bg-muted p-1 rounded transition border border-border"
                                    title="Discard"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditingRow(originalIndex)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded transition"
                                    title="Edit fields"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteRow(originalIndex)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition"
                                    title="Delete contact"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {columns.slice(0, 4).map((col) => (
                                <div key={col} className="space-y-1">
                                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold truncate">{col}</label>
                                  <input
                                    type="text"
                                    value={editingData ? String(editingData[col]) : ""}
                                    onChange={(e) =>
                                      setEditingData((prev) =>
                                        prev ? { ...prev, [col]: e.target.value } : null
                                      )
                                    }
                                    className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-semibold text-foreground">
                              {columns.slice(0, 4).map((col) => (
                                <div key={col} className="truncate">
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{col}</span>
                                  <span title={String(contact[col])} className="truncate max-w-[150px] block mt-0.5">
                                    {String(contact[col] || "—")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Table pagination navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((c) => c - 1)}
                      className="text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted/80 disabled:opacity-40 px-2.5 py-1 rounded-md border border-border cursor-pointer transition"
                    >
                      Previous
                    </button>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((c) => c + 1)}
                      className="text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted/80 disabled:opacity-40 px-2.5 py-1 rounded-md border border-border cursor-pointer transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
