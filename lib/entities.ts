import type { Role } from "./roles";

export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "money"
  | "date"
  | "time"
  | "select"
  | "ref"
  | "bool"
  | "email"
  | "phone";

export type Option = { value: string; label: string; tone?: Tone };
export type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "muted";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
  /** entity key this field points at, for type: "ref" */
  ref?: EntityKey;
  required?: boolean;
  /** show as a column in the list view */
  inList?: boolean;
  /** form section heading */
  group?: string;
  /** minimum role required to see or edit this field */
  restricted?: Role;
  help?: string;
  placeholder?: string;
  full?: boolean;
  /** editable straight from the list row, without opening the record */
  editable?: boolean;
};

/** A saved split of a list, shown as tabs above the table. */
export type EntityTab = {
  key: string;
  label: string;
  match: (row: Record<string, any>) => boolean;
};

export type Related = {
  label: string;
  entity: EntityKey;
  /** column on the related table pointing back at this record */
  fk: string;
};

export type Entity = {
  key: EntityKey;
  table: string;
  label: string;
  singular: string;
  icon: string;
  blurb: string;
  titleField: string;
  subtitleField?: string;
  fields: Field[];
  related?: Related[];
  defaultSort: string;
  searchFields: string[];
  /** minimum role required to open this section at all */
  minRole?: Role;
  /** splits the list into tabs */
  tabs?: EntityTab[];
  /** finished records, moved out of the main table into their own section */
  archive?: { label: string; match: (row: Record<string, any>) => boolean };
};

export type EntityKey =
  | "tasks"
  | "projects"
  | "requests"
  | "ideas"
  | "invoices"
  | "payments"
  | "payouts"
  | "recurring"
  | "contracts"
  | "employees"
  | "timeoff"
  | "vendors"
  | "contacts"
  | "properties"
  | "assets"
  | "sops"
  | "meetings"
  | "events"
  | "inventory";

// ---------------------------------------------------------------- option sets

const STATUS_TASK: Option[] = [
  { value: "todo", label: "To do", tone: "neutral" },
  { value: "in_progress", label: "In progress", tone: "info" },
  { value: "blocked", label: "Blocked", tone: "bad" },
  { value: "done", label: "Done", tone: "good" },
];

const PRIORITY: Option[] = [
  { value: "low", label: "Low", tone: "muted" },
  { value: "medium", label: "Medium", tone: "neutral" },
  { value: "high", label: "High", tone: "warn" },
  { value: "urgent", label: "Urgent", tone: "bad" },
];

const RECURRENCE: Option[] = [
  { value: "none", label: "One-off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const INVOICE_STATUS: Option[] = [
  { value: "unpaid", label: "Unpaid", tone: "warn" },
  { value: "partial", label: "Partially paid", tone: "info" },
  { value: "paid", label: "Paid", tone: "good" },
  { value: "disputed", label: "Disputed", tone: "bad" },
  { value: "void", label: "Void", tone: "muted" },
];

const PAY_METHOD: Option[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const SPEND_CATEGORY: Option[] = [
  { value: "pool_maintenance", label: "Pool maintenance" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "repairs", label: "Repairs & maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "software", label: "Software & subscriptions" },
  { value: "insurance", label: "Insurance" },
  { value: "professional", label: "Professional services" },
  { value: "marketing", label: "Marketing" },
  { value: "supplies", label: "Supplies" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

const CURRENCY: Option[] = [
  { value: "AWG", label: "AWG — Aruban florin" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const FREQUENCY: Option[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
];

const ACTIVE_STATUS: Option[] = [
  { value: "active", label: "Active", tone: "good" },
  { value: "inactive", label: "Inactive", tone: "muted" },
];

const money = (name = "amount", label = "Amount"): Field => ({
  name,
  label,
  type: "money",
  inList: true,
  required: true,
});

const currency: Field = {
  name: "currency",
  label: "Currency",
  type: "select",
  options: CURRENCY,
};

// ------------------------------------------------------------------ entities

export const ENTITIES: Record<EntityKey, Entity> = {
  tasks: {
    key: "tasks",
    table: "tasks",
    label: "Tasks",
    singular: "Task",
    icon: "check",
    blurb: "Everything that needs doing, who owns it, and when it is due.",
    titleField: "title",
    defaultSort: "status = 'done', due_date IS NULL, due_date ASC",
    searchFields: ["title", "description"],
    fields: [
      { name: "title", label: "Task", type: "text", required: true, inList: true, full: true },
      { name: "description", label: "Details", type: "textarea", full: true },
      { name: "status", label: "Status", type: "select", options: STATUS_TASK, inList: true, required: true, editable: true },
      { name: "priority", label: "Priority", type: "select", options: PRIORITY, inList: true, required: true, editable: true },
      { name: "due_date", label: "Due date", type: "date", inList: true, editable: true },
      { name: "assignee_id", label: "Assigned to", type: "ref", ref: "employees", inList: true },
      { name: "recurrence", label: "Repeats", type: "select", options: RECURRENCE },
      { name: "project_id", label: "Project", type: "ref", ref: "projects", group: "Links" },
      { name: "property_id", label: "Property", type: "ref", ref: "properties", group: "Links" },
      { name: "vendor_id", label: "Vendor", type: "ref", ref: "vendors", group: "Links" },
    ],
    tabs: [
      {
        key: "oneoff",
        label: "One-off tasks",
        match: (r) => !r.recurrence || r.recurrence === "none",
      },
      {
        key: "recurring",
        label: "Recurring tasks",
        match: (r) => Boolean(r.recurrence) && r.recurrence !== "none",
      },
    ],
    archive: { label: "Completed", match: (r) => r.status === "done" },
  },

  projects: {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "Project",
    icon: "layers",
    blurb: "Larger initiatives with their own tasks, deadlines and documents.",
    titleField: "name",
    defaultSort: "due_date IS NULL, due_date ASC",
    searchFields: ["name", "description"],
    fields: [
      { name: "name", label: "Project", type: "text", required: true, inList: true, full: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "planned", label: "Planned", tone: "neutral" },
          { value: "active", label: "Active", tone: "info" },
          { value: "on_hold", label: "On hold", tone: "warn" },
          { value: "done", label: "Complete", tone: "good" },
          { value: "cancelled", label: "Cancelled", tone: "muted" },
        ],
      },
      { name: "owner_id", label: "Responsible", type: "ref", ref: "employees", inList: true },
      { name: "start_date", label: "Start date", type: "date" },
      { name: "due_date", label: "Target date", type: "date", inList: true },
      { name: "budget", label: "Budget", type: "money" },
    ],
    related: [{ label: "Tasks", entity: "tasks", fk: "project_id" }],
  },

  requests: {
    key: "requests",
    table: "requests",
    label: "Requests",
    singular: "Request",
    icon: "inbox",
    blurb: "Staff requests for purchases, equipment or support — approve or decline here.",
    titleField: "title",
    defaultSort: "created_at DESC",
    searchFields: ["title", "description"],
    fields: [
      { name: "title", label: "What is needed", type: "text", required: true, inList: true, full: true },
      { name: "description", label: "Why / details", type: "textarea", full: true },
      { name: "requester_id", label: "Requested by", type: "ref", ref: "employees", inList: true },
      { name: "category", label: "Category", type: "select", options: SPEND_CATEGORY, inList: true },
      { name: "amount", label: "Estimated cost", type: "money", inList: true },
      currency,
      { name: "property_id", label: "For property", type: "ref", ref: "properties" },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "submitted", label: "Submitted", tone: "warn" },
          { value: "approved", label: "Approved", tone: "good" },
          { value: "rejected", label: "Rejected", tone: "bad" },
          { value: "ordered", label: "Ordered", tone: "info" },
          { value: "done", label: "Received", tone: "good" },
        ],
      },
      { name: "decision_note", label: "Decision note", type: "textarea", full: true, group: "Decision" },
    ],
  },

  ideas: {
    key: "ideas",
    table: "ideas",
    label: "Ideas",
    singular: "Idea",
    icon: "bulb",
    blurb: "Improvements, marketing thoughts and future projects — before they get lost.",
    titleField: "title",
    defaultSort: "created_at DESC",
    searchFields: ["title", "description"],
    fields: [
      { name: "title", label: "Idea", type: "text", required: true, inList: true, full: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      {
        name: "category",
        label: "Area",
        type: "select",
        inList: true,
        options: [
          { value: "marketing", label: "Marketing" },
          { value: "operations", label: "Operations" },
          { value: "guest_experience", label: "Guest experience" },
          { value: "cost_saving", label: "Cost saving" },
          { value: "technology", label: "Technology" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "new", label: "New", tone: "info" },
          { value: "exploring", label: "Exploring", tone: "neutral" },
          { value: "planned", label: "Planned", tone: "warn" },
          { value: "done", label: "Done", tone: "good" },
          { value: "parked", label: "Parked", tone: "muted" },
        ],
        editable: true,
      },
      {
        name: "impact",
        label: "Impact",
        type: "select",
        inList: true,
        editable: true,
        options: [
          { value: "low", label: "Low", tone: "muted" },
          { value: "medium", label: "Medium", tone: "neutral" },
          { value: "high", label: "High", tone: "good" },
        ],
      },
      {
        name: "effort",
        label: "Effort",
        type: "select",
        inList: true,
        editable: true,
        options: [
          { value: "low", label: "Low", tone: "muted" },
          { value: "medium", label: "Medium", tone: "neutral" },
          { value: "high", label: "High", tone: "warn" },
        ],
      },
      { name: "author_id", label: "Suggested by", type: "ref", ref: "employees" },
    ],
    archive: { label: "Done & parked", match: (r) => r.status === "done" || r.status === "parked" },
  },

  invoices: {
    key: "invoices",
    table: "invoices",
    label: "Invoices",
    singular: "Invoice",
    icon: "receipt",
    blurb: "A searchable database of supplier invoices — not a folder of loose PDFs.",
    titleField: "invoice_number",
    defaultSort: "due_date IS NULL, due_date ASC",
    searchFields: ["invoice_number", "notes", "category"],
    minRole: "manager",
    fields: [
      { name: "invoice_number", label: "Invoice #", type: "text", required: true, inList: true },
      { name: "vendor_id", label: "Vendor", type: "ref", ref: "vendors", inList: true, required: true },
      { name: "issue_date", label: "Invoice date", type: "date", inList: true },
      { name: "due_date", label: "Due date", type: "date", inList: true },
      money(),
      currency,
      { name: "category", label: "Category", type: "select", options: SPEND_CATEGORY, inList: true },
      { name: "status", label: "Status", type: "select", options: INVOICE_STATUS, inList: true, required: true },
      { name: "property_id", label: "Property", type: "ref", ref: "properties", group: "Links" },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
    related: [{ label: "Payments", entity: "payments", fk: "invoice_id" }],
  },

  payments: {
    key: "payments",
    table: "payments",
    label: "Payments",
    singular: "Payment",
    icon: "card",
    blurb: "Money that has actually left the account, with proof attached.",
    titleField: "reference",
    defaultSort: "payment_date DESC",
    searchFields: ["reference", "bank", "notes"],
    minRole: "manager",
    fields: [
      { name: "invoice_id", label: "Pays invoice", type: "ref", ref: "invoices", inList: true },
      { name: "vendor_id", label: "Paid to", type: "ref", ref: "vendors", inList: true },
      { name: "payment_date", label: "Payment date", type: "date", inList: true, required: true },
      money(),
      currency,
      { name: "method", label: "Method", type: "select", options: PAY_METHOD, inList: true },
      { name: "bank", label: "Bank / account", type: "text", placeholder: "Aruba Bank" },
      { name: "reference", label: "Reference", type: "text", inList: true, placeholder: "839292" },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  payouts: {
    key: "payouts",
    table: "payouts",
    label: "Payouts",
    singular: "Payout",
    icon: "bank",
    blurb: "Owner, company and vendor payouts with status and proof of transfer.",
    titleField: "payee_name",
    defaultSort: "payout_date DESC",
    searchFields: ["payee_name", "reference", "period", "notes"],
    minRole: "manager",
    fields: [
      { name: "payee_name", label: "Paid to", type: "text", required: true, inList: true },
      {
        name: "payee_type",
        label: "Payee type",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "owner", label: "Property owner" },
          { value: "company", label: "Company" },
          { value: "vendor", label: "Vendor" },
          { value: "employee", label: "Employee" },
        ],
      },
      { name: "property_id", label: "Property", type: "ref", ref: "properties", inList: true },
      { name: "period", label: "Period", type: "text", placeholder: "August 2026", inList: true },
      { name: "payout_date", label: "Payout date", type: "date", inList: true },
      money(),
      currency,
      { name: "method", label: "Method", type: "select", options: PAY_METHOD },
      { name: "reference", label: "Reference", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "scheduled", label: "Scheduled", tone: "warn" },
          { value: "sent", label: "Sent", tone: "info" },
          { value: "cleared", label: "Cleared", tone: "good" },
          { value: "failed", label: "Failed", tone: "bad" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  recurring: {
    key: "recurring",
    table: "recurring_expenses",
    label: "Recurring",
    singular: "Recurring expense",
    icon: "repeat",
    blurb: "Subscriptions, insurance, licences and phone plans that bill on their own.",
    titleField: "name",
    defaultSort: "next_due IS NULL, next_due ASC",
    searchFields: ["name", "notes"],
    minRole: "manager",
    fields: [
      { name: "name", label: "Expense", type: "text", required: true, inList: true, full: true },
      { name: "vendor_id", label: "Vendor", type: "ref", ref: "vendors", inList: true },
      { name: "category", label: "Category", type: "select", options: SPEND_CATEGORY, inList: true },
      money(),
      currency,
      { name: "frequency", label: "Billing cycle", type: "select", options: FREQUENCY, inList: true, required: true },
      { name: "next_due", label: "Next charge", type: "date", inList: true },
      { name: "payment_method", label: "Paid by", type: "select", options: PAY_METHOD },
      { name: "status", label: "Status", type: "select", options: ACTIVE_STATUS, inList: true, required: true },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  contracts: {
    key: "contracts",
    table: "contracts",
    label: "Contracts",
    singular: "Contract",
    icon: "shield",
    blurb: "Agreements, insurance and licences — with renewal dates that surface early.",
    titleField: "name",
    defaultSort: "end_date IS NULL, end_date ASC",
    searchFields: ["name", "notes"],
    minRole: "manager",
    fields: [
      { name: "name", label: "Contract", type: "text", required: true, inList: true, full: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        inList: true,
        options: [
          { value: "vendor", label: "Vendor agreement" },
          { value: "insurance", label: "Insurance" },
          { value: "licence", label: "Licence / permit" },
          { value: "lease", label: "Lease" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "vendor_id", label: "Counterparty", type: "ref", ref: "vendors", inList: true },
      { name: "property_id", label: "Property", type: "ref", ref: "properties" },
      { name: "start_date", label: "Starts", type: "date" },
      { name: "end_date", label: "Expires", type: "date", inList: true },
      { name: "notice_days", label: "Notice period (days)", type: "number", help: "How far ahead you must give notice." },
      { name: "value", label: "Value", type: "money" },
      currency,
      { name: "auto_renew", label: "Renews automatically", type: "bool" },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "active", label: "Active", tone: "good" },
          { value: "expiring", label: "Expiring", tone: "warn" },
          { value: "expired", label: "Expired", tone: "bad" },
          { value: "terminated", label: "Terminated", tone: "muted" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  employees: {
    key: "employees",
    table: "employees",
    label: "Employees",
    singular: "Employee",
    icon: "users",
    blurb: "The team directory. Pay, ID numbers and permits are visible to admins only.",
    titleField: "name",
    subtitleField: "position",
    defaultSort: "name ASC",
    searchFields: ["name", "position", "department", "email"],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, inList: true },
      { name: "position", label: "Position", type: "text", inList: true },
      {
        name: "department",
        label: "Department",
        type: "select",
        inList: true,
        options: [
          { value: "management", label: "Management" },
          { value: "property_management", label: "Property management" },
          { value: "housekeeping", label: "Housekeeping" },
          { value: "maintenance", label: "Maintenance" },
          { value: "guest_services", label: "Guest services" },
          { value: "finance", label: "Finance & admin" },
        ],
      },
      { name: "phone", label: "Phone", type: "phone", inList: true },
      { name: "email", label: "Email", type: "email", inList: true },
      { name: "start_date", label: "Start date", type: "date", inList: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "active", label: "Active", tone: "good" },
          { value: "on_leave", label: "On leave", tone: "warn" },
          { value: "former", label: "Former", tone: "muted" },
        ],
      },
      { name: "emergency_contact", label: "Emergency contact", type: "text", group: "Personal" },
      { name: "end_date", label: "End date", type: "date", group: "Personal" },

      // ---- restricted block ----
      { name: "contract_type", label: "Contract type", type: "select", group: "Employment (restricted)", restricted: "admin",
        options: [
          { value: "permanent", label: "Permanent" },
          { value: "fixed_term", label: "Fixed term" },
          { value: "part_time", label: "Part time" },
          { value: "contractor", label: "Contractor" },
        ] },
      { name: "pay_type", label: "Pay type", type: "select", group: "Employment (restricted)", restricted: "admin",
        options: [
          { value: "salary", label: "Monthly salary" },
          { value: "hourly", label: "Hourly" },
        ] },
      { name: "pay_rate", label: "Rate", type: "money", group: "Employment (restricted)", restricted: "admin" },
      { ...currency, group: "Employment (restricted)", restricted: "admin", name: "pay_currency" },
      { name: "vacation_allowance", label: "Vacation days per year", type: "number", group: "Employment (restricted)", restricted: "admin" },
      { name: "vacation_used", label: "Vacation days used", type: "number", group: "Employment (restricted)", restricted: "admin" },
      { name: "national_id", label: "ID / passport no.", type: "text", group: "Employment (restricted)", restricted: "admin" },
      { name: "work_permit_no", label: "Work permit no.", type: "text", group: "Employment (restricted)", restricted: "admin" },
      { name: "work_permit_expiry", label: "Work permit expires", type: "date", group: "Employment (restricted)", restricted: "admin" },
      { name: "notes", label: "Notes", type: "textarea", full: true, restricted: "manager" },
    ],
    related: [
      { label: "Assigned tasks", entity: "tasks", fk: "assignee_id" },
      { label: "Time off", entity: "timeoff", fk: "employee_id" },
      { label: "Company assets", entity: "assets", fk: "assigned_to" },
      { label: "Requests", entity: "requests", fk: "requester_id" },
    ],
  },

  timeoff: {
    key: "timeoff",
    table: "time_off",
    label: "Time off",
    singular: "Time off request",
    icon: "sun",
    blurb: "Vacation, sick days and leave — requested, approved and counted.",
    titleField: "type",
    defaultSort: "start_date DESC",
    searchFields: ["notes"],
    minRole: "manager",
    fields: [
      { name: "employee_id", label: "Employee", type: "ref", ref: "employees", required: true, inList: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "vacation", label: "Vacation", tone: "info" },
          { value: "sick", label: "Sick", tone: "warn" },
          { value: "unpaid", label: "Unpaid leave", tone: "muted" },
          { value: "other", label: "Other", tone: "neutral" },
        ],
      },
      { name: "start_date", label: "From", type: "date", inList: true, required: true },
      { name: "end_date", label: "To", type: "date", inList: true },
      { name: "days", label: "Days", type: "number", inList: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "requested", label: "Requested", tone: "warn" },
          { value: "approved", label: "Approved", tone: "good" },
          { value: "rejected", label: "Rejected", tone: "bad" },
          { value: "cancelled", label: "Cancelled", tone: "muted" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  vendors: {
    key: "vendors",
    table: "vendors",
    label: "Vendors",
    singular: "Vendor",
    icon: "wrench",
    blurb: "Pool, landscaping, maintenance, electricians, plumbers — and their paperwork.",
    titleField: "name",
    subtitleField: "category",
    defaultSort: "name ASC",
    searchFields: ["name", "contact_name", "email", "phone", "category"],
    fields: [
      { name: "name", label: "Company", type: "text", required: true, inList: true },
      {
        name: "category",
        label: "Service",
        type: "select",
        inList: true,
        options: [
          { value: "pool", label: "Pool maintenance" },
          { value: "landscaping", label: "Landscaping" },
          { value: "cleaning", label: "Cleaning" },
          { value: "electrical", label: "Electrical" },
          { value: "plumbing", label: "Plumbing" },
          { value: "ac", label: "Air conditioning" },
          { value: "pest", label: "Pest control" },
          { value: "construction", label: "Construction" },
          { value: "software", label: "Software" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "contact_name", label: "Contact person", type: "text", inList: true },
      { name: "phone", label: "Phone", type: "phone", inList: true },
      { name: "email", label: "Email", type: "email", inList: true },
      { name: "address", label: "Address", type: "text", full: true },
      { name: "payment_terms", label: "Payment terms", type: "text", inList: true, placeholder: "Monthly, net 30" },
      { name: "status", label: "Status", type: "select", options: ACTIVE_STATUS, inList: true, required: true },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
    related: [
      { label: "Invoices", entity: "invoices", fk: "vendor_id" },
      { label: "Payments", entity: "payments", fk: "vendor_id" },
      { label: "Contracts", entity: "contracts", fk: "vendor_id" },
      { label: "Recurring expenses", entity: "recurring", fk: "vendor_id" },
      { label: "Tasks", entity: "tasks", fk: "vendor_id" },
    ],
  },

  contacts: {
    key: "contacts",
    table: "contacts",
    label: "Contacts",
    singular: "Contact",
    icon: "phone",
    blurb: "Owners, agencies, inspectors and everyone else worth having a number for.",
    titleField: "name",
    subtitleField: "company",
    defaultSort: "name ASC",
    searchFields: ["name", "company", "email", "phone", "role"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "company", label: "Company", type: "text", inList: true },
      { name: "role", label: "Role", type: "text", inList: true },
      {
        name: "type",
        label: "Relationship",
        type: "select",
        inList: true,
        options: [
          { value: "owner", label: "Property owner" },
          { value: "guest", label: "Guest" },
          { value: "government", label: "Government" },
          { value: "bank", label: "Bank" },
          { value: "legal", label: "Legal / accounting" },
          { value: "agency", label: "Agency" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "phone", label: "Phone", type: "phone", inList: true },
      { name: "email", label: "Email", type: "email", inList: true },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  properties: {
    key: "properties",
    table: "properties",
    label: "Properties",
    singular: "Property",
    icon: "home",
    blurb: "The units under management, and everything attached to each one.",
    titleField: "name",
    subtitleField: "address",
    defaultSort: "name ASC",
    searchFields: ["name", "address", "owner_name"],
    fields: [
      { name: "name", label: "Property", type: "text", required: true, inList: true },
      { name: "address", label: "Address", type: "text", inList: true, full: true },
      { name: "owner_name", label: "Owner", type: "text", inList: true },
      { name: "units", label: "Units", type: "number", inList: true },
      { name: "status", label: "Status", type: "select", options: ACTIVE_STATUS, inList: true, required: true },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
    related: [
      { label: "Tasks", entity: "tasks", fk: "property_id" },
      { label: "Invoices", entity: "invoices", fk: "property_id" },
      { label: "Payouts", entity: "payouts", fk: "property_id" },
      { label: "Contracts", entity: "contracts", fk: "property_id" },
      { label: "Assets on site", entity: "assets", fk: "property_id" },
    ],
  },

  assets: {
    key: "assets",
    table: "assets",
    label: "Assets",
    singular: "Asset",
    icon: "box",
    blurb: "Laptops, phones, vehicles, keys and equipment — and who is holding them.",
    titleField: "name",
    defaultSort: "name ASC",
    searchFields: ["name", "serial_number", "notes"],
    fields: [
      { name: "name", label: "Asset", type: "text", required: true, inList: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        inList: true,
        options: [
          { value: "laptop", label: "Laptop" },
          { value: "phone", label: "Phone" },
          { value: "vehicle", label: "Vehicle" },
          { value: "keys", label: "Keys / fobs" },
          { value: "equipment", label: "Equipment" },
          { value: "uniform", label: "Uniform" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "serial_number", label: "Serial / plate", type: "text", inList: true },
      { name: "assigned_to", label: "Held by", type: "ref", ref: "employees", inList: true },
      { name: "property_id", label: "Located at", type: "ref", ref: "properties" },
      { name: "purchase_date", label: "Purchased", type: "date" },
      { name: "value", label: "Value", type: "money" },
      currency,
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "in_use", label: "In use", tone: "good" },
          { value: "spare", label: "Spare", tone: "neutral" },
          { value: "repair", label: "In repair", tone: "warn" },
          { value: "retired", label: "Retired", tone: "muted" },
          { value: "lost", label: "Lost", tone: "bad" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  sops: {
    key: "sops",
    table: "sops",
    label: "SOPs",
    singular: "SOP",
    icon: "book",
    blurb: "How things are done here, written down once instead of explained ten times.",
    titleField: "title",
    subtitleField: "category",
    defaultSort: "title ASC",
    searchFields: ["title", "category", "content"],
    fields: [
      { name: "title", label: "Procedure", type: "text", required: true, inList: true, full: true },
      {
        name: "category",
        label: "Area",
        type: "select",
        inList: true,
        options: [
          { value: "check_in", label: "Check-in / check-out" },
          { value: "housekeeping", label: "Housekeeping" },
          { value: "maintenance", label: "Maintenance" },
          { value: "finance", label: "Finance" },
          { value: "hr", label: "HR" },
          { value: "emergency", label: "Emergency" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "content", label: "Steps", type: "richtext", full: true, help: "One step per line." },
      { name: "owner_id", label: "Owner", type: "ref", ref: "employees", inList: true },
      { name: "version", label: "Version", type: "text", inList: true },
      { name: "review_date", label: "Review by", type: "date", inList: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "draft", label: "Draft", tone: "warn" },
          { value: "active", label: "Active", tone: "good" },
          { value: "retired", label: "Retired", tone: "muted" },
        ],
      },
    ],
  },

  meetings: {
    key: "meetings",
    table: "meetings",
    label: "Meeting notes",
    singular: "Meeting",
    icon: "chat",
    blurb: "Decisions live here instead of disappearing into WhatsApp.",
    titleField: "title",
    defaultSort: "meeting_date DESC",
    searchFields: ["title", "notes", "decisions", "attendees"],
    fields: [
      { name: "title", label: "Meeting", type: "text", required: true, inList: true, full: true },
      { name: "meeting_date", label: "Date", type: "date", inList: true, required: true },
      { name: "attendees", label: "Attendees", type: "text", inList: true, full: true },
      { name: "agenda", label: "Agenda", type: "textarea", full: true },
      { name: "notes", label: "Notes", type: "richtext", full: true },
      { name: "decisions", label: "Decisions", type: "richtext", full: true, help: "One decision per line." },
    ],
  },

  events: {
    key: "events",
    table: "events",
    label: "Events",
    singular: "Event",
    icon: "calendar",
    blurb: "Meetings, inspections and company dates that are not tasks.",
    titleField: "title",
    defaultSort: "start_date ASC",
    searchFields: ["title", "location", "notes"],
    fields: [
      { name: "title", label: "Event", type: "text", required: true, inList: true, full: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        inList: true,
        required: true,
        options: [
          { value: "meeting", label: "Meeting", tone: "info" },
          { value: "deadline", label: "Deadline", tone: "warn" },
          { value: "employee", label: "Employee", tone: "neutral" },
          { value: "maintenance", label: "Maintenance", tone: "neutral" },
          { value: "other", label: "Other", tone: "muted" },
        ],
      },
      { name: "start_date", label: "Date", type: "date", inList: true, required: true },
      { name: "start_time", label: "Time", type: "time", inList: true },
      { name: "end_date", label: "Ends", type: "date" },
      { name: "location", label: "Location", type: "text", inList: true },
      { name: "property_id", label: "Property", type: "ref", ref: "properties" },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },

  inventory: {
    key: "inventory",
    table: "inventory",
    label: "Inventory",
    singular: "Item",
    icon: "box",
    blurb: "Cleaning supplies, linens and amenities — what's in stock, and what's running low.",
    titleField: "name",
    subtitleField: "category",
    defaultSort: "status = 'out' DESC, status = 'low' DESC, name ASC",
    searchFields: ["name", "category", "location", "notes"],
    fields: [
      { name: "name", label: "Item", type: "text", required: true, inList: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        inList: true,
        options: [
          { value: "cleaning_supplies", label: "Cleaning supplies" },
          { value: "linens", label: "Linens" },
          { value: "amenities", label: "Guest amenities" },
          { value: "paper_goods", label: "Paper goods" },
          { value: "equipment", label: "Equipment" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "quantity", label: "Quantity", type: "number", inList: true, required: true, editable: true },
      { name: "unit", label: "Unit", type: "text", placeholder: "rolls, bottles, sets…" },
      {
        name: "par_level",
        label: "Reorder below",
        type: "number",
        help: "When quantity falls below this, mark it Low.",
      },
      { name: "location", label: "Location", type: "text", inList: true, placeholder: "Storage — Eagle Beach" },
      {
        name: "status",
        label: "Status",
        type: "select",
        inList: true,
        required: true,
        editable: true,
        options: [
          { value: "in_stock", label: "In stock", tone: "good" },
          { value: "low", label: "Low", tone: "warn" },
          { value: "out", label: "Out", tone: "bad" },
          { value: "discontinued", label: "Discontinued", tone: "muted" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export function getEntity(key: string): Entity | undefined {
  return ENTITIES[key as EntityKey];
}

export function fieldByName(entity: Entity, name: string): Field | undefined {
  return entity.fields.find((f) => f.name === name);
}

export function optionLabel(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const opt = field.options?.find((o) => o.value === String(value));
  return opt ? opt.label : String(value);
}

export function optionTone(field: Field, value: unknown): Tone {
  const opt = field.options?.find((o) => o.value === String(value));
  return opt?.tone ?? "neutral";
}

/**
 * ---------------------------------------------------------------------------
 * Phase one.
 *
 * Every section in ENTITIES above is fully built — forms, lists, detail pages,
 * notes, documents and history. These are the ones switched ON right now.
 * To bring another one live, add its key to this list (and its page to
 * ENABLED_PAGES below if it has a custom screen). Nothing else to change.
 *
 * Ready to switch on when you are:
 *   invoices, payments, payouts, recurring, contracts, employees, timeoff,
 *   contacts, properties, assets, sops, meetings, projects, requests
 *   plus the pages "/files" and "/reports".
 * ---------------------------------------------------------------------------
 */
export const ENABLED_SECTIONS: EntityKey[] = ["tasks", "ideas", "vendors", "events", "inventory"];

/** Custom screens (not backed by a single entity) that are switched on. */
export const ENABLED_PAGES: string[] = ["/", "/calendar", "/admin", "/listings", "/cleaning"];

export function isEnabled(key: string): boolean {
  return (ENABLED_SECTIONS as string[]).includes(key);
}

export function isPageEnabled(href: string): boolean {
  return ENABLED_PAGES.includes(href);
}

type NavItem = { href: string; label: string; icon: string; minRole?: Role; entity?: EntityKey };

/** Every section the app can show. Filtered to the enabled ones by NAV below. */
const ALL_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: "grid" },
      { href: "/calendar", label: "Calendar", icon: "calendar" },
    ],
  },
  {
    group: "Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: "check", entity: "tasks" },
      { href: "/listings", label: "Listing Onboarding", icon: "clipboard" },
      { href: "/projects", label: "Projects", icon: "layers", entity: "projects" },
      { href: "/requests", label: "Requests", icon: "inbox", entity: "requests" },
      { href: "/ideas", label: "Ideas", icon: "bulb", entity: "ideas" },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/invoices", label: "Invoices", icon: "receipt", entity: "invoices", minRole: "manager" },
      { href: "/payments", label: "Payments", icon: "card", entity: "payments", minRole: "manager" },
      { href: "/payouts", label: "Payouts", icon: "bank", entity: "payouts", minRole: "manager" },
      { href: "/recurring", label: "Recurring", icon: "repeat", entity: "recurring", minRole: "manager" },
      { href: "/contracts", label: "Contracts", icon: "shield", entity: "contracts", minRole: "manager" },
      { href: "/reports", label: "Reports", icon: "chart", minRole: "manager" },
    ],
  },
  {
    group: "People",
    items: [
      { href: "/employees", label: "Employees", icon: "users", entity: "employees" },
      { href: "/timeoff", label: "Time off", icon: "sun", entity: "timeoff", minRole: "manager" },
      { href: "/vendors", label: "Vendors", icon: "wrench", entity: "vendors" },
      { href: "/contacts", label: "Contacts", icon: "phone", entity: "contacts" },
    ],
  },
  {
    group: "Cleaners",
    items: [
      { href: "/cleaning", label: "Cleaning Schedule", icon: "sparkle" },
      { href: "/inventory", label: "Inventory", icon: "box", entity: "inventory" },
    ],
  },
  {
    group: "Records",
    items: [
      { href: "/properties", label: "Properties", icon: "home", entity: "properties" },
      { href: "/assets", label: "Assets", icon: "box", entity: "assets" },
      { href: "/files", label: "Files", icon: "folder" },
      { href: "/sops", label: "SOPs", icon: "book", entity: "sops" },
      { href: "/meetings", label: "Meeting notes", icon: "chat", entity: "meetings" },
    ],
  },
  {
    group: "Settings",
    items: [{ href: "/admin", label: "Admin", icon: "lock", minRole: "admin" }],
  },
];

/** Navigation groups used by the sidebar — enabled sections only. */
export const NAV = ALL_NAV.map((group) => ({
  ...group,
  items: group.items.filter((item) =>
    item.entity ? isEnabled(item.entity) : isPageEnabled(item.href),
  ),
})).filter((group) => group.items.length > 0);
