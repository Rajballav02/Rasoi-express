const express = require("express");
const db = require("../db/database");

const router = express.Router();

// ---------- READ: all coupons (admin) ----------
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM coupons ORDER BY created_at DESC").all();
  res.json(rows);
});

// ---------- APPLY: validate a coupon code against a subtotal (storefront) ----------
router.post("/apply", (req, res) => {
  const { code, subtotal } = req.body;
  if (!code || subtotal == null) {
    return res.status(400).json({ error: "code and subtotal are required" });
  }

  const coupon = db
    .prepare("SELECT * FROM coupons WHERE code = ? COLLATE NOCASE")
    .get(String(code).trim());

  if (!coupon || !coupon.active) {
    return res.status(404).json({ error: "Invalid or inactive coupon code" });
  }
  if (subtotal < coupon.min_order) {
    return res.status(400).json({
      error: `This code needs a minimum order of ₹${coupon.min_order}`,
    });
  }

  const discountAmount = Math.round((subtotal * coupon.discount_percent) / 100);
  res.json({
    code: coupon.code,
    discountPercent: coupon.discount_percent,
    discountAmount,
  });
});

// ---------- CREATE: add a coupon (admin) ----------
router.post("/", (req, res) => {
  const { code, discountPercent, minOrder, active } = req.body;
  if (!code || discountPercent == null) {
    return res.status(400).json({ error: "code and discountPercent are required" });
  }
  const normalized = String(code).trim().toUpperCase();
  const exists = db.prepare("SELECT 1 FROM coupons WHERE code = ?").get(normalized);
  if (exists) return res.status(409).json({ error: `Coupon '${normalized}' already exists` });

  db.prepare(
    "INSERT INTO coupons (code, discount_percent, min_order, active) VALUES (?, ?, ?, ?)"
  ).run(normalized, Number(discountPercent), Number(minOrder) || 0, active === false ? 0 : 1);

  res.status(201).json(db.prepare("SELECT * FROM coupons WHERE code = ?").get(normalized));
});

// ---------- UPDATE: edit a coupon (admin) ----------
router.put("/:code", (req, res) => {
  const existing = db.prepare("SELECT * FROM coupons WHERE code = ?").get(req.params.code);
  if (!existing) return res.status(404).json({ error: "Coupon not found" });

  const { discountPercent, minOrder, active } = req.body;
  const updated = {
    discount_percent: discountPercent ?? existing.discount_percent,
    min_order: minOrder ?? existing.min_order,
    active: active == null ? existing.active : active ? 1 : 0,
  };
  db.prepare(
    "UPDATE coupons SET discount_percent = ?, min_order = ?, active = ? WHERE code = ?"
  ).run(updated.discount_percent, updated.min_order, updated.active, req.params.code);

  res.json(db.prepare("SELECT * FROM coupons WHERE code = ?").get(req.params.code));
});

// ---------- DELETE: remove a coupon (admin) ----------
router.delete("/:code", (req, res) => {
  const existing = db.prepare("SELECT * FROM coupons WHERE code = ?").get(req.params.code);
  if (!existing) return res.status(404).json({ error: "Coupon not found" });

  db.prepare("DELETE FROM coupons WHERE code = ?").run(req.params.code);
  res.json({ deleted: true, code: req.params.code });
});

module.exports = router;
