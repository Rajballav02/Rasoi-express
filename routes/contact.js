const express = require("express");
const db = require("../db/database");
const { notifyContactMessage } = require("../services/notify");

const router = express.Router();

function rowToMessage(row) {
  return { ...row, isRead: !!row.is_read };
}

// ---------- READ: all messages (admin) ----------
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM contact_messages ORDER BY id DESC").all();
  res.json(rows.map(rowToMessage));
});

// ---------- CREATE: submit contact form ----------
router.post("/", (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required" });
  }

  const info = db
    .prepare(
      "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)"
    )
    .run(name, email, subject || "", message);

  const created = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(info.lastInsertRowid);
  const msg = rowToMessage(created);

  res.status(201).json(msg);

  notifyContactMessage(msg).catch((err) => console.error("[notify] contact message failed:", err.message));
});

// ---------- UPDATE: mark read/unread (admin) ----------
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Message not found" });

  const isRead = req.body.isRead != null ? (req.body.isRead ? 1 : 0) : existing.is_read;
  db.prepare("UPDATE contact_messages SET is_read = ? WHERE id = ?").run(isRead, req.params.id);
  const row = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(req.params.id);
  res.json(rowToMessage(row));
});

// ---------- DELETE (admin) ----------
router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM contact_messages WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Message not found" });

  db.prepare("DELETE FROM contact_messages WHERE id = ?").run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

module.exports = router;
