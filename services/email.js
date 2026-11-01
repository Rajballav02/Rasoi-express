/* ===========================================================
   Rasoi Express — Email Service (Nodemailer)
   Reads SMTP settings from environment variables (.env).
   If no SMTP credentials are configured, emails are simply
   logged to the console instead of failing — so the app keeps
   working out of the box, and you can plug in real credentials
   whenever you're ready.
   =========================================================== */
const nodemailer = require("nodemailer");

let transporter = null;
let triedInit = false;

function getTransporter() {
  if (triedInit) return transporter;
  triedInit = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[email] SMTP not configured (see .env.example) — emails will be printed to the console instead of actually sent."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true", // true for port 465, false for 587/25
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Send an email. Never throws — logs and resolves with
 * { simulated: true } if sending isn't configured or fails,
 * so a failed notification never breaks the API response.
 */
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "Rasoi Express <no-reply@rasoiexpress.in>";

  if (!t) {
    console.log(`\n📧 [DEV EMAIL — not actually sent]\nTo: ${to}\nSubject: ${subject}\n${text || html}\n`);
    return { simulated: true };
  }

  try {
    const info = await t.sendMail({ from, to, subject, html, text });
    console.log(`[email] Sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message);
    return { simulated: true, error: err.message };
  }
}

module.exports = { sendMail };
