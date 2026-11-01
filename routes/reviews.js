const express = require("express");
const db = require("../db/database");

const router = express.Router();

// ---------- READ: reviews for one menu item (+ computed average) ----------
router.get("/", (req, res) => {
  const { menuItemId } = req.query;
  let rows;
  if (menuItemId) {
    rows = db
      .prepare("SELECT * FROM reviews WHERE menu_item_id = ? ORDER BY id DESC")
      .all(menuItemId);
  } else {
    rows = db.prepare("SELECT * FROM reviews ORDER BY id DESC").all();
  }
  const avg = rows.length
    ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
    : null;
  res.json({ reviews: rows, average: avg, count: rows.length });
});

// ---------- CREATE: submit a review ----------
router.post("/", (req, res) => {
  const { menuItemId, customerName, rating, comment } = req.body;

  if (!menuItemId || !customerName || !rating) {
    return res.status(400).json({ error: "menuItemId, customerName and rating are required" });
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: "rating must be an integer between 1 and 5" });
  }
  const item = db.prepare("SELECT id FROM menu_items WHERE id = ?").get(menuItemId);
  if (!item) return res.status(404).json({ error: "Menu item not found" });

  const info = db
    .prepare(
      "INSERT INTO reviews (menu_item_id, customer_name, rating, comment) VALUES (?, ?, ?, ?)"
    )
    .run(menuItemId, customerName, r, comment || "");

  const created = db.prepare("SELECT * FROM reviews WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

// ---------- DELETE: remove a review (admin moderation) ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Review not found" });

  db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

module.exports = router;
