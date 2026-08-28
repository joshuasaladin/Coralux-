import type Database from "better-sqlite3";
import crypto from "node:crypto";
import { hashPassword } from "./auth";

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

/** Date helper: days from today as YYYY-MM-DD. */
function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function seedIfEmpty(db: Database.Database) {
  const existing = db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as {
    c: number;
  };
  if (existing.c > 0) return;

  const ts = nowIso();
  const insert = (table: string, row: Record<string, unknown>) => {
    const cols = Object.keys(row);
    db.prepare(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols
        .map(() => "?")
        .join(", ")})`,
    ).run(...cols.map((c) => row[c] as never));
  };
  const stamped = (row: Record<string, unknown>) => ({
    ...row,
    created_at: ts,
    updated_at: ts,
  });

  const tx = db.transaction(() => {
    // ---------------------------------------------------------------- people
    const emp = {
      josh: uid(),
      marisol: uid(),
      dwight: uid(),
      anouk: uid(),
      ricardo: uid(),
      shanice: uid(),
    };

    insert("employees", stamped({
      id: emp.josh, name: "Joshua Saladin", position: "Managing Director",
      department: "management", phone: "+297 560 1120", email: "joshua@coralux.aw",
      start_date: "2021-03-01", status: "active", contract_type: "permanent",
      pay_type: "salary", pay_rate: 9500, pay_currency: "AWG",
      vacation_allowance: 25, vacation_used: 6, national_id: "ARU-8841200",
      emergency_contact: "Ana Saladin +297 560 9931",
    }));
    insert("employees", stamped({
      id: emp.marisol, name: "Marisol Kock", position: "Operations Manager",
      department: "property_management", phone: "+297 592 4417", email: "marisol@coralux.aw",
      start_date: "2022-06-15", status: "active", contract_type: "permanent",
      pay_type: "salary", pay_rate: 6200, pay_currency: "AWG",
      vacation_allowance: 20, vacation_used: 11, national_id: "ARU-9012455",
      emergency_contact: "Ivan Kock +297 592 1188",
    }));
    insert("employees", stamped({
      id: emp.dwight, name: "Dwight Tromp", position: "Maintenance Lead",
      department: "maintenance", phone: "+297 733 0092", email: "dwight@coralux.aw",
      start_date: "2023-01-09", status: "active", contract_type: "permanent",
      pay_type: "hourly", pay_rate: 38, pay_currency: "AWG",
      vacation_allowance: 18, vacation_used: 4, national_id: "ARU-7742019",
    }));
    insert("employees", stamped({
      id: emp.anouk, name: "Anouk Willems", position: "Finance & Admin",
      department: "finance", phone: "+297 641 7730", email: "anouk@coralux.aw",
      start_date: "2023-09-04", status: "active", contract_type: "permanent",
      pay_type: "salary", pay_rate: 5400, pay_currency: "AWG",
      vacation_allowance: 20, vacation_used: 8, national_id: "NLD-XK449120",
      work_permit_no: "WP-2023-4471", work_permit_expiry: day(96),
    }));
    insert("employees", stamped({
      id: emp.ricardo, name: "Ricardo Croes", position: "Guest Services",
      department: "guest_services", phone: "+297 594 2210", email: "ricardo@coralux.aw",
      start_date: "2024-04-22", status: "active", contract_type: "fixed_term",
      pay_type: "hourly", pay_rate: 32, pay_currency: "AWG",
      vacation_allowance: 15, vacation_used: 15,
    }));
    insert("employees", stamped({
      id: emp.shanice, name: "Shanice Dirksz", position: "Housekeeping Supervisor",
      department: "housekeeping", phone: "+297 568 3341", email: "shanice@coralux.aw",
      start_date: "2024-11-11", status: "on_leave", contract_type: "permanent",
      pay_type: "hourly", pay_rate: 30, pay_currency: "AWG",
      vacation_allowance: 18, vacation_used: 12,
    }));

    // ----------------------------------------------------------------- users
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@coralux.aw").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "coralux2026";

    const owner = uid();
    insert("users", stamped({
      id: owner, email: adminEmail, name: "Joshua Saladin", role: "owner",
      password_hash: hashPassword(adminPassword), status: "active", employee_id: emp.josh,
    }));
    insert("users", stamped({
      id: uid(), email: "marisol@coralux.aw", name: "Marisol Kock", role: "manager",
      password_hash: hashPassword("coralux2026"), status: "active", employee_id: emp.marisol,
    }));
    insert("users", stamped({
      id: uid(), email: "anouk@coralux.aw", name: "Anouk Willems", role: "admin",
      password_hash: hashPassword("coralux2026"), status: "active", employee_id: emp.anouk,
    }));
    insert("users", stamped({
      id: uid(), email: "dwight@coralux.aw", name: "Dwight Tromp", role: "staff",
      password_hash: hashPassword("coralux2026"), status: "active", employee_id: emp.dwight,
    }));

    // ------------------------------------------------------------ properties
    const prop = { palm: uid(), eagle: uid(), noord: uid(), savaneta: uid(), malmok: uid(), oranje: uid() };
    const props: [string, string, string, string, number][] = [
      [prop.palm, "Villa Coral Bay", "L.G. Smith Blvd 214, Palm Beach", "R. Henriquez", 1],
      [prop.eagle, "Eagle Beach Residences", "J.E. Irausquin Blvd 87, Eagle Beach", "Sunrise Holdings NV", 8],
      [prop.noord, "Noord Garden Villas", "Salina Cerca 44, Noord", "M. van Dijk", 4],
      [prop.savaneta, "Savaneta Beach House", "Savaneta 318", "P. Arends", 1],
      [prop.malmok, "Malmok Cliff Villa", "Malmok 12A", "Blue Horizon Ltd", 1],
      [prop.oranje, "Oranjestad Lofts", "Wilhelminastraat 63, Oranjestad", "Coralux NV", 6],
    ];
    for (const [pid, name, address, ownerName, units] of props) {
      insert("properties", stamped({ id: pid, name, address, owner_name: ownerName, units, status: "active" }));
    }

    // --------------------------------------------------------------- vendors
    const ven = { pool: uid(), garden: uid(), clean: uid(), elec: uid(), plumb: uid(), ac: uid(), pest: uid(), soft: uid() };
    insert("vendors", stamped({
      id: ven.pool, name: "ABC Pool Services", category: "pool", contact_name: "John Smith",
      phone: "+297 583 2210", email: "john@abcpool.aw", address: "Sabana Blanco 22, Oranjestad",
      payment_terms: "Monthly, net 30", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.garden, name: "Isla Verde Landscaping", category: "landscaping", contact_name: "Elvis Maduro",
      phone: "+297 594 8812", email: "info@islaverde.aw", payment_terms: "Monthly, net 15", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.clean, name: "Bright Island Cleaning", category: "cleaning", contact_name: "Yolanda Peters",
      phone: "+297 561 4477", email: "yolanda@brightisland.aw", payment_terms: "Bi-weekly", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.elec, name: "Tromp Electrical NV", category: "electrical", contact_name: "Gilbert Tromp",
      phone: "+297 733 1190", email: "service@trompelectrical.aw", payment_terms: "On completion", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.plumb, name: "AquaFix Plumbing", category: "plumbing", contact_name: "Randolph Wever",
      phone: "+297 592 0043", email: "randolph@aquafix.aw", payment_terms: "Net 14", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.ac, name: "CoolBreeze A/C", category: "ac", contact_name: "Marlon Geerman",
      phone: "+297 568 9921", email: "marlon@coolbreeze.aw", payment_terms: "Quarterly service contract", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.pest, name: "Island Pest Control", category: "pest", contact_name: "Diana Ras",
      phone: "+297 587 6612", email: "diana@islandpest.aw", payment_terms: "Per visit", status: "active",
    }));
    insert("vendors", stamped({
      id: ven.soft, name: "Hostaway", category: "software", contact_name: "Support",
      email: "billing@hostaway.com", payment_terms: "Card, monthly", status: "active",
    }));

    const vp = (v: string, p: string) =>
      db.prepare(`INSERT OR IGNORE INTO vendor_properties (vendor_id, property_id) VALUES (?, ?)`).run(v, p);
    [prop.palm, prop.eagle, prop.noord, prop.savaneta, prop.malmok, prop.oranje].forEach((p) => vp(ven.pool, p));
    [prop.palm, prop.noord, prop.malmok].forEach((p) => vp(ven.garden, p));
    [prop.eagle, prop.oranje].forEach((p) => vp(ven.clean, p));

    // -------------------------------------------------------------- contacts
    insert("contacts", stamped({
      id: uid(), name: "Roberto Henriquez", company: "Private owner", role: "Owner — Villa Coral Bay",
      type: "owner", phone: "+297 594 1122", email: "r.henriquez@gmail.com",
      notes: "Prefers WhatsApp. Wants the monthly statement on the 5th.",
    }));
    insert("contacts", stamped({
      id: uid(), name: "Mireille van Dijk", company: "Private owner", role: "Owner — Noord Garden Villas",
      type: "owner", phone: "+31 6 2244 8890", email: "mvandijk@outlook.com",
      notes: "Lives in Rotterdam. Six hours ahead — call before 14:00 local.",
    }));
    insert("contacts", stamped({
      id: uid(), name: "Departamento di Impuesto", company: "Government of Aruba", role: "Tax office",
      type: "government", phone: "+297 522 7423", email: "info@impuesto.aw",
      notes: "Tourist levy filing due by the 15th of each month.",
    }));
    insert("contacts", stamped({
      id: uid(), name: "Sharine Odor", company: "Aruba Bank", role: "Business account manager",
      type: "bank", phone: "+297 527 7777", email: "s.odor@arubabank.com",
    }));
    insert("contacts", stamped({
      id: uid(), name: "Kenneth Lampe", company: "Lampe & Associates", role: "Accountant",
      type: "legal", phone: "+297 583 4410", email: "k.lampe@lampeassoc.aw",
      notes: "Handles the annual filing. Needs all invoices by 31 January.",
    }));

    // --------------------------------------------------------------- project
    const projRebrand = uid();
    const projPool = uid();
    insert("projects", stamped({
      id: projRebrand, name: "Website & booking-engine relaunch",
      description: "New Coralux site with direct booking, tied into the channel manager.",
      status: "active", start_date: day(-40), due_date: day(45), owner_id: emp.josh, budget: 18000,
    }));
    insert("projects", stamped({
      id: projPool, name: "Eagle Beach pool resurfacing",
      description: "Resurface the main pool and replace the two failing pumps before high season.",
      status: "planned", start_date: day(20), due_date: day(75), owner_id: emp.dwight, budget: 42000,
    }));

    // ----------------------------------------------------------------- tasks
    const tasks: Array<Record<string, unknown>> = [
      { title: "Chase ABC Pool Services for the August invoice", status: "todo", priority: "high", due_date: day(-2), assignee_id: emp.anouk, vendor_id: ven.pool },
      { title: "Approve September owner payouts", status: "todo", priority: "urgent", due_date: day(0), assignee_id: emp.josh },
      { title: "Renew Hostaway subscription", status: "todo", priority: "medium", due_date: day(4), assignee_id: emp.anouk, vendor_id: ven.soft },
      { title: "Replace A/C filters — Noord Garden Villas", status: "in_progress", priority: "medium", due_date: day(3), assignee_id: emp.dwight, property_id: prop.noord, recurrence: "quarterly" },
      { title: "Monthly tourist levy filing", status: "todo", priority: "high", due_date: day(-1), assignee_id: emp.anouk, recurrence: "monthly" },
      { title: "Deep clean Villa Coral Bay before Friday arrival", status: "todo", priority: "urgent", due_date: day(1), assignee_id: emp.shanice, property_id: prop.palm },
      { title: "Quote three contractors for pool resurfacing", status: "in_progress", priority: "high", due_date: day(9), assignee_id: emp.dwight, project_id: projPool },
      { title: "Sign off homepage copy", status: "blocked", priority: "medium", due_date: day(6), assignee_id: emp.josh, project_id: projRebrand },
      { title: "Photograph Malmok Cliff Villa for new listing", status: "todo", priority: "medium", due_date: day(12), assignee_id: emp.ricardo, property_id: prop.malmok, project_id: projRebrand },
      { title: "Update guest welcome pack for 2027 rates", status: "todo", priority: "low", due_date: day(25), assignee_id: emp.ricardo },
      { title: "Fix leaking tap — Savaneta Beach House", status: "todo", priority: "high", due_date: day(2), assignee_id: emp.dwight, property_id: prop.savaneta, vendor_id: ven.plumb },
      { title: "Anouk work permit renewal paperwork", status: "todo", priority: "high", due_date: day(60), assignee_id: emp.josh },
      { title: "Weekly pool chemical check", status: "todo", priority: "medium", due_date: day(5), assignee_id: emp.dwight, recurrence: "weekly" },
      { title: "Reconcile August bank statement", status: "done", priority: "high", due_date: day(-5), assignee_id: emp.anouk },
      { title: "Onboard Shanice to housekeeping checklist", status: "done", priority: "medium", due_date: day(-12), assignee_id: emp.marisol },
    ];
    for (const t of tasks) {
      insert("tasks", stamped({
        id: uid(), description: null, recurrence: "none", project_id: null,
        property_id: null, vendor_id: null, assignee_id: null,
        completed_at: t.status === "done" ? ts : null, ...t,
      }));
    }

    // -------------------------------------------------------------- invoices
    const inv = { poolJul: uid(), poolAug: uid(), gardenAug: uid(), elecAug: uid(), cleanAug: uid(), acJul: uid(), pestAug: uid(), plumbAug: uid() };
    const invoices: Array<Record<string, unknown>> = [
      { id: inv.poolJul, invoice_number: "20415", vendor_id: ven.pool, issue_date: day(-58), due_date: day(-28), amount: 1250, category: "pool_maintenance", status: "paid" },
      { id: inv.poolAug, invoice_number: "20481", vendor_id: ven.pool, issue_date: day(-6), due_date: day(24), amount: 1850, category: "pool_maintenance", status: "unpaid", notes: "Includes the extra pump service at Eagle Beach." },
      { id: inv.gardenAug, invoice_number: "IV-8891", vendor_id: ven.garden, issue_date: day(-11), due_date: day(4), amount: 2340, category: "landscaping", status: "unpaid", property_id: prop.noord },
      { id: inv.elecAug, invoice_number: "TE-4472", vendor_id: ven.elec, issue_date: day(-14), due_date: day(-4), amount: 890.5, category: "repairs", status: "unpaid", property_id: prop.eagle, notes: "Emergency call-out, pool house breaker." },
      { id: inv.cleanAug, invoice_number: "BIC-3320", vendor_id: ven.clean, issue_date: day(-9), due_date: day(5), amount: 3180, category: "cleaning", status: "partial", property_id: prop.oranje },
      { id: inv.acJul, invoice_number: "CB-1145", vendor_id: ven.ac, issue_date: day(-47), due_date: day(-17), amount: 1600, category: "repairs", status: "paid", property_id: prop.noord },
      { id: inv.pestAug, invoice_number: "IPC-771", vendor_id: ven.pest, issue_date: day(-3), due_date: day(11), amount: 420, category: "other", status: "unpaid" },
      { id: inv.plumbAug, invoice_number: "AQ-2298", vendor_id: ven.plumb, issue_date: day(-20), due_date: day(-6), amount: 640, category: "repairs", status: "unpaid", property_id: prop.savaneta },
    ];
    for (const i of invoices) {
      insert("invoices", stamped({
        currency: "AWG", property_id: null, notes: null, ...i,
      }));
    }

    // -------------------------------------------------------------- payments
    insert("payments", stamped({
      id: uid(), invoice_id: inv.poolJul, vendor_id: ven.pool, payment_date: day(-30),
      amount: 1250, currency: "AWG", method: "bank_transfer", bank: "Aruba Bank",
      reference: "839292", notes: "July pool maintenance, all six properties.",
    }));
    insert("payments", stamped({
      id: uid(), invoice_id: inv.acJul, vendor_id: ven.ac, payment_date: day(-19),
      amount: 1600, currency: "AWG", method: "bank_transfer", bank: "Aruba Bank", reference: "841077",
    }));
    insert("payments", stamped({
      id: uid(), invoice_id: inv.cleanAug, vendor_id: ven.clean, payment_date: day(-2),
      amount: 1500, currency: "AWG", method: "bank_transfer", bank: "Aruba Bank",
      reference: "846310", notes: "Part payment — balance due on completion of the Oranjestad turnover.",
    }));

    // --------------------------------------------------------------- payouts
    const payouts: Array<Record<string, unknown>> = [
      { payee_name: "R. Henriquez", payee_type: "owner", property_id: prop.palm, period: "August 2026", payout_date: day(3), amount: 9420, status: "scheduled" },
      { payee_name: "Sunrise Holdings NV", payee_type: "owner", property_id: prop.eagle, period: "August 2026", payout_date: day(3), amount: 24180, status: "scheduled" },
      { payee_name: "M. van Dijk", payee_type: "owner", property_id: prop.noord, period: "August 2026", payout_date: day(3), amount: 11250, status: "scheduled" },
      { payee_name: "Blue Horizon Ltd", payee_type: "owner", property_id: prop.malmok, period: "July 2026", payout_date: day(-27), amount: 13600, status: "cleared", method: "bank_transfer", reference: "PO-0771" },
      { payee_name: "P. Arends", payee_type: "owner", property_id: prop.savaneta, period: "July 2026", payout_date: day(-27), amount: 6980, status: "cleared", method: "bank_transfer", reference: "PO-0772" },
    ];
    for (const p of payouts) {
      insert("payouts", stamped({
        id: uid(), currency: "AWG", method: "bank_transfer", reference: null,
        notes: null, property_id: null, ...p,
      }));
    }

    // ---------------------------------------------------- recurring expenses
    const recurring: Array<Record<string, unknown>> = [
      { name: "Hostaway channel manager", vendor_id: ven.soft, category: "software", amount: 685, frequency: "monthly", next_due: day(4), payment_method: "card" },
      { name: "Business liability insurance", category: "insurance", amount: 4200, frequency: "yearly", next_due: day(52), payment_method: "bank_transfer" },
      { name: "SETAR business internet & phone", category: "utilities", amount: 340, frequency: "monthly", next_due: day(9), payment_method: "bank_transfer" },
      { name: "Google Workspace", category: "software", amount: 168, frequency: "monthly", next_due: day(14), payment_method: "card" },
      { name: "Chamber of Commerce registration", category: "other", amount: 495, frequency: "yearly", next_due: day(121), payment_method: "bank_transfer" },
      { name: "Accounting retainer — Lampe & Associates", category: "professional", amount: 1250, frequency: "quarterly", next_due: day(28), payment_method: "bank_transfer" },
      { name: "Pool chemical supply contract", vendor_id: ven.pool, category: "pool_maintenance", amount: 950, frequency: "monthly", next_due: day(11), payment_method: "bank_transfer" },
    ];
    for (const r of recurring) {
      insert("recurring_expenses", stamped({
        id: uid(), currency: "AWG", status: "active", vendor_id: null, notes: null, ...r,
      }));
    }

    // ------------------------------------------------------------- contracts
    const contracts: Array<Record<string, unknown>> = [
      { name: "ABC Pool Services — maintenance agreement", type: "vendor", vendor_id: ven.pool, start_date: "2025-01-01", end_date: day(126), notice_days: 60, value: 15000, auto_renew: 1, status: "active" },
      { name: "Business liability insurance policy", type: "insurance", start_date: "2025-10-01", end_date: day(34), notice_days: 30, value: 4200, auto_renew: 0, status: "expiring" },
      { name: "Tourism business licence", type: "licence", start_date: "2026-01-01", end_date: day(126), notice_days: 45, auto_renew: 0, status: "active" },
      { name: "CoolBreeze A/C service contract", type: "vendor", vendor_id: ven.ac, start_date: "2026-02-01", end_date: day(158), notice_days: 30, value: 6400, auto_renew: 1, status: "active" },
      { name: "Oranjestad Lofts management agreement", type: "other", property_id: prop.oranje, start_date: "2024-05-01", end_date: day(17), notice_days: 90, auto_renew: 1, status: "expiring" },
    ];
    for (const c of contracts) {
      insert("contracts", stamped({
        id: uid(), currency: "AWG", vendor_id: null, property_id: null,
        value: null, notes: null, auto_renew: 0, notice_days: 30, ...c,
      }));
    }

    // ---------------------------------------------------------------- assets
    const assets: Array<Record<string, unknown>> = [
      { name: 'MacBook Air 13"', type: "laptop", serial_number: "C02XY1234ABC", assigned_to: emp.anouk, purchase_date: "2024-08-14", value: 2400, status: "in_use" },
      { name: "iPhone 15 — operations line", type: "phone", serial_number: "IMEI 3548-9921", assigned_to: emp.marisol, purchase_date: "2025-02-03", value: 1900, status: "in_use" },
      { name: "Toyota Hilux (V-22841)", type: "vehicle", serial_number: "V-22841", assigned_to: emp.dwight, purchase_date: "2023-05-20", value: 48000, status: "in_use" },
      { name: "Master key set — Eagle Beach", type: "keys", assigned_to: emp.shanice, property_id: prop.eagle, status: "in_use" },
      { name: "Pressure washer", type: "equipment", serial_number: "KAR-77120", assigned_to: emp.dwight, purchase_date: "2024-01-30", value: 1150, status: "repair" },
      { name: "Housekeeping cart ×4", type: "equipment", property_id: prop.oranje, value: 2200, status: "in_use" },
      { name: 'Dell Latitude 14"', type: "laptop", serial_number: "DL-9928471", purchase_date: "2022-11-02", value: 1600, status: "spare" },
    ];
    for (const a of assets) {
      insert("assets", stamped({
        id: uid(), currency: "AWG", assigned_to: null, property_id: null,
        purchase_date: null, value: null, serial_number: null, notes: null, ...a,
      }));
    }

    // -------------------------------------------------------------- time off
    const timeOff: Array<Record<string, unknown>> = [
      { employee_id: emp.shanice, type: "vacation", start_date: day(-4), end_date: day(10), days: 10, status: "approved", notes: "Family trip to Colombia." },
      { employee_id: emp.ricardo, type: "vacation", start_date: day(21), end_date: day(28), days: 6, status: "requested" },
      { employee_id: emp.dwight, type: "sick", start_date: day(-16), end_date: day(-15), days: 2, status: "approved" },
      { employee_id: emp.marisol, type: "vacation", start_date: day(40), end_date: day(54), days: 10, status: "requested", notes: "Overlaps with high-season prep — needs cover." },
    ];
    for (const t of timeOff) insert("time_off", stamped({ id: uid(), notes: null, ...t }));

    // -------------------------------------------------------------- requests
    const requests: Array<Record<string, unknown>> = [
      { title: "New vacuum for property management", description: "The current one has lost suction and the filter housing is cracked. Quote attached from Kooyman.", requester_id: emp.shanice, category: "supplies", amount: 640, status: "submitted" },
      { title: "Second set of pool test kits", description: "So Dwight and I are not sharing one kit across six properties.", requester_id: emp.dwight, category: "supplies", amount: 210, status: "approved", decision_note: "Approved — order with the September supply run." },
      { title: "Replace cracked patio furniture at Noord", description: "Two chairs are unsafe. Guests commented in the last two reviews.", requester_id: emp.marisol, category: "repairs", amount: 1450, property_id: prop.noord, status: "submitted" },
      { title: "Uniform polos for housekeeping team", requester_id: emp.shanice, category: "supplies", amount: 480, status: "rejected", decision_note: "Deferred to next quarter's budget." },
    ];
    for (const r of requests) {
      insert("requests", stamped({
        id: uid(), currency: "AWG", description: null, property_id: null,
        decision_note: null, amount: null, ...r,
      }));
    }

    // ----------------------------------------------------------------- ideas
    const ideas: Array<Record<string, unknown>> = [
      { title: "Direct-booking discount for repeat guests", description: "10% off when guests book directly the second time. Cheaper than the OTA commission.", category: "marketing", impact: "high", effort: "low", status: "exploring", author_id: emp.josh },
      { title: "Photo checklist after every turnover", description: "Housekeeping uploads six standard photos. Settles damage disputes instantly.", category: "operations", impact: "high", effort: "low", status: "planned", author_id: emp.marisol },
      { title: "Switch to LED across all properties", description: "Rough estimate: AWG 400/month saved across the portfolio.", category: "cost_saving", impact: "medium", effort: "medium", status: "new", author_id: emp.dwight },
      { title: "Welcome basket from local producers", description: "Aloe products and Aruban coffee. Good for reviews, good for the story.", category: "guest_experience", impact: "medium", effort: "low", status: "new", author_id: emp.ricardo },
      { title: "Owner portal with live statements", description: "Owners see their payouts without emailing us. Would cut half the monthly admin.", category: "technology", impact: "high", effort: "high", status: "exploring", author_id: emp.josh },
    ];
    for (const i of ideas) insert("ideas", stamped({ id: uid(), author_id: null, ...i }));

    // ------------------------------------------------------------------ SOPs
    insert("sops", stamped({
      id: uid(), title: "Guest check-in procedure", category: "check_in", owner_id: emp.ricardo,
      version: "2.1", status: "active", review_date: day(90),
      content: [
        "Confirm arrival time with the guest 24 hours ahead by WhatsApp.",
        "Check the property personally: A/C on at 23°C, water running, wifi live.",
        "Place the welcome pack and keys in the lockbox; send the code one hour before arrival.",
        "Message the guest 30 minutes after the expected arrival to confirm they are in.",
        "Log the arrival in the property calendar and note anything unusual.",
      ].join("\n"),
    }));
    insert("sops", stamped({
      id: uid(), title: "Turnover cleaning checklist", category: "housekeeping", owner_id: emp.shanice,
      version: "1.4", status: "active", review_date: day(120),
      content: [
        "Strip and launder all linen; check for stains and damage before washing.",
        "Full bathroom clean, restock consumables to par level.",
        "Kitchen: empty fridge, run dishwasher, wipe all surfaces and appliance fronts.",
        "Check every lightbulb, remote battery and A/C filter.",
        "Photograph the six standard angles and upload before leaving.",
        "Report anything broken to maintenance the same day — do not wait for the next shift.",
      ].join("\n"),
    }));
    insert("sops", stamped({
      id: uid(), title: "Paying a supplier invoice", category: "finance", owner_id: emp.anouk,
      version: "1.0", status: "active", review_date: day(150),
      content: [
        "Enter the invoice in Coralux HQ with vendor, number, dates, amount and category, and attach the PDF.",
        "Check the amount against the contract or agreed price list.",
        "Get approval from the Managing Director for anything above AWG 2,500.",
        "Pay from the Aruba Bank business account and note the payment reference.",
        "Record the payment against the invoice and attach the proof of payment.",
        "The invoice status must read Paid before the end of the week.",
      ].join("\n"),
    }));
    insert("sops", stamped({
      id: uid(), title: "Hurricane / severe weather preparation", category: "emergency", owner_id: emp.dwight,
      version: "1.2", status: "active", review_date: day(60),
      content: [
        "Secure or store all outdoor furniture, umbrellas and loose items.",
        "Check and clear all drains and gutters.",
        "Confirm every property has water, batteries and a working torch.",
        "Message all in-house guests with the emergency contact number.",
        "Photograph each property before and after for insurance purposes.",
      ].join("\n"),
    }));

    // --------------------------------------------------------- meeting notes
    insert("meetings", stamped({
      id: uid(), title: "Monthly operations review — August", meeting_date: day(-9),
      attendees: "Joshua, Marisol, Dwight, Anouk",
      agenda: "Occupancy, open maintenance, high-season readiness, cash position.",
      notes: [
        "Occupancy landed at 78% for August, three points above last year.",
        "Eagle Beach pool is the biggest risk to high season — pumps are failing intermittently.",
        "Two owner statements went out late because invoices were still sitting in email.",
      ].join("\n"),
      decisions: [
        "Pool resurfacing to start no later than 15 October.",
        "All supplier invoices go into Coralux HQ the day they arrive — no exceptions.",
        "Marisol to cover guest services while Ricardo is on leave.",
      ].join("\n"),
    }));
    insert("meetings", stamped({
      id: uid(), title: "Owner call — Sunrise Holdings", meeting_date: day(-3),
      attendees: "Joshua, Sunrise Holdings (F. Oduber)",
      agenda: "August statement, pool works, 2027 rate strategy.",
      notes: "Walked through the August payout of AWG 24,180. Owner comfortable with the resurfacing budget.",
      decisions: [
        "Owner approves up to AWG 45,000 for the pool works.",
        "Rates for 2027 to be proposed by 30 September.",
      ].join("\n"),
    }));

    // ---------------------------------------------------------------- events
    const events: Array<Record<string, unknown>> = [
      { title: "Monthly operations review", type: "meeting", start_date: day(2), start_time: "09:00", location: "Oranjestad office" },
      { title: "Owner payouts released", type: "deadline", start_date: day(3) },
      { title: "Tourist levy filing deadline", type: "deadline", start_date: day(-1) },
      { title: "Insurance policy expires", type: "deadline", start_date: day(34) },
      { title: "Shanice returns from leave", type: "employee", start_date: day(10) },
      { title: "CoolBreeze quarterly A/C service", type: "maintenance", start_date: day(7), location: "All properties" },
      { title: "Pool resurfacing kick-off", type: "maintenance", start_date: day(20), property_id: prop.eagle },
      { title: "Accountant quarterly check-in", type: "meeting", start_date: day(28), start_time: "14:00" },
    ];
    for (const e of events) {
      insert("events", stamped({
        id: uid(), all_day: 1, end_date: null, start_time: null,
        location: null, property_id: null, notes: null, ...e,
      }));
    }

    // -------------------------------------------------------------- listings
    const ONBOARDING_STEPS = [
      "Property details collected (address, access, WiFi, house rules)",
      "Professional photos taken",
      "Listing title & description written",
      "Amenities list finalized",
      "Pricing & minimum-stay set",
      "House rules & cancellation policy set",
      "Calendar / availability set",
      "Airbnb listing created",
      "Guesty listing created & PMS connected",
      "Channel manager sync verified (Airbnb ⇄ Guesty)",
      "Payout / banking details configured",
      "Listing published & live",
    ];
    const addListing = (
      row: Record<string, unknown>,
      doneCount: number,
    ) => {
      const listingId = uid();
      insert("listings", stamped({ id: listingId, platforms: "both", assignee: null, notes: null, ...row }));
      ONBOARDING_STEPS.forEach((label, i) =>
        insert("listing_steps", {
          id: uid(),
          listing_id: listingId,
          label,
          sort: i,
          done: i < doneCount ? 1 : 0,
          done_at: i < doneCount ? ts : null,
          created_at: ts,
        }),
      );
      return listingId;
    };

    addListing(
      {
        name: "Malmok Cliff Villa",
        address: "Malmok 12A",
        owner_name: "Blue Horizon Ltd",
        platforms: "both",
        target_date: day(30),
        assignee: "Ricardo Croes",
        status: "in_progress",
        notes: "Owner wants to see the listing live before the winter season.",
      },
      4, // matches the still-open "Photograph Malmok Cliff Villa" task
    );

    addListing(
      {
        name: "Boca Chica Bungalow",
        address: "Boca Chica 7",
        owner_name: "R. Kelkboom",
        platforms: "airbnb",
        target_date: day(45),
        assignee: "Marisol Kock",
        status: "in_progress",
        notes: "Brand new to the portfolio — first walkthrough scheduled next week.",
      },
      0,
    );

    addListing(
      {
        name: "Oranjestad Lofts — Unit 3",
        address: "Wilhelminastraat 63, Oranjestad",
        owner_name: "Coralux NV",
        platforms: "both",
        target_date: day(-40),
        assignee: "Ricardo Croes",
        status: "active",
        notes: null,
      },
      ONBOARDING_STEPS.length,
    );

    // ----------------------------------------------------------------- notes
    const note = (entity: string, entityId: string, body: string, pinned = 0) =>
      insert("notes", stamped({ id: uid(), entity, entity_id: entityId, body, author_id: owner, pinned }));

    note("vendors", ven.pool, "Call before changing the pool schedule — John plans his week on Sunday evening.", 1);
    note("vendors", ven.pool, "Price list is fixed until the end of the year. Anything above AWG 1,300/month needs a reason.");
    note("vendors", ven.elec, "Emergency call-outs are billed at 1.5× after 18:00. Worth checking before calling them at night.");
    note("properties", prop.eagle, "Pool pumps are the known weak point. Two failures this year already.", 1);
    note("invoices", inv.poolAug, "Higher than usual because of the extra pump service. Verified against the price list.");

    // ------------------------------------------------------------ categories
    const cats: [string, string][] = [
      ["spend", "Pool maintenance"], ["spend", "Landscaping"], ["spend", "Cleaning"],
      ["spend", "Repairs & maintenance"], ["spend", "Utilities"], ["spend", "Software & subscriptions"],
      ["file", "Contracts"], ["file", "Invoices"], ["file", "Licences"],
      ["file", "HR"], ["file", "Templates"], ["file", "Photos"],
    ];
    cats.forEach(([kind, name], i) => insert("categories", { id: uid(), kind, name, sort: i }));

    insert("settings", { key: "company_name", value: "Coralux" });
    insert("settings", { key: "base_currency", value: "AWG" });
  });

  tx();
}
