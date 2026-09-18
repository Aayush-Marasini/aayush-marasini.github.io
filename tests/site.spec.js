import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fillContact(page) {
  await page.goto("/#contact");
  await page.getByLabel("Your name").fill("Ada Lovelace");
  await page.getByLabel("Your email").fill("ada@example.org");
  await page
    .getByLabel("What’s on your mind?")
    .fill("Let’s discuss your work on memory-efficient inference.");
}

for (const width of [320, 360, 390, 600, 768, 1024, 1440]) {
  test(`layout and assets at ${width}px`, async ({ page }, testInfo) => {
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
      if (
        response.url().startsWith("http://127.0.0.1:4173") &&
        response.status() >= 400
      )
        failures.push(response.url());
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        document.fonts.check('800 24px "Barlow Condensed"'),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        document.fonts.check('400 14px "IBM Plex Mono"'),
      ),
    ).toBe(true);
    await expect(page.locator("h1")).toContainText("AAYUSH");
    expect(await page.content()).not.toMatch(/@gmail\.com/i);
    expect(
      await page.evaluate(() => document.fonts.check('400 20px "Monocraft"')),
    ).toBe(true);
    await expect(page.locator(".edition")).toBeVisible();
    await expect(page.locator(".site-header img")).toHaveCount(0);
    await expect(page.locator("#time-machine")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "VIDYA", exact: true }),
    ).toHaveAttribute("href", "https://www.instagram.com/vidya_nepal/");
    await expect(page.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/aayush_yumyum/",
    );
    const portrait = page.locator(".portrait-figure img");
    await portrait.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        portrait.evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: testInfo.outputPath(`portfolio-${width}.png`),
      fullPage: true,
    });
    expect(failures).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`WCAG accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("section navigation and keyboard skip link work", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  for (const [name, id] of [
    ["Work", "work"],
    ["About", "about"],
    ["Let’s talk", "contact"],
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name })
      .click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("contact form validates before submitting", async ({ page }) => {
  let submissions = 0;
  await page.route("https://formsubmit.co/**", (route) => {
    submissions++;
    return route.abort();
  });
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByLabel("Your name")).toBeFocused();
  expect(submissions).toBe(0);
  await fillContact(page);
  await page.getByLabel("What’s on your mind?").fill("           ");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText(
    "at least 10 characters",
  );
  expect(submissions).toBe(0);
});

for (const width of [390, 1440]) {
  test(`header stays accessible when scrolling up from the footer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    const bottomPosition = await page.evaluate(() => scrollY);
    await expect(page.locator(".site-header")).toBeInViewport();
    await page.mouse.wheel(0, -400);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(bottomPosition);
    const header = await page.locator(".site-header").boundingBox();
    expect(header.y).toBe(0);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Work" })
      .click();
    await expect
      .poll(async () => (await page.locator("#work-title").boundingBox()).y)
      .toBeGreaterThan(header.height);
    await page.getByRole("link", { name: "BACK TO TOP" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });
}

test("successful submission forwards the right fields and clears the form", async ({
  page,
}) => {
  let payload;
  await page.route("https://formsubmit.co/ajax/**", async (route) => {
    expect(route.request().url()).toMatch(
      /^https:\/\/formsubmit\.co\/ajax\/[a-f0-9]{32}$/,
    );
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        success: "true",
        message: "The form was submitted successfully.",
      },
    });
  });
  await fillContact(page);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your message has been submitted",
  );
  expect(payload.name).toBe("Ada Lovelace");
  expect(payload.email).toBe("ada@example.org");
  expect(payload.message).toContain("memory-efficient inference");
  await expect(page.getByLabel("What’s on your mind?")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeEnabled();
});

for (const scenario of [
  "network failure",
  "inactive inbox",
  "rejected request",
]) {
  test(`${scenario} preserves the message and provides an email fallback`, async ({
    page,
  }) => {
    await page.route("https://formsubmit.co/ajax/**", (route) => {
      if (scenario === "network failure") return route.abort();
      if (scenario === "inactive inbox")
        return route.fulfill({
          json: {
            success: true,
            message: "Please confirm your email to activate this form.",
          },
        });
      return route.fulfill({ status: 429, json: { success: false } });
    });
    await fillContact(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText(
      "could not be confirmed",
    );
    await expect(page.getByLabel("What’s on your mind?")).not.toHaveValue("");
    await expect(
      page.getByRole("link", { name: "email me directly" }),
    ).toHaveAttribute("href", "mailto:aayush.marasini@usm.edu");
    await expect(
      page.getByRole("button", { name: "Send message" }),
    ).toBeEnabled();
  });
}

test("page content and the native contact form work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(
    page.getByRole("heading", { name: "Selected work" }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveAttribute("method", "POST");
  await expect(page.locator("form")).toHaveAttribute(
    "action",
    /^https:\/\/formsubmit\.co\/[a-f0-9]{32}$/,
  );
  await expect(
    page.getByRole("link", { name: "aayush.marasini@usm.edu" }),
  ).toBeVisible();
  await context.close();
});
