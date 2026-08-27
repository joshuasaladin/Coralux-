# Coralux HQ

The operating system for Coralux — tasks, calendar, ideas, vendors and the
documents attached to them, in one connected place.

Built as a real web app: Next.js on the server, SQLite for the data, files on
disk, sessions and role-based permissions. It deploys to Render straight from
this GitHub repository.

---

## What is live right now

Phase one is switched on:

| Section | What it holds |
|---|---|
| 📊 **Dashboard** | What needs attention today — overdue work, the next three weeks, ideas, recent activity |
| ✅ **Tasks** | To-dos with assignee, priority, due date, recurrence, notes and attachments |
| 📅 **Calendar** | Month grid combining events, task due dates and anything else that is scheduled |
| 💡 **Ideas** | Improvements, marketing and future projects, scored by impact and effort |
| 🤝 **Vendors** | Pool, landscaping, electrical, plumbing and the rest — with their contacts, notes and documents |
| 🔐 **Admin** | Who can sign in, what each role sees |

Every record — a task, a vendor, an idea — carries its own **notes**,
**documents** and **history**, and links to the other records it relates to.
Open a vendor and you see their contact details, the properties they service,
the open tasks against them, the notes ("call before changing the pool
schedule") and their files, together on one page.

### The sections that are built but not switched on

Invoices, payments, payouts, recurring expenses, contracts, employees (with
role-gated salary and ID fields), time off, contacts, properties, assets,
projects, requests, SOPs, meeting notes, the file library and the spend
reports are **all built and working** — forms, lists, detail pages, search,
permissions and the invoice → payment → status logic included. They are simply
not in the menu yet.

To bring one live, add its key to one line in `lib/entities.ts`:

```ts
export const ENABLED_SECTIONS: EntityKey[] = ["tasks", "ideas", "vendors", "events"];
//                                            add "invoices", "employees", … here
export const ENABLED_PAGES: string[] = ["/", "/calendar", "/admin"];
//                                      add "/files", "/reports" here
```

The sidebar, the **+ Add** menu, search, the dashboard cards and the linked
panels on every record all follow that list automatically.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The database and demo data are created on the first request. Sign in with:

```
admin@coralux.aw / coralux2026
```

Change that password under **Account** as soon as you are in. Other seeded
logins (`marisol@`, `anouk@`, `dwight@` `@coralux.aw`, same password) let you
see what a manager and a staff member see.

Useful commands:

```bash
npm run typecheck    # TypeScript
npm run build        # production build
npm run db:reset     # wipe the local database and start clean
npm run smoke        # browser test: login, create, edit, note, permissions
```

---

## Deploying to Render from GitHub

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, connect the repository, **Apply**.
   Render reads `render.yaml` and creates the web service, attaches the disk
   and deploys.
3. Before the first deploy finishes, open the service's **Environment** tab and
   set:
   - `ADMIN_EMAIL` — the email you want to sign in with
   - `ADMIN_PASSWORD` — a strong password (used once, to create the account)
4. Open the service URL and sign in.

Every push to `main` redeploys automatically.

### Why the plan matters

`render.yaml` asks for a **Starter** instance because the service needs a
**persistent disk** — Render's free instances cannot have one, and without a
disk the database and every uploaded document would be wiped on each deploy.
The disk is mounted at `/var/data`, and `DATA_DIR=/var/data` points the app at
it.

### Backups

The whole dataset is one SQLite file, `/var/data/coralux.db`, plus
`/var/data/uploads/`. To take a backup, open a Render shell and copy them, or
add a scheduled job that uploads a copy somewhere off-box. Do this before you
start putting real invoices in.

---

## How it is put together

```
app/
  (app)/                  everything behind the login
    page.tsx              dashboard
    calendar/             month grid
    [entity]/             list, create, detail and edit for every section
    files/  reports/  admin/  account/  search/
  api/files/[id]/         serves an uploaded file, checking permissions first
  login/
components/               shell, table, form, notes, files, chips, icons
lib/
  entities.ts             ⭐ the registry — every section, field and link
  records.ts              generic read/write against that registry
  actions.ts              server actions (the only way anything is written)
  auth.ts / roles.ts      sessions, password hashing, role ranking
  dashboard.ts            the "needs attention" and reporting queries
  files.ts                upload storage (swap this for S3 later)
  seed.ts                 the demo dataset
db/schema.sql             the database
```

**`lib/entities.ts` is the file to edit.** Adding a field to a section is one
line there — the list column, the form input, the detail row, the filter and
the search all pick it up. There is no per-section CRUD code to keep in sync.

### How records connect

Sections point at each other with real foreign keys (a task has a vendor, an
invoice has a vendor), and three side-tables give *every* record the same three
capabilities without duplicating anything:

- `notes` — threaded notes on any record
- `file_links` — a document can be attached to several records at once
- `activity` — who changed what, when

That is what makes this different from folders in Google Drive: the vendor page
is assembled from the vendor row *and* everything that points at it.

### Permissions

Four roles: **staff → manager → admin → owner**.

- Sections can require a minimum role (invoices and payments require manager).
- Individual *fields* can require a higher role — salary, ID number, work
  permit and contract type on an employee are admin-only, and are stripped
  server-side, not hidden with CSS.
- A file can be marked confidential; the download route re-checks the role
  before serving a single byte.
- An admin cannot change their own role or disable their own account.

### Files

Uploads go to disk (`DATA_DIR/uploads`) and the database only stores a
reference — name, type, size, storage key. To move to S3 or Supabase Storage
later, reimplement `put` / `readStored` / `remove` in `lib/files.ts`. Nothing
else in the app touches the filesystem.

### Swapping SQLite for Postgres

SQLite on a Render disk is the right size for a company this size — it is fast,
it is one file to back up, and it has no monthly cost. If you outgrow it (more
than one instance, or you want a managed database), `lib/db.ts` and
`lib/records.ts` are the only files that speak SQL directly; the queries are
plain and portable.

---

## Branding

`components/Logo.tsx` draws a placeholder coral mark in the Coralux palette.
Drop the real logo in as `public/logo.svg` and replace the `<svg>` in that file
with an `<img>`. Colours live at the top of `app/globals.css` — the teal is
`#4d6a75`, the warm grey `#5c5250`. Light and dark mode both follow from there.
