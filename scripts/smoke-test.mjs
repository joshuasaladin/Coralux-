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

await step("dark mode renders", async () => {
  const dark = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 950 } });
  const dp = await dark.newPage();
  await dp.goto(`${base}/login`);
  await dp.fill('input[name="email"]', "admin@coralux.aw");
  await dp.fill('input[name="password"]', "coralux2026");
  await dp.click('button[type="submit"]');
  await dp.waitForURL(`${base}/`, { timeout: 15000 });
  await dp.waitForSelector("text=Needs attention");
  await dp.screenshot({ path: `${out}/08-dashboard-dark.png`, fullPage: true });
  await dark.close();
});

if (errors.length) {
  console.log("\nBrowser errors:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
  process.exitCode = 1;
}
await browser.close();
