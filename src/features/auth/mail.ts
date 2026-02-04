import { SITE_TITLE } from "@/constants/site";
import nodemailer from "nodemailer";

/**
 * Create transporter on-demand to ensure env vars are read at runtime.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailbox.org",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends a magic link email for authentication.
 * @param email - User's email address
 * @param token - Magic link token
 * @param baseUrl - The base URL (e.g., https://app.un80actions.eosg.dev) - REQUIRED
 */
export async function sendMagicLink(
  email: string,
  token: string,
  baseUrl: string,
) {
  if (!baseUrl) {
    throw new Error("baseUrl is required for sendMagicLink");
  }
  const link = `${baseUrl}/verify?token=${token}`;
  const logoUrl = `${baseUrl}/images/un-logo-stacked-colour-english.png`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP_USER and SMTP_PASS environment variables are required",
    );
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"${SITE_TITLE}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Sign in to ${SITE_TITLE}`,
    text: `${SITE_TITLE}\n\nClick here to sign in: ${link}\n\nThis link expires in 15 minutes.\n\nIf you did not request this email, you can safely ignore it.`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" style="background:#fff;padding:32px 20px;"><tr><td align="center">
<table width="100%" style="max-width:520px;">
<tr><td style="padding:0 0 24px;"><table><tr>
<td style="vertical-align:middle;padding-right:16px;"><img src="${logoUrl}" alt="UN" width="120"/></td>
<td style="vertical-align:middle;"><div style="font-size:20px;font-weight:700;">${SITE_TITLE}</div></td>
</tr></table></td></tr>
<tr><td style="border-top:1px solid #e5e7eb;padding:24px 0 0;"></td></tr>
<tr><td><p style="margin:0 0 16px;font-size:15px;color:#374151;">Click the button below to sign in. This link expires in 15 minutes.</p>
<a href="${link}" style="display:inline-block;background:#009edb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;">Sign in</a>
<p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">Or copy: <a href="${link}" style="color:#009edb;word-break:break-all;">${link}</a></p>
</td></tr>
<tr><td style="padding:24px 0 0;"><p style="margin:0;font-size:12px;color:#9ca3af;">If you did not request this email, you can safely ignore it.</p></td></tr>
</table></td></tr></table></body></html>`,
  });
}
