/* ===========================================================
   Rasoi Express — SMS Service (Twilio)
   Reads credentials from environment variables (.env).
   If no Twilio credentials are configured, SMS messages are
   simply logged to the console instead of failing — so the
   app keeps working out of the box, and you can plug in real
   credentials whenever you're ready.
   =========================================================== */
let client = null;
let triedInit = false;

function getClient() {
  if (triedInit) return client;
  triedInit = true;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn(
      "[sms] Twilio not configured (see .env.example) — SMS will be printed to the console instead of actually sent."
    );
    return null;
  }

  const twilio = require("twilio");
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

/** Normalize a 10-digit Indian number (or any number) to E.164 format. */
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (phone.startsWith("+")) return phone;
  const countryCode = process.env.SMS_COUNTRY_CODE || "+91";
  return `${countryCode}${digits}`;
}

/**
 * Send an SMS. Never throws — logs and resolves with
 * { simulated: true } if sending isn't configured or fails,
 * so a failed notification never breaks the API response.
 */
async function sendSMS({ to, body }) {
  const c = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!c || !from) {
    console.log(`\n📱 [DEV SMS — not actually sent]\nTo: ${to}\n${body}\n`);
    return { simulated: true };
  }

  try {
    const msg = await c.messages.create({ to: toE164(to), from, body });
    console.log(`[sms] Sent to ${to} — sid: ${msg.sid}`);
    return msg;
  } catch (err) {
    console.error(`[sms] Failed to send to ${to}:`, err.message);
    return { simulated: true, error: err.message };
  }
}

module.exports = { sendSMS };
