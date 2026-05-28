import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

interface AttachmentPayload {
  filename: string
  content: string
  contentType: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      method,
      smtpConfig,
      resendConfig,
      to,
      subject,
      html,
      attachments,
    } = body

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Recipient email is required" },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Subject is required" },
        { status: 400 }
      )
    }

    // Support Test Connection action
    const isTestConnection = body.isTestConnection === true

    if (method === "smtp") {
      if (!smtpConfig) {
        return NextResponse.json(
          { success: false, error: "SMTP configuration is missing" },
          { status: 400 }
        )
      }

      const { host, port, secure, user, pass, fromEmail, fromName } = smtpConfig

      if (!host || !port || !user || !pass) {
        return NextResponse.json(
          { success: false, error: "Incomplete SMTP settings" },
          { status: 400 }
        )
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: secure === true, // true for 465, false for 587/25
        auth: {
          user,
          pass,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
        connectionTimeout: 8000, // 8 seconds timeout
      })

      // If we are only testing the connection, verify credentials and exit
      if (isTestConnection) {
        try {
          await transporter.verify()
          return NextResponse.json({ success: true, message: "SMTP connection verified successfully!" })
        } catch (verifyError: unknown) {
          const verifyMsg = verifyError instanceof Error ? verifyError.message : "Failed to verify SMTP credentials"
          console.error("SMTP Verification Error:", verifyError)
          return NextResponse.json(
            { success: false, error: verifyMsg },
            { status: 500 }
          )
        }
      }

      const mailOptions = {
        from: fromEmail ? `"${fromName || "Aeromail"}" <${fromEmail}>` : user,
        to,
        subject,
        html,
        attachments: attachments
          ? attachments.map((att: AttachmentPayload) => {
              const base64Data = att.content.includes("base64,")
                ? att.content.split("base64,")[1]
                : att.content
              return {
                filename: att.filename,
                content: Buffer.from(base64Data, "base64"),
                contentType: att.contentType,
              }
            })
          : [],
      }

      await transporter.sendMail(mailOptions)
      return NextResponse.json({ success: true })
    } else if (method === "resend") {
      if (!resendConfig) {
        return NextResponse.json(
          { success: false, error: "Resend configuration is missing" },
          { status: 400 }
        )
      }

      const { apiKey, fromEmail, fromName } = resendConfig

      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: "Resend API Key is required" },
          { status: 400 }
        )
      }

      // Support Test Connection action for Resend
      if (isTestConnection) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail ? `"${fromName || "Aeromail"}" <${fromEmail}>` : "onboarding@resend.dev",
              to: "test@resend.dev",
              subject: "Test Connection",
              html: "<p>Test</p>",
            }),
          })
          
          // Resend returns 403/401 for bad keys. For correct key, it might return 400 if domains are unverified, but that means the API key ITSELF is valid.
          if (res.status === 401 || res.status === 403) {
            return NextResponse.json(
              { success: false, error: "Invalid Resend API Key" },
              { status: 401 }
            )
          }

          return NextResponse.json({ success: true, message: "Resend API Key is valid!" })
        } catch (apiErr: unknown) {
          const apiMsg = apiErr instanceof Error ? apiErr.message : "Failed to verify Resend API key"
          return NextResponse.json(
            { success: false, error: apiMsg },
            { status: 500 }
          )
        }
      }

      const formattedAttachments = attachments
        ? attachments.map((att: AttachmentPayload) => {
            const base64Data = att.content.includes("base64,")
              ? att.content.split("base64,")[1]
              : att.content
            return {
              filename: att.filename,
              content: base64Data,
            }
          })
        : []

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail ? `"${fromName || "Aeromail"}" <${fromEmail}>` : "onboarding@resend.dev",
          to: [to],
          subject,
          html,
          attachments: formattedAttachments,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || `Resend API Error: ${res.statusText}`)
      }

      return NextResponse.json({ success: true, data })
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported sending method" },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to send email"
    console.error("API Send Error:", error)
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  }
}
