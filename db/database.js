/* ===========================================================
   Rasoi Express â€” SQLite Database Setup
   Creates the tables (if they don't exist) and seeds them with
   the original menu data the first time the app runs.

   Uses Node.js's BUILT-IN "node:sqlite" module (DatabaseSync) â€”
   ships inside Node.js itself, so there is NO native addon to
   compile and NO prebuilt-binary lookup. This is what makes it
   work on Node.js 24 without Visual Studio / node-gyp.
   Requires Node.js >= 22.5.0 (stable/no-flag since 22.13.0 / 23.4.0).
   =========================================================== */
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "rasoi.db");
const db = new DatabaseSync(DB_PATH);

// node:sqlite has no db.pragma() helper (that was a better-sqlite3-only
// convenience method) â€” pragmas are just run as plain SQL via exec().
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    icon  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    category TEXT NOT NULL,
    veg      INTEGER NOT NULL DEFAULT 1,
    price    INTEGER NOT NULL,
    rating   REAL NOT NULL DEFAULT 4.5,
    desc     TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (category) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name   TEXT NOT NULL,
    phone           TEXT NOT NULL,
    email           TEXT NOT NULL DEFAULT '',
    address         TEXT NOT NULL,
    city            TEXT NOT NULL,
    pincode         TEXT NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'COD',
    items           TEXT NOT NULL,              -- JSON: [{id,name,price,qty}]
    subtotal        INTEGER NOT NULL,
    delivery_fee    INTEGER NOT NULL DEFAULT 0,
    total           INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'Pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL,
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id  INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    code             TEXT PRIMARY KEY,
    discount_percent INTEGER NOT NULL,
    min_order        INTEGER NOT NULL DEFAULT 0,
    active           INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------- Migration: add "email" to orders if upgrading an older DB ----------
function migrate() {
  const columns = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
  if (!columns.includes("email")) {
    db.exec("ALTER TABLE orders ADD COLUMN email TEXT NOT NULL DEFAULT ''");
    console.log("Migrated: added 'email' column to orders table.");
  }
}
migrate();

// Small helper: node:sqlite's DatabaseSync has no db.transaction(fn)
// convenience wrapper (again, a better-sqlite3-only API), so we wrap
// bulk inserts in a plain SQL transaction ourselves.
function runInTransaction(fn) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ---------- One-time seed (only if tables are empty) ----------
function seedIfEmpty() {
  const catCount = db.prepare("SELECT COUNT(*) AS n FROM categories").get().n;
  const itemCount = db.prepare("SELECT COUNT(*) AS n FROM menu_items").get().n;

  if (catCount === 0) {
    const categories = JSON.parse(
      fs.readFileSync(path.join(__dirname, "seed-categories.json"), "utf8")
    );
    const insertCat = db.prepare(
      "INSERT INTO categories (id, name, icon) VALUES (@id, @name, @icon)"
    );
    runInTransaction(() => categories.forEach((r) => insertCat.run(r)));
    console.log(`Seeded ${categories.length} categories.`);
  }

  if (itemCount === 0) {
    const items = JSON.parse(
      fs.readFileSync(path.join(__dirname, "seed-menu-items.json"), "utf8")
    );
    const insertItem = db.prepare(`
      INSERT INTO menu_items (id, name, category, veg, price, rating, desc)
      VALUES (@id, @name, @category, @veg, @price, @rating, @desc)
    `);
    runInTransaction(() =>
      items.forEach((r) => insertItem.run({ ...r, veg: r.veg ? 1 : 0 }))
    );
    console.log(`Seeded ${items.length} menu items.`);
  }
}

seedIfEmpty();

// ---------- One-time seed: starter coupon codes ----------
function seedCouponsIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM coupons").get().n;
  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO coupons (code, discount_percent, min_order, active) VALUES (?, ?, ?, 1)"
    );
    runInTransaction(() => {
      insert.run("WELCOME10", 10, 0);
      insert.run("RASOI20", 20, 499);
      insert.run("FLAT50", 5, 300);
    });
    console.log("Seeded 3 starter coupon codes.");
  }
}
seedCouponsIfEmpty();

module.exports = db;


