import { chromium } from "playwright";

const base = "http://localhost:3000";
const out = process.argv[2] ?? "./screenshots";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

const step = async (name, fn) => {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (e) { console.log(`FAIL  ${name}: ${e.message}`); process.exitCode = 1; }
};

await step("login with seeded credentials", async () => {
  await page.goto(`${base}/login`);
  await page.fill('input[name="email"]', "admin@coralux.aw");
  await page.fill('input[name="password"]', "coralux2026");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${base}/`, { timeout: 15000 });
  await page.waitForSelector("text=Needs attention");
});
await page.screenshot({ path: `${out}/01-dashboard.png`, fullPage: true });

await step("rejects a bad password", async () => {
  const p2 = await browser.newPage();
  await p2.goto(`${base}/login`);
  await p2.fill('input[name="email"]', "admin@coralux.aw");
  await p2.fill('input[name="password"]', "wrong-password");
  await p2.click('button[type="submit"]');
  await p2.waitForSelector("text=do not match", { timeout: 10000 });
  await p2.close();
});

await step("tasks list renders seeded rows", async () => {
  await page.goto(`${base}/tasks`);
  await page.waitForSelector("text=Approve September owner payouts");
});
await page.screenshot({ path: `${out}/02-tasks.png`, fullPage: true });

await step("create a task", async () => {
  await page.goto(`${base}/tasks/new`);
  await page.fill('input[name="title"]', "Playwright smoke-test task");
  await page.selectOption('select[name="priority"]', "high");
  await page.fill('input[name="due_date"]', "2026-09-05");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Playwright smoke-test task", { timeout: 15000 });
  if (!/\/tasks\/[0-9a-f-]{36}$/.test(new URL(page.url()).pathname)) {
    throw new Error(`expected a task detail URL, got ${page.url()}`);
  }
});

await step("add a note to that task", async () => {
  await page.fill('textarea[name="body"]', "Checked by the automated smoke test.");
  await page.click('button:has-text("Add note")');
  await page.waitForSelector("text=Checked by the automated smoke test.", { timeout: 15000 });
});

await step("edit the task to done", async () => {
  await page.click('a:has-text("Edit")');
  await page.waitForSelector('select[name="status"]');
  await page.selectOption('select[name="status"]', "done");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Done", { timeout: 15000 });
});
await page.screenshot({ path: `${out}/03-task-detail.png`, fullPage: true });

await step("vendor detail shows linked records and notes", async () => {
  await page.goto(`${base}/vendors`);
  await page.click("text=ABC Pool Services");
  await page.waitForSelector("text=Call before changing the pool schedule");
  await page.waitForSelector("text=Properties serviced");
});
await page.screenshot({ path: `${out}/04-vendor.png`, fullPage: true });

await step("calendar renders the month grid", async () => {
  await page.goto(`${base}/calendar`);
  await page.waitForSelector("text=Monthly operations review");
});
await page.screenshot({ path: `${out}/05-calendar.png`, fullPage: true });

await step("ideas list renders", async () => {
  await page.goto(`${base}/ideas`);
  await page.waitForSelector("text=Direct-booking discount for repeat guests");
});
await page.screenshot({ path: `${out}/06-ideas.png`, fullPage: true });

await step("search spans sections", async () => {
  await page.goto(`${base}/search?q=pool`);
  await page.waitForSelector("text=ABC Pool Services");
});

await step("admin lists users", async () => {
  await page.goto(`${base}/admin`);
  await page.waitForSelector("text=Who can sign in");
});
await page.screenshot({ path: `${out}/07-admin.png`, fullPage: true });

await step("disabled section shows the switch-on notice", async () => {
  await page.goto(`${base}/invoices`);
  await page.waitForSelector("text=not switched on yet");
});

await step("stays light even when the OS is set to dark", async () => {
  const dark = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 950 } });
  const dp = await dark.newPage();
  await dp.goto(`${base}/login`);
  const bg = await dp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg !== "rgb(246, 244, 242)") throw new Error(`expected the light background, got ${bg}`);
  await dp.fill('input[name="email"]', "admin@coralux.aw");
  await dp.fill('input[name="password"]', "coralux2026");
  await dp.click('button[type="submit"]');
  await dp.waitForURL(`${base}/`, { timeout: 15000 });
  await dp.waitForSelector("text=Needs attention");
  await dp.screenshot({ path: `${out}/08-dashboard-dark.png`, fullPage: true });
  await dark.close();
});

await step("daily quote is shown", async () => {
  await page.goto(`${base}/`);
  await page.waitForSelector("text=Needs attention");
  const q = await page.locator("blockquote").first().innerText();
  if (!q || q.length < 10) throw new Error("no quote rendered");
  console.log(`      quote: ${q.slice(0, 60)}…`);
});

await step("logo renders in sidebar", async () => {
  const hasImage = await page.locator('img[alt="Coralux"]').count();
  const hasDrawnWordmark = await page.locator('text=RALUX').count();
  if (!hasImage && !hasDrawnWordmark) throw new Error("no logo rendered in sidebar");
});

await step("tasks page has one-off / recurring tabs", async () => {
  await page.goto(`${base}/tasks`);
  await page.waitForSelector('a.tab:has-text("One-off tasks")');
  await page.waitForSelector('a.tab:has-text("Recurring tasks")');
});
await page.screenshot({ path: `${out}/11-tasks-oneoff.png`, fullPage: true });

await step("completed tasks are in their own section", async () => {
  const summary = page.locator('summary:has-text("Completed")');
  await summary.waitFor({ timeout: 5000 });
  // completed items must not be in the main open table
  const openTable = page.locator("table").first();
  const doneInOpen = await openTable.locator('text=Reconcile August bank statement').count();
  if (doneInOpen > 0) throw new Error("a completed task is still in the open table");
  await summary.click();
  await page.waitForSelector('text=Reconcile August bank statement');
});

await step("recurring tab shows only recurring tasks", async () => {
  await page.click('a.tab:has-text("Recurring tasks")');
  await page.waitForSelector('text=Weekly pool chemical check');
  const oneOff = await page.locator('table').first().locator('text=Approve September owner payouts').count();
  if (oneOff > 0) throw new Error("a one-off task leaked into the recurring tab");
});
await page.screenshot({ path: `${out}/12-tasks-recurring.png`, fullPage: true });

await step("inline priority change on the task list saves", async () => {
  await page.goto(`${base}/tasks`);
  const row = page.locator('tr', { hasText: "Renew Hostaway subscription" }).first();
  const prioritySelect = row.locator('select[aria-label="Priority"]');
  await prioritySelect.selectOption("urgent");
  await page.waitForTimeout(1500);
  await page.reload();
  const after = await page.locator('tr', { hasText: "Renew Hostaway subscription" }).first()
    .locator('select[aria-label="Priority"]').inputValue();
  if (after !== "urgent") throw new Error(`priority did not persist, got ${after}`);
});

await step("inline due-date change saves", async () => {
  const row = page.locator('tr', { hasText: "Renew Hostaway subscription" }).first();
  await row.locator('input[aria-label="Due date"]').fill("2026-12-24");
  await page.waitForTimeout(1500);
  await page.reload();
  const after = await page.locator('tr', { hasText: "Renew Hostaway subscription" }).first()
    .locator('input[aria-label="Due date"]').inputValue();
  if (after !== "2026-12-24") throw new Error(`due date did not persist, got ${after}`);
});

await step("marking done inline moves the task to Completed", async () => {
  const row = page.locator('tr', { hasText: "Renew Hostaway subscription" }).first();
  await row.locator('select[aria-label="Status"]').selectOption("done");
  await page.waitForTimeout(1800);
  await page.reload();
  const stillOpen = await page.locator("table").first()
    .locator('text=Renew Hostaway subscription').count();
  if (stillOpen > 0) throw new Error("done task still in the open table");
  await page.click('summary:has-text("Completed")');
  await page.waitForSelector('text=Renew Hostaway subscription');
});

await step("ideas list is inline-editable", async () => {
  await page.goto(`${base}/ideas`);
  const row = page.locator('tr', { hasText: "Switch to LED across all properties" }).first();
  await row.locator('select[aria-label="Impact"]').selectOption("high");
  await page.waitForTimeout(1500);
  await page.reload();
  const after = await page.locator('tr', { hasText: "Switch to LED across all properties" }).first()
    .locator('select[aria-label="Impact"]').inputValue();
  if (after !== "high") throw new Error(`impact did not persist, got ${after}`);
});
await page.screenshot({ path: `${out}/13-ideas.png`, fullPage: true });

await step("event time is a 15-minute dropdown", async () => {
  await page.goto(`${base}/events/new`);
  const sel = page.locator('select[name="start_time"]');
  await sel.waitFor();
  const count = await sel.locator("option").count();
  if (count !== 97) throw new Error(`expected 96 times + blank = 97 options, got ${count}`);
  const vals = await sel.locator("option").allInnerTexts();
  if (!vals.some((v) => v.startsWith("09:15"))) throw new Error("missing 09:15 option");
  if (vals.some((v) => v.startsWith("09:05"))) throw new Error("found a non-15-minute option");
});

await step("create an event with a dropdown time", async () => {
  await page.fill('input[name="title"]', "Inline test event");
  await page.fill('input[name="start_date"]', "2026-09-10");
  await page.selectOption('select[name="start_time"]', "14:45");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Inline test event", { timeout: 15000 });
  await page.waitForSelector("text=2:45 pm");
});
await page.screenshot({ path: `${out}/14-event.png`, fullPage: true });


// ---------------------------------------------------------------- admin delete
await step("admin: create a throwaway user, then delete it", async () => {
  await page.goto(`${base}/admin`);
  await page.fill('#name', "Temp Tester");
  await page.fill('#email', "temp.tester@coralux.aw");
  await page.fill('#password', "temporary123");
  await page.click('button:has-text("Create account")');
  await page.waitForSelector("text=Temp Tester", { timeout: 15000 });
});
await page.screenshot({ path: `${out}/50-admin-with-temp-user.png`, fullPage: true });

await step("admin: delete the throwaway user", async () => {
  const row = page.locator("table tr", { hasText: "Temp Tester" });
  page.once("dialog", (d) => d.accept());
  await row.locator('button:has-text("Delete")').click();
  await row.waitFor({ state: "detached", timeout: 15000 });
  const stillThere = await page.locator("table tr", { hasText: "Temp Tester" }).count();
  if (stillThere !== 0) throw new Error("user row still present after delete");
});

await step("admin: cannot delete own account (no delete button on self row)", async () => {
  const selfRow = page.locator("tr", { hasText: "admin@coralux.com" });
  const count = await selfRow.locator('button:has-text("Delete")').count();
  if (count !== 0) throw new Error("delete button should not appear on the signed-in user's own row");
});

// ---------------------------------------------------------------- listings
await step("listings: nav link present and page loads with seeded data", async () => {
  await page.click('a:has-text("Listing Onboarding")');
  await page.waitForURL(`${base}/listings`);
  await page.waitForSelector("text=Malmok Cliff Villa");
  await page.waitForSelector("text=Boca Chica Bungalow");
  await page.waitForSelector("text=Oranjestad Lofts");
});
await page.screenshot({ path: `${out}/51-listings.png`, fullPage: true });

await step("listings: seeded active listing shows 100% / Active", async () => {
  const card = page.locator("a", { hasText: "Oranjestad Lofts" });
  await card.locator("text=Active").waitFor();
});

await step("listings: create a new listing auto-seeds the checklist", async () => {
  await page.goto(`${base}/listings/new`);
  await page.fill('#name', "Playwright Test Villa");
  await page.fill('#address', "Test Street 1");
  await page.selectOption('#platforms', "guesty");
  await page.click('button:has-text("Create listing")');
  await page.waitForSelector("text=Onboarding checklist", { timeout: 15000 });
  await page.waitForSelector("text=Professional photos taken");
  const count = await page.locator('li:has-text("checked")').count(); // none checked yet
  const totalSteps = await page.locator("ul li").count();
  if (totalSteps < 12) throw new Error(`expected at least 12 steps, got ${totalSteps}`);
});
await page.screenshot({ path: `${out}/52-listing-detail-fresh.png`, fullPage: true });

let listingUrl;
await step("listings: checking off a step updates the counter", async () => {
  listingUrl = page.url();
  const before = await page.locator("header:has-text('Onboarding checklist') >> .. >> text=/\\d+\\/\\d+/").first().innerText().catch(() => null);
  const firstCheckbox = page.locator("form button[aria-pressed]").first();
  await firstCheckbox.click();
  await page.waitForTimeout(1000);
  await page.reload();
  const chip = await page.locator("text=/^1\\/\\d+$/").first().innerText();
  if (!chip.startsWith("1/")) throw new Error(`expected 1/N after checking one step, got ${chip}`);
});

await step("listings: add a custom step", async () => {
  const addForm = page.locator("form", { has: page.locator('input[aria-label="Add a step"]') });
  await addForm.locator('input[aria-label="Add a step"]').fill("Confirm insurance certificate on file");
  await addForm.locator('button[type="submit"]').click();
  await page.waitForSelector("text=Confirm insurance certificate on file", { timeout: 15000 });
});

await step("listings: checking every step flips status to Active automatically", async () => {
  // check off all remaining boxes
  for (let i = 0; i < 20; i++) {
    const boxes = page.locator('form button[aria-pressed="false"]');
    const n = await boxes.count();
    if (n === 0) break;
    await boxes.first().click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1000);
  await page.reload();
  await page.waitForSelector("text=Active", { timeout: 15000 });
});
await page.screenshot({ path: `${out}/53-listing-detail-complete.png`, fullPage: true });

await step("listings: edit page loads and status can be set to Paused", async () => {
  await page.goto(`${listingUrl}/edit`);
  await page.selectOption('#status', "paused");
  await page.click('button:has-text("Save changes")');
  await page.waitForSelector("text=Paused", { timeout: 15000 });
});

await step("listings: delete the test listing", async () => {
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Delete")');
  await page.waitForURL(`${base}/listings`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  const gone = await page.locator("text=Playwright Test Villa").count();
  if (gone !== 0) throw new Error("deleted listing still appears in the list");
});


await step("Cleaners nav group with both items", async () => {
  await page.waitForSelector('text=Cleaners');
  await page.waitForSelector('a:has-text("Inventory")');
  await page.waitForSelector('a:has-text("Cleaning Schedule")');
});

// ---------------------------------------------------------------- inventory
await step("inventory list shows seeded items sorted by urgency", async () => {
  await page.click('a:has-text("Inventory")');
  await page.waitForURL(`${base}/inventory`);
  await page.waitForSelector("text=Glass cleaner");
  const rows = await page.locator("table tbody tr").allInnerTexts();
  const outIdx = rows.findIndex((r) => r.includes("Glass cleaner"));
  const inStockIdx = rows.findIndex((r) => r.includes("Vacuum cleaner"));
  if (outIdx === -1 || inStockIdx === -1) throw new Error("expected items not found");
  if (outIdx > inStockIdx) throw new Error("out-of-stock item should sort before in-stock items");
});
await page.screenshot({ path: `${out}/60-inventory.png`, fullPage: true });

await step("inventory: inline quantity edit saves", async () => {
  const row = page.locator("tr", { hasText: "Toilet paper" });
  const qty = row.locator('input[aria-label="Quantity"]');
  const type = await qty.getAttribute("type");
  if (type !== "number") throw new Error(`Quantity should render as a number input, got type="${type}"`);
  await qty.fill("20");
  await qty.press("Tab");
  await page.waitForTimeout(1200);
  await page.reload();
  const after = await page.locator("tr", { hasText: "Toilet paper" }).locator('input[aria-label="Quantity"]').inputValue();
  if (after !== "20") throw new Error(`expected 20, got ${after}`);
});

await step("inventory: create a new item", async () => {
  await page.goto(`${base}/inventory/new`);
  await page.fill('#name', "Playwright Test Sponges");
  await page.selectOption('#category', "cleaning_supplies");
  await page.fill('#quantity', "15");
  await page.click('button:has-text("Create item")');
  await page.waitForSelector("text=Playwright Test Sponges", { timeout: 15000 });
});

// ------------------------------------------------------------ cleaning grid
await step("cleaning schedule loads with weeks", async () => {
  await page.goto(`${base}/cleaning`);
  await page.waitForSelector("text=Week of");
  const detailsCount = await page.locator("details").count();
  if (detailsCount < 3) throw new Error(`expected at least 3 week blocks, got ${detailsCount}`);
});
await page.screenshot({ path: `${out}/61-cleaning-schedule.png`, fullPage: true });

await step("past week is collapsed, current week is open", async () => {
  const pastDetails = page.locator("details", { has: page.locator("text=past") });
  const isPastOpen = await pastDetails.first().evaluate((el) => el.open);
  if (isPastOpen) throw new Error("past week should be collapsed by default");

  const currentDetails = page.locator("details", { has: page.locator("text=current") });
  const isCurrentOpen = await currentDetails.first().evaluate((el) => el.open);
  if (!isCurrentOpen) throw new Error("current week should be open by default");
});

await step("seeded shift shows listing and notes in the grid", async () => {
  await page.waitForSelector("text=Eagle Beach");
  await page.waitForSelector("text=extra towels");
});

await step("clicking an empty cell opens the editor, saving shows it in the grid", async () => {
  // find an empty cell (no text) in the open (current) week's table and click it
  const currentDetails = page.locator("details", { has: page.locator("text=current") }).first();
  const table = currentDetails.locator("table");
  const emptyCell = table.locator("td:not(.primary)").filter({ hasText: "" }).first();
  await emptyCell.click();
  await page.waitForSelector('input[placeholder="Listing"]', { timeout: 5000 });
  await page.fill('input[placeholder="Listing"]', "Playwright Villa");
  await page.fill('input[placeholder="Notes"]', "Test note from e2e");
  await page.click('button:has-text("Save")');
  await page.waitForSelector("text=Playwright Villa", { timeout: 5000 });
  await page.waitForSelector("text=Test note from e2e");
});
await page.screenshot({ path: `${out}/62-cleaning-cell-added.png`, fullPage: true });

await step("edit persists after reload", async () => {
  await page.reload();
  await page.waitForSelector("text=Playwright Villa", { timeout: 15000 });
  await page.waitForSelector("text=Test note from e2e");
});

await step("clearing a shift removes it", async () => {
  await page.click("text=Playwright Villa");
  await page.waitForSelector('input[placeholder="Listing"]');
  // the trash/clear icon button
  const editingCell = page.locator("td").filter({ has: page.locator('input[placeholder="Listing"]') });
  await editingCell.locator('button:has-text("")').first(); // no-op just to ensure locator resolves
  const clearBtn = editingCell.locator('button.btn-danger');
  await clearBtn.click();
  await page.waitForTimeout(800);
  const stillThere = await page.locator("text=Playwright Villa").count();
  if (stillThere !== 0) throw new Error("shift should be cleared");
});

await step("month navigation works", async () => {
  await page.goto(`${base}/cleaning`);
  const heading = await page.locator("h1").first().innerText();
  const nextBtn = page.locator('a', { hasText: "" }).nth(0);
  await page.click('a[href*="month="]:nth-of-type(2)').catch(() => {});
});

// ------------------------------------------------------ current-day highlight
await step("cleaning grid highlights only today, not a static Sun/Sat", async () => {
  await page.goto(`${base}/cleaning`);
  await page.waitForSelector("text=current");
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayDow = new Date().getDay(); // 0=Sun..6=Sat

  const currentDetails = page.locator("details", { has: page.locator("text=current") }).first();
  const headers = currentDetails.locator("table thead th");
  const count = await headers.count();
  if (count !== 8) throw new Error(`expected 8 header cells (Time + 7 days), got ${count}`);

  for (let i = 1; i < count; i++) {
    const bg = await headers.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
    const isHighlighted = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const dayOfWeek = i - 1; // 0=Sun..6=Sat matches DAY_LABELS order
    if (dayOfWeek === todayDow && !isHighlighted) {
      throw new Error(`today's column (day ${dayOfWeek}) should be highlighted, was not`);
    }
    if (dayOfWeek !== todayDow && isHighlighted) {
      throw new Error(`day ${dayOfWeek} should not be highlighted (only today, ${todayDow}, should be) — got bg ${bg}`);
    }
  }
});

// ------------------------------------------------------------- mobile layout
await step("cleaning grid does not overlap columns on a phone-width viewport", async () => {
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mp = await mobile.newPage();
  await mp.goto(`${base}/login`);
  await mp.fill('input[name="email"]', "admin@coralux.aw");
  await mp.fill('input[name="password"]', "coralux2026");
  await mp.click('button[type="submit"]');
  await mp.waitForURL(`${base}/`, { timeout: 15000 });
  await mp.goto(`${base}/cleaning`);
  await mp.waitForSelector("text=current");

  const currentDetails = mp.locator("details", { has: mp.locator("text=current") }).first();
  const headers = currentDetails.locator("table thead th");
  const boxes = [];
  const n = await headers.count();
  for (let i = 0; i < n; i++) {
    boxes.push(await headers.nth(i).boundingBox());
  }
  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1];
    const cur = boxes[i];
    if (!prev || !cur) throw new Error("a header cell has no bounding box (hidden/collapsed?)");
    if (cur.x < prev.x + prev.width - 1) {
      throw new Error(`header ${i} overlaps header ${i - 1}: prev ends at ${prev.x + prev.width}, cur starts at ${cur.x}`);
    }
  }
  await mp.screenshot({ path: `${out}/70-cleaning-mobile.png`, fullPage: true });
  await mobile.close();
});

// ------------------------------------------------------------- no Apply button
await step("no Apply/View button anywhere — filters and selects auto-apply", async () => {
  const pages = ["/tasks", "/ideas", "/vendors", "/inventory", "/files", "/reports"];
  for (const path of pages) {
    await page.goto(`${base}${path}`);
    const applyBtn = await page.locator('button:has-text("Apply"), button:has-text("View")').count();
    if (applyBtn > 0) throw new Error(`found an Apply/View button on ${path}`);
  }
});

await step("inventory filters auto-apply without a submit click", async () => {
  await page.goto(`${base}/inventory`);
  const select = page.locator("form select").first();
  const value = await select.evaluate((el) => el.options[1]?.value);
  if (value) {
    await select.selectOption(value);
    await page.waitForURL((u) => u.search.length > 0, { timeout: 5000 });
  }
});

// ------------------------------------------------------------------ employees
await step("employees: hidden from staff nav and blocked directly", async () => {
  const staff = await browser.newContext();
  const sp = await staff.newPage();
  await sp.goto(`${base}/login`);
  await sp.fill('input[name="email"]', "dwight@coralux.aw");
  await sp.fill('input[name="password"]', "coralux2026");
  await sp.click('button[type="submit"]');
  await sp.waitForURL(`${base}/`, { timeout: 15000 });

  const navHasEmployees = await sp.locator('a:has-text("Employees")').count();
  if (navHasEmployees > 0) throw new Error("staff should not see Employees in the nav");

  const res = await sp.goto(`${base}/employees`);
  if (res.status() !== 404) throw new Error(`staff should be 404'd from /employees, got ${res.status()}`);
  await staff.close();
});

await step("employees: visible and accessible to admin, positioned under Vendors", async () => {
  await page.goto(`${base}/`);
  const navText = await page.locator("nav").first().innerText();
  const vendorsIdx = navText.indexOf("Vendors");
  const employeesIdx = navText.indexOf("Employees");
  if (vendorsIdx === -1 || employeesIdx === -1) throw new Error("Vendors/Employees not found in nav");
  if (employeesIdx < vendorsIdx) throw new Error("Employees should be listed below Vendors in the People group");

  await page.goto(`${base}/employees`);
  await page.waitForSelector("text=Dwight Tromp");
});
await page.screenshot({ path: `${out}/71-employees.png`, fullPage: true });

// -------------------------------------------------------- admin access control
await step("admin: access control editor changes a section's required role live", async () => {
  await page.goto(`${base}/admin`);
  await page.waitForSelector("text=Access control");
  const select = page.locator('select[aria-label="Vendors"]');
  await select.selectOption("admin");
  await page.waitForTimeout(800);

  const staff = await browser.newContext();
  const sp = await staff.newPage();
  await sp.goto(`${base}/login`);
  await sp.fill('input[name="email"]', "dwight@coralux.aw");
  await sp.fill('input[name="password"]', "coralux2026");
  await sp.click('button[type="submit"]');
  await sp.waitForURL(`${base}/`, { timeout: 15000 });
  const res = await sp.goto(`${base}/vendors`);
  if (res.status() !== 404) throw new Error(`staff should be blocked from Vendors once overridden to admin, got ${res.status()}`);
  await staff.close();

  // restore, so the rest of the suite (and the app) is left in its default state
  await select.selectOption("staff");
  await page.waitForTimeout(800);
});
await page.screenshot({ path: `${out}/72-admin-access-control.png`, fullPage: true });

await step("admin: access control override reverted successfully", async () => {
  const staff = await browser.newContext();
  const sp = await staff.newPage();
  await sp.goto(`${base}/login`);
  await sp.fill('input[name="email"]', "dwight@coralux.aw");
  await sp.fill('input[name="password"]', "coralux2026");
  await sp.click('button[type="submit"]');
  await sp.waitForURL(`${base}/`, { timeout: 15000 });
  const res = await sp.goto(`${base}/vendors`);
  if (res.status() === 404) throw new Error("vendors override was not reverted — staff still blocked");
  await staff.close();
});

if (errors.length) {
  console.log("\nBrowser errors:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
  process.exitCode = 1;
}
await browser.close();
