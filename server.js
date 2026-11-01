/* ===========================================================
   Rasoi Express — Server (Express + SQLite)
   Serves the static frontend and exposes a CRUD REST API
   backed by a real SQLite database, with email (Nodemailer)
   and SMS (Twilio) notifications on orders/contact messages.
   =========================================================== */
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const categoriesRouter = require("./routes/categories");
const menuItemsRouter = require("./routes/menuItems");
const ordersRouter = require("./routes/orders");
const contactRouter = require("./routes/contact");
const newsletterRouter = require("./routes/newsletter");
const reviewsRouter = require("./routes/reviews");
const couponsRouter = require("./routes/coupons");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- API routes (CRUD) ----------
app.use("/api/categories", categoriesRouter);
app.use("/api/menu-items", menuItemsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/coupons", couponsRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ---------- Static frontend ----------
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Rasoi Express running → http://localhost:${PORT}`);
  console.log(`Admin panel          → http://localhost:${PORT}/admin.html`);

  const emailReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const smsReady = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  console.log(`Email (Nodemailer)   → ${emailReady ? "configured ✅" : "NOT configured — see .env.example (will log to console)"}`);
  console.log(`SMS (Twilio)         → ${smsReady ? "configured ✅" : "NOT configured — see .env.example (will log to console)"}`);
});
