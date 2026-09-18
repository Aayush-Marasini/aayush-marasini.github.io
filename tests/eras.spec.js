import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const eras = [
  "terminal",
  "synthwave",
  "geocities",
  "desktop",
  "metro",
  "modern",
];
async function settle(page, era) {
  await expect(page.locator("html")).toHaveAttribute("data-era", era);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-transitioning",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
}
async function openTimeMachine(page) {
  if (!(await page.locator("#time-machine").isVisible()))
    await page.locator("#time-machine-toggle").click();
  await expect(page.getByRole("slider")).toBeVisible();
}
async function selectEra(page, era, keepOpen = false) {
  await openTimeMachine(page);
  const slider = page.getByRole("slider", { name: "TIME MACHINE" });
  await slider.focus();
  await slider.press("Home");
  for (let i = 0; i < eras.indexOf(era); i++) await slider.press("ArrowRight");
  await settle(page, era);
  if (!keepOpen)
    await page.getByRole("button", { name: "Close time machine" }).click();
}

for (const width of [320, 390, 768, 1440]) {
  test(`optional time machine stays still when open and dismisses at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const dock = page.locator("#time-machine");
    await expect(dock).toBeHidden();
    await expect(page.locator("#time-machine-toggle")).toBeVisible();
    expect(
      await page.evaluate(() => getComputedStyle(document.body).paddingBottom),
    ).toBe("0px");
    await openTimeMachine(page);
    await expect(dock).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const initial = await dock.boundingBox();
    expect(initial.y + initial.height).toBeLessThan(844);
    expect(initial.x).toBeGreaterThanOrEqual(12);
    expect(initial.x + initial.width).toBeLessThanOrEqual(width - 12);
    // Record every animation frame, including the moment the drag/transition ends.
    await dock.evaluate((el) => {
      window.dockSamples = [];
      const sample = () => {
        const { x, y, width, height } = el.getBoundingClientRect();
        window.dockSamples.push({ x, y, width, height });
        window.dockFrame = requestAnimationFrame(sample);
      };
      sample();
    });
    for (const era of eras) {
      await selectEra(page, era, true);
      await expect(dock).toBeInViewport();
    }
    const samples = await page.evaluate(() => {
      cancelAnimationFrame(window.dockFrame);
      return window.dockSamples;
    });
    for (const key of ["x", "y", "width", "height"]) {
      expect(
        Math.max(
          ...samples.map((sample) => Math.abs(sample[key] - initial[key])),
        ),
        key,
      ).toBeLessThan(1);
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`optional-panel-${width}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(dock).toBeHidden();
    await expect(page.locator("#time-machine-toggle")).toBeFocused();
    await openTimeMachine(page);
    await page.locator("h1").click();
    await expect(dock).toBeHidden();
    await openTimeMachine(page);
    await page.evaluate(() =>
      scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await expect(dock).toBeHidden();
    await expect(page.locator("#time-machine-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: testInfo.outputPath(`quiet-hero-${width}.png`),
    });
  });
}

for (const era of eras.slice(0, -1)) {
  for (const width of [320, 390, 768, 1440]) {
    test(`${era} layout at ${width}px`, async ({ page }, testInfo) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (
          response.url().startsWith("http://127.0.0.1:4173") &&
          response.status() >= 400
        )
          errors.push(response.url());
      });
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/");
      await selectEra(page, era);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("main *, header *, footer *")]
          .filter((el) => {
            const box = el.getBoundingClientRect();
            return box.width && (box.left < -1 || box.right > innerWidth + 1);
          })
          .map((el) => el.className || el.tagName),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        JSON.stringify(overflow),
      ).toBe(true);
      await expect(page.locator("#time-machine")).toBeHidden();
      await expect(page.locator("#time-machine-toggle")).toBeInViewport();
      await expect(
        page.getByRole("heading", { name: "Sustainable edge vision" }),
      ).toBeVisible();
      if (width === 390 || width === 1440) {
        const portrait = page.locator(".portrait-figure img");
        await portrait.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            portrait.evaluate((img) => img.complete && img.naturalWidth > 0),
          )
          .toBe(true);
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: testInfo.outputPath(`${era}-${width}.png`),
          fullPage: true,
        });
        await page.screenshot({
          path: testInfo.outputPath(`${era}-${width}-hero.png`),
        });
      }
      expect(errors).toEqual([]);
    });
  }
  for (const width of [390, 1440]) {
    test(`${era} accessibility at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/");
      await selectEra(page, era);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    });
  }
}

test("dragging crosses all six eras without moving the slider or losing the pointer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openTimeMachine(page);
  const slider = page.getByRole("slider");
  const box = await slider.boundingBox();
  const dockBox = await page.locator("#time-machine").boundingBox();
  await page.mouse.move(box.x + box.width - 7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 7, box.y + box.height / 2, { steps: 65 });
  const pinned = await slider.boundingBox();
  expect(Math.abs(pinned.x - box.x)).toBeLessThan(2);
  expect(Math.abs(pinned.y - box.y)).toBeLessThan(2);
  await page.mouse.up();
  await settle(page, "terminal");
  await expect(slider).toHaveValue("0");
  expect(await page.locator("#time-machine").boundingBox()).toEqual(dockBox);
  const terminalBox = await slider.boundingBox();
  await page.mouse.move(
    terminalBox.x + 7,
    terminalBox.y + terminalBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    terminalBox.x + terminalBox.width - 7,
    terminalBox.y + terminalBox.height / 2,
    {
      steps: 65,
    },
  );
  await page.mouse.up();
  await settle(page, "modern");
  await expect(slider).toHaveValue("100");
  expect(await page.locator("#time-machine").boundingBox()).toEqual(dockBox);
  expect(errors).toEqual([]);
});

test("touch dragging stays attached to the dial as mobile layouts change", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/");
    await openTimeMachine(page);
    const slider = page.getByRole("slider");
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    const dockBox = await page.locator("#time-machine").boundingBox();
    const client = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    const right = box.x + box.width - 7;
    const left = box.x + 7;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: right, y, id: 1 }],
    });
    for (let i = 1; i <= 20; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: right + ((left - right) * i) / 20, y, id: 1 }],
      });
      await page.waitForTimeout(25);
    }
    const pinned = await slider.boundingBox();
    expect(Math.abs(pinned.y - box.y)).toBeLessThan(2);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await settle(page, "terminal");
    await expect(slider).toHaveValue("0");
    expect(await page.locator("#time-machine").boundingBox()).toEqual(dockBox);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

for (const motion of ["no-preference", "reduce"]) {
  test(`DVD moves, stays inside the screen, pauses and resumes with ${motion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("/");
    await selectEra(page, "desktop");
    await page.locator("#artifact-trigger").click();
    const logo = page.locator(".dvd-logo");
    if (motion === "reduce") {
      const still = await logo.boundingBox();
      await page.waitForTimeout(200);
      expect(await logo.boundingBox()).toEqual(still);
      await page.getByRole("button", { name: "Start screensaver" }).click();
    }
    const start = await logo.boundingBox();
    await expect
      .poll(async () => Math.abs((await logo.boundingBox()).x - start.x))
      .toBeGreaterThan(15);
    const firstColor = await logo.evaluate((el) => getComputedStyle(el).color);
    // The color changes only at a wall, proving a bounce occurred.
    await expect
      .poll(() => logo.evaluate((el) => getComputedStyle(el).color), {
        timeout: 6000,
      })
      .not.toBe(firstColor);
    const bounds = await page.locator(".dvd-stage").boundingBox();
    const moving = await logo.boundingBox();
    expect(moving.x).toBeGreaterThanOrEqual(bounds.x);
    expect(moving.y).toBeGreaterThanOrEqual(bounds.y);
    expect(moving.x + moving.width).toBeLessThanOrEqual(
      bounds.x + bounds.width,
    );
    expect(moving.y + moving.height).toBeLessThanOrEqual(
      bounds.y + bounds.height,
    );
    await page.getByRole("button", { name: "Pause motion" }).click();
    const stopped = await logo.boundingBox();
    await page.waitForTimeout(200);
    expect(await logo.boundingBox()).toEqual(stopped);
    await page.getByRole("button", { name: "Resume motion" }).click();
    await expect
      .poll(async () => Math.abs((await logo.boundingBox()).x - stopped.x))
      .toBeGreaterThan(15);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    const transform = await logo.getAttribute("style");
    await page.waitForTimeout(100);
    expect(await logo.getAttribute("style")).toBe(transform);
  });
}

test("eras preserve unfinished messages and restore the modern palette", async ({
  page,
}) => {
  await page.goto("/");
  const initial = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    font: getComputedStyle(document.querySelector("h1")).fontFamily,
  }));
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page
    .getByLabel("What’s on your mind?")
    .fill("Keep this unfinished message through time.");
  for (const era of eras) {
    await selectEra(page, era);
    await expect(page.getByLabel("Your name")).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("What’s on your mind?")).toHaveValue(
      "Keep this unfinished message through time.",
    );
  }
  expect(
    await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      font: getComputedStyle(document.querySelector("h1")).fontFamily,
    })),
  ).toEqual(initial);
});

test("keyboard selection persists in this tab", async ({ page }) => {
  await page.goto("/");
  await selectEra(page, "desktop");
  await expect(page.locator("#era-slider")).toHaveAttribute(
    "aria-valuetext",
    "2004, Desktop",
  );
  await page.reload();
  await settle(page, "desktop");
  await expect(page.locator("#era-slider")).toHaveValue("60");
  await expect(page.locator("#time-machine")).toBeHidden();
});

for (const mode of ["reduced motion", "unavailable transitions and storage"]) {
  test(`switching supports ${mode}`, async ({ page }) => {
    if (mode === "reduced motion")
      await page.emulateMedia({ reducedMotion: "reduce" });
    else
      await page.addInitScript(() => {
        document.startViewTransition = undefined;
        Object.defineProperty(window, "sessionStorage", {
          get() {
            throw new DOMException("Storage disabled", "SecurityError");
          },
        });
      });
    await page.goto("/");
    for (const era of eras) await selectEra(page, era);
  });
}

for (const era of eras) {
  test(`${era} easter egg works and restores keyboard focus`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      Math.random = () => 0.5;
    });
    await page.goto("/");
    await selectEra(page, era);
    const trigger = page.locator("#artifact-trigger");
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close easter egg" }),
    ).toBeFocused();
    if (era === "terminal") {
      await page
        .getByRole("textbox", { name: "Terminal command" })
        .fill("whoami");
      await page.getByRole("button", { name: "Run", exact: true }).click();
      await expect(page.locator(".terminal-output")).toContainText(
        "Real Madrid",
      );
    } else if (era === "synthwave") {
      await page.getByRole("button", { name: "Mute sound" }).click();
      await page.getByRole("button", { name: "C / A", exact: true }).click();
      await expect(dialog.getByRole("status")).toHaveText("Playing C.");
      await page.keyboard.press("f");
      await expect(dialog.getByRole("status")).toHaveText("Playing G.");
    } else if (era === "geocities") {
      await page.getByRole("button", { name: "Leave a star stamp" }).click();
      await expect(page.locator(".guest-stamp")).toHaveCount(1);
    } else if (era === "desktop") {
      await page.getByRole("button", { name: "Pause motion" }).click();
      await page.getByRole("button", { name: "Catch the DVD logo" }).click();
      await expect(dialog.getByRole("status")).toContainText("1 catch");
    } else if (era === "metro") {
      const shuffled = ["CPU", "RAM", "I/O", "CPU", "RAM", "I/O"];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(0.5 * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (const symbol of ["CPU", "RAM", "I/O"]) {
        for (let i = 0; i < 6; i++)
          if (shuffled[i] === symbol)
            await page.locator(".memory-card").nth(i).click();
      }
      await expect(dialog.getByRole("status")).toHaveText(
        "3 / 3. Memory restored.",
      );
    } else {
      await page.getByRole("button", { name: "Left", exact: true }).click();
      await expect(dialog.getByRole("status")).toContainText(
        "Goal. Hala Madrid!",
      );
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${era}-egg.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}

test("without JavaScript the modern site works with experiments hidden", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#time-machine")).toBeHidden();
  await expect(page.locator("#artifact-trigger")).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-era", "modern");
  await expect(
    page.getByRole("heading", { name: "Selected work" }),
  ).toBeVisible();
  await context.close();
});
