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


if (errors.length) {
  console.log("\nBrowser errors:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
  process.exitCode = 1;
}
await browser.close();
