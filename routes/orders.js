const express = require("express");
const db = require("../db/database");
const { notifyOrderPlaced, notifyOrderStatusChanged } = require("../services/notify");

const router = express.Router();

const VALID_STATUSES = ["Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

function rowToOrder(row) {
  return { ...row, items: JSON.parse(row.items) };
}

// ---------- READ: all orders (admin) — supports ?status= ----------
router.get("/", (req, res) => {
  const { status } = req.query;
  let sql = "SELECT * FROM orders";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY id DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToOrder));
});

// ---------- READ: public order tracking (requires order id + phone match) ----------
// Placed above "/:id" so the literal "/track" path isn't swallowed by the :id param.
router.get("/track/:id", (req, res) => {
  const { phone } = req.query;
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row || !phone || row.phone.replace(/\D/g, "") !== String(phone).replace(/\D/g, "")) {
    return res.status(404).json({ error: "No order found with that Order ID and phone number" });
  }
  res.json(rowToOrder(row));
});

// ---------- READ: one order (used right after checkout for the confirmation screen) ----------
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Order not found" });
  res.json(rowToOrder(row));
});

// ---------- CREATE: place a new order (checkout) ----------
router.post("/", async (req, res) => {
  const {
    customerName,
    phone,
    email,
    address,
    city,
    pincode,
    paymentMethod,
    items,
    subtotal,
    deliveryFee,
    total,
  } = req.body;

  if (!customerName || !phone || !address || !city || !pincode) {
    return res.status(400).json({ error: "Delivery details are incomplete" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  if (subtotal == null || total == null) {
    return res.status(400).json({ error: "Order totals are missing" });
  }

  const info = db
    .prepare(
      `INSERT INTO orders
       (customer_name, phone, email, address, city, pincode, payment_method, items, subtotal, delivery_fee, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
    )
    .run(
      customerName,
      phone,
      email || "",
      address,
      city,
      pincode,
      paymentMethod || "COD",
      JSON.stringify(items),
      subtotal,
      deliveryFee || 0,
      total
    );

  const created = db.prepare("SELECT * FROM orders WHERE id = ?").get(info.lastInsertRowid);
  const order = rowToOrder(created);

  res.status(201).json(order);

  // Fire notifications AFTER responding, so a slow/failing SMTP or SMS
  // provider never delays or breaks the checkout response.
  notifyOrderPlaced(order).catch((err) => console.error("[notify] order placed failed:", err.message));
});

// ---------- UPDATE: change order status (admin) ----------
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });

  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  const order = rowToOrder(row);

  res.json(order);

  notifyOrderStatusChanged(order).catch((err) =>
    console.error("[notify] order status change failed:", err.message)
  );
});

// ---------- DELETE: remove an order record (admin) ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });

  db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

module.exports = router;
