// Focused Playwright check for the Lixie skin.
import pkg from "/Users/minikai/Dev/01-kai-meta/node_modules/playwright/index.js";
const { chromium, devices } = pkg;

const URL = "http://localhost:8001/?admin";
const OUT = "/Users/minikai/Dev/laifu-keisan/screenshots/v2";
const iphone = devices["iPhone 14 Pro"];

async function setState(page, count, lives) {
  await page.evaluate(({ count, lives }) => {
    localStorage.setItem("laifu-keisan/state/v1", JSON.stringify({
      version: 1, startingLife: 20, playerCount: count, skin: "lixie",
      layoutVariant: "default", hintDismissed: true, historyEnabled: false,
      players: Array.from({ length: count }, (_, i) => ({
        id: i, counters: { life: lives ? lives[i] : 20 }, log: [],
      })),
    }));
  }, { count, lives });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400); // let font load + canvas draw settle
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...iphone, viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    serviceWorkers: "block", // always hit disk, never a stale precache
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".panel");

  for (const count of [2, 3, 4, 5]) {
    await setState(page, count);
    const has = await page.evaluate(() => !!document.getElementById("lixie-canvas"));
    console.log(`  ${count}P lixie · canvas present: ${has ? "✓" : "✗"}`);
    await page.screenshot({ path: `${OUT}/${count}P-lixie.png` });
    console.log("  ✓", `${OUT}/${count}P-lixie.png`);
  }

  // Negative + two-digit totals (4P): -3, 0, 40, 7
  await setState(page, 4, [-3, 0, 40, 7]);
  await page.screenshot({ path: `${OUT}/lixie-negative-twodigit.png` });
  console.log("  ✓", `${OUT}/lixie-negative-twodigit.png (lives -3/0/40/7)`);

  console.log(errors.length ? `\n  ✗ console errors:\n   - ${errors.join("\n   - ")}` : "\n  ✓ no console/page errors");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
