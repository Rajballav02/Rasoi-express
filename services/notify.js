/* ===========================================================
   Rasoi Express — Notification Helper
   Composes the actual messages for order & contact events and
   sends them via the email (Nodemailer) and SMS (Twilio)
   services. Every call is wrapped so a notification failure
   NEVER breaks the underlying API request.
   =========================================================== */
const { sendMail } = require("./email");
const { sendSMS } = require("./sms");

const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");

function itemsListText(items) {
  return items.map((i) => `  • ${i.name} × ${i.qty} — ${rupee(i.price * i.qty)}`).join("\n");
}
function itemsListHtml(items) {
  return items
    .map((i) => `<li>${i.name} × ${i.qty} — ${rupee(i.price * i.qty)}</li>`)
    .join("");
}

/** Order placed — notify the customer (email + SMS) and the admin (email). */
async function notifyOrderPlaced(order) {
  const smsBody =
    `Rasoi Express: Thanks ${order.customer_name}! Order #${order.id} received, ` +
    `total ${rupee(order.total)} (${order.payment_method}). We'll keep you posted.`;

  const tasks = [sendSMS({ to: order.phone, body: smsBody })];

  if (order.email) {
    tasks.push(
      sendMail({
        to: order.email,
        subject: `Order #${order.id} confirmed — Rasoi Express`,
        text:
          `Hi ${order.customer_name},\n\nYour order #${order.id} has been placed.\n\n` +
          `${itemsListText(order.items)}\n\nSubtotal: ${rupee(order.subtotal)}\n` +
          `Delivery: ${order.delivery_fee ? rupee(order.delivery_fee) : "Free"}\n` +
          `Total: ${rupee(order.total)}\nPayment: ${order.payment_method}\n\n` +
          `Delivering to: ${order.address}, ${order.city} - ${order.pincode}\n\n` +
          `Thanks for ordering with Rasoi Express!`,
        html:
          `<p>Hi ${order.customer_name},</p><p>Your order <strong>#${order.id}</strong> has been placed.</p>` +
          `<ul>${itemsListHtml(order.items)}</ul>` +
          `<p>Subtotal: ${rupee(order.subtotal)}<br>` +
          `Delivery: ${order.delivery_fee ? rupee(order.delivery_fee) : "Free"}<br>` +
          `<strong>Total: ${rupee(order.total)}</strong><br>Payment: ${order.payment_method}</p>` +
          `<p>Delivering to: ${order.address}, ${order.city} - ${order.pincode}</p>` +
          `<p>Thanks for ordering with Rasoi Express! 🍛</p>`,
      })
    );
  }

  if (process.env.ADMIN_EMAIL) {
    tasks.push(
      sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: `🔔 New order #${order.id} — ${rupee(order.total)}`,
        text: `New order from ${order.customer_name} (${order.phone}).\n\n${itemsListText(order.items)}\n\nTotal: ${rupee(order.total)}`,
        html: `<p>New order from <strong>${order.customer_name}</strong> (${order.phone}).</p><ul>${itemsListHtml(order.items)}</ul><p>Total: ${rupee(order.total)}</p>`,
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** Order status changed — notify the customer (SMS, + email if we have one). */
async function notifyOrderStatusChanged(order) {
  const smsBody = `Rasoi Express: Order #${order.id} is now "${order.status}". Total ${rupee(order.total)}.`;
  const tasks = [sendSMS({ to: order.phone, body: smsBody })];

  if (order.email) {
    tasks.push(
      sendMail({
        to: order.email,
        subject: `Order #${order.id} update: ${order.status} — Rasoi Express`,
        text: `Hi ${order.customer_name}, your order #${order.id} is now "${order.status}".`,
        html: `<p>Hi ${order.customer_name}, your order <strong>#${order.id}</strong> is now <strong>${order.status}</strong>.</p>`,
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** New contact-form message — notify the admin by email. */
async function notifyContactMessage(msg) {
  if (!process.env.ADMIN_EMAIL) return;
  await sendMail({
    to: process.env.ADMIN_EMAIL,
    subject: `📩 New contact message: ${msg.subject || "(no subject)"}`,
    text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`,
    html: `<p>From: <strong>${msg.name}</strong> &lt;${msg.email}&gt;</p><p>${msg.message}</p>`,
  });
}

module.exports = { notifyOrderPlaced, notifyOrderStatusChanged, notifyContactMessage };
