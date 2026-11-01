const express = require("express");
const db = require("../db/database");

const router = express.Router();

// ---------- READ: all categories ----------
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY rowid ASC").all();
  res.json(rows);
});

// ---------- READ: one category ----------
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Category not found" });
  res.json(row);
});

// ---------- CREATE ----------
router.post("/", (req, res) => {
  const { id, name, icon } = req.body;
  if (!id || !name || !icon) {
    return res.status(400).json({ error: "id, name and icon are required" });
  }
  const exists = db.prepare("SELECT 1 FROM categories WHERE id = ?").get(id);
  if (exists) return res.status(409).json({ error: `Category '${id}' already exists` });

  db.prepare("INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)").run(id, name, icon);
  res.status(201).json({ id, name, icon });
});

// ---------- UPDATE ----------
router.put("/:id", (req, res) => {
  const { name, icon } = req.body;
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const updated = {
    name: name ?? existing.name,
    icon: icon ?? existing.icon,
  };
  db.prepare("UPDATE categories SET name = ?, icon = ? WHERE id = ?").run(
    updated.name,
    updated.icon,
    req.params.id
  );
  res.json({ id: req.params.id, ...updated });
});

// ---------- DELETE ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Category not found" });

  const inUse = db.prepare("SELECT COUNT(*) AS n FROM menu_items WHERE category = ?").get(req.params.id).n;
  if (inUse > 0) {
    return res.status(409).json({ error: `Cannot delete: ${inUse} menu item(s) still use this category` });
  }

  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

module.exports = router;
