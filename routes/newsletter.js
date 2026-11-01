const express = require("express");
const db = require("../db/database");

const router = express.Router();

// ---------- READ: all subscribers (admin) ----------
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM newsletter_subscribers ORDER BY id DESC").all();
  res.json(rows);
});

// ---------- CREATE: subscribe ----------
router.post("/", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const existing = db.prepare("SELECT * FROM newsletter_subscribers WHERE email = ?").get(email);
  if (existing) {
    return res.status(200).json({ ...existing, alreadySubscribed: true });
  }

  const info = db
    .prepare("INSERT INTO newsletter_subscribers (email) VALUES (?)")
    .run(email);
  const created = db
    .prepare("SELECT * FROM newsletter_subscribers WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(created);
});

// ---------- DELETE: unsubscribe (admin) ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM newsletter_subscribers WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Subscriber not found" });

  db.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

module.exports = router;
