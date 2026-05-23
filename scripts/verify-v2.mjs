// Playwright verification for v2.
// Iterates 4 player counts × 3 skins, screenshots each, plus functional probes.
import pkg from "/Users/minikai/Dev/01-kai-meta/node_modules/playwright/index.js";
const { chromium, devices } = pkg;

const URL = "http://localhost:8001/";
const OUT = "/Users/minikai/Dev/laifu-keisan/screenshots/v2";

const SKINS = ["pastel", "cyberpunk", "heroic-fantasy"];
const COUNTS = [2, 3, 4, 5];

const iphone = devices["iPhone 14 Pro"];

async function clearAndSet(page, count, skin, historyEnabled = false, startingLife = 20) {
  await page.evaluate(({ count, skin, historyEnabled, startingLife }) => {
    const state = {
      version: 1,
      startingLife,
      playerCount: count,
      skin,
      layoutVariant: "default",
      hintDismissed: true,
      historyEnabled,
      players: Array.from({ length: count }, (_, i) => ({
        id: i,
        counters: { life: startingLife },
        log: [],
      })),
    };
    localStorage.setItem("laifu-keisan/state/v1", JSON.stringify(state));
  }, { count, skin, historyEnabled, startingLife });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".panel");
  await page.waitForTimeout(180); // let radial clip-path settle
}

async function snap(page, name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log("  ✓", path);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...iphone,
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".panel");

  // === 12 layout × skin snaps ===
  console.log("=== Layout × Skin matrix ===");
  for (const count of COUNTS) {
    for (const skin of SKINS) {
      await clearAndSet(page, count, skin);
      await snap(page, `${count}P-${skin}`);
    }
  }

  // === Functional probes ===
  console.log("\n=== Functional probes ===");

  // 3P radial: tap inner zone of P0's wedge = +1; outer = -1.
  // Inner zone = circle of radius ~22vmin at viewport center.
  // For 393×852 viewport: 22vmin ≈ 86px, center at (196, 426).
  await clearAndSet(page, 3, "pastel");
  {
    const vp = page.viewportSize();
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );

    // Inner zone for P0 (south wedge): tap just below center (inside circle AND inside wedge).
    await page.touchscreen.tap(vp.width / 2, vp.height / 2 + 50);
    await page.waitForTimeout(1400);
    const afterInner = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );
    console.log("  3P P0 inner-tap (center area):", before, "→", afterInner, afterInner === before + 1 ? "✓ +1" : "✗");

    // Outer zone for P0: tap near the bottom edge (inside wedge, outside inner circle).
    await page.touchscreen.tap(vp.width / 2, vp.height - 60);
    await page.waitForTimeout(1400);
    const afterOuter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );
    console.log("  3P P0 outer-tap (near bottom edge):", afterInner, "→", afterOuter, afterOuter === afterInner - 1 ? "✓ -1" : "✗");

    // P2 (2 o'clock, upper-right): inner-zone tap (near center, in upper-right wedge).
    // For 3P, P2 wedge angle range = 180°-300°. Point at (W*0.55, H*0.45):
    //   dx=W*0.05, dy=-H*0.05. angle = atan2(-dx, dy) = atan2(-W*0.05, -H*0.05) = atan2(-0.18, -0.42) ≈ 203°.
    // 203° is in (180°, 300°) ✓ AND distance ≈ sqrt((W*0.05)² + (H*0.05)²) ≈ sqrt(19.6² + 42.6²) ≈ 47px → inside circle ✓
    const p2Before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[2].counters.life
    );
    await page.touchscreen.tap(vp.width * 0.55, vp.height * 0.45);
    await page.waitForTimeout(1400);
    const p2AfterInner = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[2].counters.life
    );
    console.log("  3P P2 inner-tap:", p2Before, "→", p2AfterInner, p2AfterInner === p2Before + 1 ? "✓ +1 (after rotation, still + for P2)" : "✗");

    // P2 outer zone: far upper-right corner, well inside wedge, outside circle.
    const tapX = vp.width * 0.92, tapY = vp.height * 0.08;
    const elInfo = await page.evaluate(([x, y]) => {
      const els = document.elementsFromPoint(x, y);
      return els.map(e => `${e.tagName.toLowerCase()}.${e.className}#${e.id||""}[${e.dataset.playerId||""}/${e.dataset.action||""}]`).slice(0, 5);
    }, [tapX, tapY]);
    console.log("    debug elementsFromPoint at", tapX.toFixed(0), tapY.toFixed(0), ":", elInfo.join(" → "));
    await page.touchscreen.tap(tapX, tapY);
    await page.waitForTimeout(1400);
    const p2AfterOuter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[2].counters.life
    );
    console.log("  3P P2 outer-tap:", p2AfterInner, "→", p2AfterOuter, p2AfterOuter === p2AfterInner - 1 ? "✓ -1 (after rotation, still − for P2)" : "✗");
  }

  // 5P radial: probe P0 inner vs outer.
  await clearAndSet(page, 5, "pastel");
  {
    const vp = page.viewportSize();
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );
    // P0 wedge spans (-36°, 36°) from south. Inner tap just below center, well within wedge angle.
    await page.touchscreen.tap(vp.width / 2, vp.height / 2 + 50);
    await page.waitForTimeout(1400);
    const afterInner = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );
    console.log("  5P P0 inner-tap:", before, "→", afterInner, afterInner === before + 1 ? "✓ +1" : "✗");

    await page.touchscreen.tap(vp.width / 2, vp.height - 40);
    await page.waitForTimeout(1400);
    const afterOuter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).players[0].counters.life
    );
    console.log("  5P P0 outer-tap:", afterInner, "→", afterOuter, afterOuter === afterInner - 1 ? "✓ -1" : "✗");
  }

  // Settings → toggle History ON → tap "…" on P0 → log popover opens.
  await clearAndSet(page, 2, "pastel", false);
  await snap(page, "probe-2P-history-off");
  {
    // Open menu, click "On" for history.
    await page.click('.menu-toggle');
    await page.waitForTimeout(120);
    await page.click('[data-action="toggle-history"][data-value="on"]');
    await page.waitForTimeout(120);
    // Close menu by clicking off it.
    await page.click('.menu-toggle');
    await page.waitForTimeout(120);
    // Now history-btn for P0 should be visible.
    const histVisible = await page.evaluate(() => {
      const b = document.querySelector('.panel[data-player-id="0"] .history-btn');
      return b && !b.hidden;
    });
    console.log("  History ON → P0 …-btn visible:", histVisible ? "✓" : "✗");
    await snap(page, "probe-2P-history-on");

    // Click the … button for P0.
    await page.click('.panel[data-player-id="0"] .history-btn');
    await page.waitForTimeout(120);
    const popoverOpen = await page.evaluate(() => {
      const p = document.querySelector('.log-popover');
      return p && !p.hidden;
    });
    console.log("  Tap … → log popover open:", popoverOpen ? "✓" : "✗");
    await snap(page, "probe-log-popover");
    // Close it.
    await page.click('.log-close');
    await page.waitForTimeout(120);

    // Turn history off again.
    await page.click('.menu-toggle');
    await page.waitForTimeout(120);
    await page.click('[data-action="toggle-history"][data-value="off"]');
    await page.waitForTimeout(120);
    await page.click('.menu-toggle');
    await page.waitForTimeout(120);
    const histGone = await page.evaluate(() => {
      const b = document.querySelector('.panel[data-player-id="0"] .history-btn');
      return b && b.hidden;
    });
    console.log("  History OFF → P0 …-btn hidden:", histGone ? "✓" : "✗");
  }

  // Starting-life stepper: tap +5 four times → 40, then -1 twice → 38, then -5 spam to clamp at 1.
  await clearAndSet(page, 2, "pastel", false, 20);
  {
    await page.click('.menu-toggle');
    await page.waitForTimeout(120);
    for (let i = 0; i < 4; i++) {
      await page.click('[data-action="starting-life-step"][data-step="5"]');
      await page.waitForTimeout(40);
    }
    let val = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).startingLife
    );
    console.log("  +5 ×4 → startingLife:", val, val === 40 ? "✓" : "✗");

    for (let i = 0; i < 2; i++) {
      await page.click('[data-action="starting-life-step"][data-step="-1"]');
      await page.waitForTimeout(40);
    }
    val = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).startingLife
    );
    console.log("  -1 ×2 → startingLife:", val, val === 38 ? "✓" : "✗");

    // Clamp test: spam -5 many times, should clamp at 1 (not 0 or negative).
    for (let i = 0; i < 20; i++) {
      await page.click('[data-action="starting-life-step"][data-step="-5"]');
      await page.waitForTimeout(20);
    }
    val = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laifu-keisan/state/v1")).startingLife
    );
    console.log("  -5 ×20 clamp → startingLife:", val, val === 1 ? "✓ clamped to 1" : "✗");

    await snap(page, "probe-stepper");
  }

  // Skin switch in 5P pastel → cyber → heroic.
  await clearAndSet(page, 5, "pastel");
  await snap(page, "probe-5P-pastel-final");
  await clearAndSet(page, 5, "cyberpunk");
  await snap(page, "probe-5P-cyberpunk-final");
  await clearAndSet(page, 5, "heroic-fantasy");
  await snap(page, "probe-5P-heroic-final");

  await browser.close();
  console.log("\nDone.");
})().catch(e => { console.error(e); process.exit(1); });
