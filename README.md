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

The real logo lives at **`public/logo.png`** and is picked up automatically in
the sidebar and on the sign-in screen — `lib/branding.ts` looks for
`logo.svg` / `logo.png` / `.jpg` / `.webp` in that order, so a differently
named file just needs renaming to one of those. Without a file present, the
app falls back to a drawn `C · coral · RALUX` wordmark (`components/Logo.tsx`).

The logo renders on a transparent background everywhere, matching the source
PNG.

**The app is always light** — there is no dark mode. `color-scheme: light`
in `app/globals.css` plus the `viewport.colorScheme` in `app/layout.tsx` tell
the browser (and, on iOS, the standalone status bar) to stay light regardless
of the device's system theme. Covered by the smoke test's "stays light even
when the OS is set to dark" check.

## App icon / favicon / home screen

The coral mark alone (no wordmark) is the icon everywhere an icon is needed:

- **`app/icon.svg`** — the browser tab favicon, generated from the source
  artwork with `sharp` (see the commit that added it for the script).
- **`app/apple-icon.png`** — the iOS "Add to Home Screen" icon: 180×180, on an
  opaque light background. iOS renders transparency poorly on home-screen
  icons (older versions show black), so this one is intentionally not
  transparent, unlike the sidebar logo.
- **`public/icon-192.png`** / **`icon-512.png`** + **`app/manifest.ts`** — the
  PWA manifest Android/Chrome use for "Add to Home Screen"; iOS Safari ignores
  this in favor of `apple-icon.png` but reads the manifest's name/theme color
  when launched standalone.

To replace the mark, edit `app/icon.svg` (single source of truth) and
regenerate the PNGs from it at the sizes above — resizing, not redrawing.

Colours live at the top of `app/globals.css` — the teal is `#4d6a75`, the warm
grey `#5c5250`. Light and dark mode both follow from there.

## A few conventions worth knowing

**The daily quote** on the dashboard rotates once per day from the list in
`lib/quotes.ts`, picked from the date — so everyone sees the same line, and it
changes at midnight with no scheduled job. Add or remove freely; the rotation
adapts to the length of the list.

**Tabs and completed work.** A section can split its list into tabs and move
finished records into their own collapsed section, both declared in
`lib/entities.ts`:

```ts
tabs: [
  { key: "oneoff",    label: "One-off tasks",   match: (r) => r.recurrence === "none" },
  { key: "recurring", label: "Recurring tasks", match: (r) => r.recurrence !== "none" },
],
archive: { label: "Completed", match: (r) => r.status === "done" },
```

**Inline editing.** Mark a field `editable: true` and it becomes changeable
straight from the list row — no opening the record. It saves the moment you
pick a value. Used today for task status, priority and due date, and for idea
status, impact and effort.

**Times** are always a 15-minute dropdown (`type: "time"`), never free text, so
they are stored in one shape and sort correctly. The interval lives in
`lib/time-options.ts`.
