import { Effect, Layer } from "effect"
import { Database as SQLiteDatabase } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "../services/Database.ts"
import * as schema from "./drizzle-schema.ts"

const createTestDatabase = (): SQLiteDatabase => {
  const sqlite = new SQLiteDatabase(":memory:")

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ZAR',
      account_holder_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      branch_code TEXT,
      iban TEXT,
      swift_bic TEXT,
      bank_address TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS business_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      vat_number TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      logo_path TEXT,
      account_holder_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      branch_code TEXT NOT NULL,
      default_vat_rate REAL
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      vat_number TEXT,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      default_price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      bank_account_id INTEGER,
      currency TEXT NOT NULL DEFAULT 'ZAR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT NOT NULL,
      vat_rate REAL,
      notes TEXT,
      subtotal REAL NOT NULL,
      vat_amount REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      paid_at TEXT,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id),
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )
  `)

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      additional_notes TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `)

  sqlite.run(`
    CREATE INDEX IF NOT EXISTS idx_invoices_customer
    ON invoices(customer_id)
  `)

  sqlite.run(`
    CREATE INDEX IF NOT EXISTS idx_line_items_invoice
    ON invoice_line_items(invoice_id)
  `)

  return sqlite
}

export const TestDatabaseLive = Layer.effect(
  Database,
  Effect.acquireRelease(
    Effect.sync(() => {
      const sqlite = createTestDatabase()
      const db = drizzle(sqlite, { schema })

      return Database.of({ db, sqlite })
    }),
    (database) => Effect.sync(() => database.sqlite.close()),
  ),
)
