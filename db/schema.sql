-- Coralux HQ — core schema
-- Every operational record lives in its own table, but they are linked by
-- foreign keys plus three polymorphic side-tables (notes, file_links, activity)
-- so any record can carry documents, notes and a history trail.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',   -- owner | admin | manager | staff
  password_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  employee_id   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT,
  owner_name TEXT,
  units      INTEGER DEFAULT 1,
  status     TEXT DEFAULT 'active',
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  position          TEXT,
  department        TEXT,
  phone             TEXT,
  email             TEXT,
  start_date        TEXT,
  end_date          TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  -- restricted block (role-gated in the UI)
  contract_type     TEXT,
  pay_type          TEXT,                  -- salary | hourly
  pay_rate          REAL,
  pay_currency      TEXT DEFAULT 'AWG',
  vacation_allowance REAL DEFAULT 0,
  vacation_used      REAL DEFAULT 0,
  national_id       TEXT,
  work_permit_no    TEXT,
  work_permit_expiry TEXT,
  emergency_contact TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  payment_terms  TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_properties (
  vendor_id   TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, property_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  company    TEXT,
  role       TEXT,
  type       TEXT,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planned',
  start_date  TEXT,
  due_date    TEXT,
  owner_id    TEXT REFERENCES employees(id) ON DELETE SET NULL,
  budget      REAL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',      -- todo | in_progress | blocked | done
  priority    TEXT NOT NULL DEFAULT 'medium',    -- low | medium | high | urgent
  due_date    TEXT,
  assignee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  vendor_id   TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  recurrence  TEXT DEFAULT 'none',               -- none | daily | weekly | monthly | quarterly | yearly
  completed_at TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id             TEXT PRIMARY KEY,
  invoice_number TEXT,
  vendor_id      TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  property_id    TEXT REFERENCES properties(id) ON DELETE SET NULL,
  issue_date     TEXT,
  due_date       TEXT,
  amount         REAL NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'AWG',
  category       TEXT,
  status         TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid | partial | paid | disputed | void
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  vendor_id     TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  payment_date  TEXT,
  amount        REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'AWG',
  method        TEXT,                              -- bank_transfer | cash | card | cheque | other
  bank          TEXT,
  reference     TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id           TEXT PRIMARY KEY,
  payee_type   TEXT NOT NULL DEFAULT 'owner',     -- owner | company | vendor | employee
  payee_name   TEXT NOT NULL,
  property_id  TEXT REFERENCES properties(id) ON DELETE SET NULL,
  period       TEXT,
  payout_date  TEXT,
  amount       REAL NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'AWG',
  method       TEXT,
  reference    TEXT,
  status       TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | sent | cleared | failed
  notes        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  vendor_id   TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  category    TEXT,
  amount      REAL NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'AWG',
  frequency   TEXT NOT NULL DEFAULT 'monthly',
  next_due    TEXT,
  payment_method TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT,                              -- vendor | insurance | licence | lease | other
  vendor_id     TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  property_id   TEXT REFERENCES properties(id) ON DELETE SET NULL,
  start_date    TEXT,
  end_date      TEXT,
  notice_days   INTEGER DEFAULT 30,
  value         REAL,
  currency      TEXT NOT NULL DEFAULT 'AWG',
  auto_renew    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT,                              -- laptop | phone | vehicle | keys | equipment | uniform
  serial_number TEXT,
  assigned_to   TEXT REFERENCES employees(id) ON DELETE SET NULL,
  property_id   TEXT REFERENCES properties(id) ON DELETE SET NULL,
  purchase_date TEXT,
  value         REAL,
  currency      TEXT NOT NULL DEFAULT 'AWG',
  status        TEXT NOT NULL DEFAULT 'in_use',    -- in_use | spare | repair | retired | lost
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_off (
  id          TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'vacation',    -- vacation | sick | unpaid | other
  start_date  TEXT,
  end_date    TEXT,
  days        REAL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'requested',   -- requested | approved | rejected | cancelled
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  requester_id  TEXT REFERENCES employees(id) ON DELETE SET NULL,
  category      TEXT,
  amount        REAL,
  currency      TEXT NOT NULL DEFAULT 'AWG',
  property_id   TEXT REFERENCES properties(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'submitted', -- submitted | approved | rejected | ordered | done
  decision_note TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  impact      TEXT DEFAULT 'medium',
  effort      TEXT DEFAULT 'medium',
  status      TEXT NOT NULL DEFAULT 'new',         -- new | exploring | planned | done | parked
  author_id   TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sops (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,
  content     TEXT,
  owner_id    TEXT REFERENCES employees(id) ON DELETE SET NULL,
  version     TEXT DEFAULT '1.0',
  status      TEXT NOT NULL DEFAULT 'active',
  review_date TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  meeting_date TEXT,
  attendees  TEXT,
  agenda     TEXT,
  notes      TEXT,
  decisions  TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'meeting',     -- meeting | deadline | employee | maintenance | other
  start_date  TEXT NOT NULL,
  end_date    TEXT,
  all_day     INTEGER NOT NULL DEFAULT 1,
  start_time  TEXT,
  location    TEXT,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  mime_type     TEXT,
  size_bytes    INTEGER DEFAULT 0,
  storage_key   TEXT NOT NULL,
  sensitive     INTEGER NOT NULL DEFAULT 0,
  uploaded_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- polymorphic joins ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS file_links (
  file_id     TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  label       TEXT,
  PRIMARY KEY (file_id, entity, entity_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  author_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id         TEXT PRIMARY KEY,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  action     TEXT NOT NULL,
  summary    TEXT,
  actor_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id      TEXT PRIMARY KEY,
  kind    TEXT NOT NULL,
  name    TEXT NOT NULL,
  sort    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_vendor  ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due     ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity     ON notes(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_files_entity     ON file_links(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity  ON activity(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_start     ON events(start_date);

-- ------------------------------------------------------------- listings

CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  address       TEXT,
  owner_name    TEXT,
  platforms     TEXT NOT NULL DEFAULT 'both',    -- airbnb | guesty | both
  target_date   TEXT,
  assignee      TEXT,
  status        TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | active | paused
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_steps (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  list        TEXT NOT NULL DEFAULT 'onboarding', -- onboarding | inventory
  section     TEXT,          -- which part of that checklist it belongs to
  note        TEXT,          -- whatever detail somebody wants to keep against it
  coralux_supplied INTEGER NOT NULL DEFAULT 0,    -- we provide it, not the owner
  sort        INTEGER NOT NULL DEFAULT 0,
  done        INTEGER NOT NULL DEFAULT 0,
  done_at     TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_steps_listing ON listing_steps(listing_id);

-- ------------------------------------------------------------- inventory

CREATE TABLE IF NOT EXISTS inventory (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  quantity    REAL NOT NULL DEFAULT 0,
  unit        TEXT,
  par_level   REAL,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'in_stock', -- in_stock | low | out | discontinued
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- --------------------------------------------------------- cleaning schedule

CREATE TABLE IF NOT EXISTS cleaning_shifts (
  id          TEXT PRIMARY KEY,
  week_start  TEXT NOT NULL,    -- the Sunday that anchors the week, YYYY-MM-DD
  day_of_week INTEGER NOT NULL, -- 0 = Sunday .. 6 = Saturday
  time_slot   TEXT NOT NULL,    -- "07:00" .. "20:00"
  listing     TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cleaning_shift_cell
  ON cleaning_shifts(week_start, day_of_week, time_slot);
CREATE INDEX IF NOT EXISTS idx_cleaning_shifts_week ON cleaning_shifts(week_start);

-- ------------------------------------------------------------------- undo

-- A snapshot of whatever a delete was about to throw away, so it can be put
-- back. payload is the rows themselves, as JSON, table by table — a listing
-- brings its checklist and notes along with it. Entries are pruned after a
-- month, and any file blob held back for one is removed at the same time.
CREATE TABLE IF NOT EXISTS deleted_items (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,  -- what was deleted, for the button's wording
  label      TEXT NOT NULL,  -- its name, so the button can say what it will bring back
  payload    TEXT NOT NULL,  -- [{ table, rows }]
  blob_keys  TEXT,           -- upload keys kept on disk until this is pruned
  actor_id   TEXT,
  created_at TEXT NOT NULL,
  undone_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_deleted_items_open
  ON deleted_items(undone_at, created_at DESC);

-- --------------------------------------------------------- per-person access

-- Exactly which sections one person may open, when an admin has picked for
-- them by hand. A user with no rows here simply gets what their role gets
-- (the defaults in lib/entities.ts), so nobody has to be configured unless
-- you actually want them to differ.
CREATE TABLE IF NOT EXISTS user_section_access (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  PRIMARY KEY (user_id, section_key)
);
CREATE INDEX IF NOT EXISTS idx_user_section_access_user ON user_section_access(user_id);

-- Marks a person as "custom access" even while every box is unticked, so an
-- empty allow-list stays empty instead of silently falling back to the role
-- defaults and handing them more than was intended.
CREATE TABLE IF NOT EXISTS user_access_custom (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);
