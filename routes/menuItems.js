const express = require("express");
const db = require("../db/database");

const router = express.Router();

function rowToItem(row) {
  return { ...row, veg: !!row.veg };
}

// ---------- READ: all (supports ?category= & ?search=) ----------
router.get("/", (req, res) => {
  const { category, search } = req.query;
  let sql = "SELECT * FROM menu_items WHERE 1=1";
  const params = [];

  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND LOWER(name) LIKE ?";
    params.push(`%${search.toLowerCase()}%`);
  }
  sql += " ORDER BY id ASC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToItem));
});

// ---------- READ: one ----------
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Menu item not found" });
  res.json(rowToItem(row));
});

// ---------- CREATE ----------
router.post("/", (req, res) => {
  const { name, category, veg, price, rating, desc } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ error: "name, category and price are required" });
  }
  const catExists = db.prepare("SELECT 1 FROM categories WHERE id = ?").get(category);
  if (!catExists) return res.status(400).json({ error: `Unknown category '${category}'` });

  const info = db
    .prepare(
      `INSERT INTO menu_items (name, category, veg, price, rating, desc)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, category, veg ? 1 : 0, price, rating ?? 4.5, desc ?? "");

  const created = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(rowToItem(created));
});

// ---------- UPDATE ----------
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Menu item not found" });

  const { name, category, veg, price, rating, desc } = req.body;

  if (category) {
    const catExists = db.prepare("SELECT 1 FROM categories WHERE id = ?").get(category);
    if (!catExists) return res.status(400).json({ error: `Unknown category '${category}'` });
  }

  const updated = {
    name: name ?? existing.name,
    category: category ?? existing.category,
    veg: veg != null ? (veg ? 1 : 0) : existing.veg,
    price: price ?? existing.price,
    rating: rating ?? existing.rating,
    desc: desc ?? existing.desc,
  };

  db.prepare(
    `UPDATE menu_items SET name=?, category=?, veg=?, price=?, rating=?, desc=? WHERE id=?`
  ).run(updated.name, updated.category, updated.veg, updated.price, updated.rating, updated.desc, req.params.id);

  const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
  res.json(rowToItem(row));
});

// ---------- DELETE ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Menu item not found" });

  db.prepare("DELETE FROM menu_items WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

module.exports = router;
