/**
 * /book/ booking flow.
 *
 * Runs against the real Worker (`wrangler dev`, see playwright.config.ts) with the Turnstile
 * always-pass TEST keys: the site key falls back to 1x00000000000000000000AA when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset at build time, and .dev.vars.e2e uses the matching
 * always-pass secret. Error paths (403/429/500/400) intercept /api/booking with page.route,
 * so they never depend on server state.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { business } from "../src/config/business";

const AC = business.services.find((s) => s.climate === "cool")!;
const HEAT = business.services.find((s) => s.climate === "heat")!;

const contact = {
  name: "Pat Example",
  phone: "(419) 555-0142",
  email: "pat@example.com",
  street: "12 Main St",
  zip: "44857",
};

const stepHeading = (page: Page) => page.locator("#bk-step-title");
const progress = (page: Page) => page.getByRole("progressbar", { name: "Request progress" });
const turnstile = (page: Page) => page.getByTestId("turnstile");
const summary = (page: Page) => page.getByTestId("booking-summary");
const next = (page: Page) => page.getByRole("button", { name: "Next" });
const back = (page: Page) => page.getByRole("button", { name: "Back" });
const send = (page: Page) => page.getByRole("button", { name: /Send request|Sending/ });

async function expectStep(page: Page, n: 1 | 2 | 3, title: string) {
  await expect(progress(page)).toHaveAttribute("aria-valuenow", String(n));
  await expect(page.getByText(`Step ${n} of 3`)).toBeVisible();
  await expect(stepHeading(page)).toHaveText(title);
}

async function fillContact(page: Page, values: Partial<typeof contact> = contact) {
  if (values.name !== undefined) await page.getByLabel("Your name").fill(values.name);
  if (values.phone !== undefined) await page.getByLabel("Phone", { exact: true }).fill(values.phone);
  if (values.email !== undefined) await page.getByLabel("Email").fill(values.email);
  if (values.street !== undefined) await page.getByLabel(/Street address/).fill(values.street);
  if (values.zip !== undefined) await page.getByLabel("ZIP code").fill(values.zip);
}

/** The test site key passes on its own; wait until the widget has handed us a token. */
async function waitForTurnstile(page: Page) {
  await expect(turnstile(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
}

async function goToContactStep(page: Page) {
  await page.goto(`/book/?service=${AC.slug}`);
  await expect(page.getByLabel(new RegExp(AC.name))).toBeChecked();
  await next(page).click();
  await page.getByLabel(/Morning/).check();
  await next(page).click();
  await expectStep(page, 3, "How do we reach you?");
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("page basics", () => {
  test("has one h1, the intro, and a tel: link for the business phone", async ({ page }) => {
    await page.goto("/book/");
    await expect(page).toHaveTitle(/Request service/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Request service");
    const call = page.getByRole("link", { name: business.phoneDisplay }).first();
    await expect(call).toHaveAttribute("href", `tel:${business.phoneE164}`);
    await expect(page.getByText(/Call Joey/i)).toHaveCount(0);
    await expectStep(page, 1, "What's going on?");
  });

  test("does not load Turnstile before step 3", async ({ page }) => {
    const turnstileRequests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("challenges.cloudflare.com")) turnstileRequests.push(r.url());
    });
    await page.goto(`/book/?service=${AC.slug}`);
    await next(page).click();
    await page.getByLabel(/ASAP/).check();
    expect(turnstileRequests).toEqual([]);
    await next(page).click();
    await expect.poll(() => turnstileRequests.length).toBeGreaterThan(0);
    expect(turnstileRequests[0]).toContain("/turnstile/v0/api.js?render=explicit");
  });

  test("ignores an unknown ?service slug", async ({ page }) => {
    await page.goto("/book/?service=plumbing");
    await expect(page.locator('input[name="service"]:checked')).toHaveCount(0);
  });
});

test.describe("happy path", () => {
  test("preselected service → time → contact → confirmation", async ({ page }) => {
    await page.goto(`/book/?service=${AC.slug}`);
    await expect(page.getByLabel(new RegExp(AC.name))).toBeChecked();
    await page.getByLabel(/Anything we should know/).fill("Blowing warm air since Tuesday.");
    await next(page).click();

    await expectStep(page, 2, "When works?");
    await expect(stepHeading(page)).toBeFocused();
    await page.getByLabel(/Morning/).check();
    await next(page).click();

    await expectStep(page, 3, "How do we reach you?");
    await fillContact(page);
    await waitForTurnstile(page);
    await send(page).click();

    const done = page.getByRole("heading", { name: "Got it, Pat." });
    await expect(done).toBeVisible();
    await expect(done).toBeFocused();
    await expect(page.getByText("We'll call you at 419-555-0142 to set a time.")).toBeVisible();
    await expect(page.getByRole("link", { name: business.phoneDisplay }).last()).toHaveAttribute(
      "href",
      `tel:${business.phoneE164}`,
    );
    await expect(progress(page)).toHaveCount(0);
  });

  test("picking the service by hand, with the request body checked", async ({ page }) => {
    await page.goto("/book/");
    await page.getByText(HEAT.name).click();
    await expect(page.getByLabel(new RegExp(HEAT.name))).toBeChecked();
    await next(page).click();
    await page.getByText("Evening").click();
    await next(page).click();
    await fillContact(page, { ...contact, street: "" });
    await waitForTurnstile(page);

    const request = page.waitForRequest((r) => r.url().endsWith("/api/booking") && r.method() === "POST");
    await send(page).click();
    const body = (await request).postDataJSON();
    expect(body).toMatchObject({
      service: HEAT.slug,
      timeWindow: "evening",
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      street: "",
      zip: contact.zip,
      company: "",
    });
    expect(typeof body.turnstileToken).toBe("string");
    expect(body.turnstileToken.length).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: "Got it, Pat." })).toBeFocused();
  });

  test("fits a 360px-wide phone on every step", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/book/?service=${AC.slug}`);
    await expectNoHorizontalOverflow(page);
    await next(page).click();
    await expectNoHorizontalOverflow(page);
    await page.getByLabel(/ASAP/).check();
    await next(page).click();
    await waitForTurnstile(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("validation", () => {
  test("step 1 needs a service: inline error, aria wiring, focus on the field", async ({ page }) => {
    await page.goto("/book/");
    await next(page).click();
    await expectStep(page, 1, "What's going on?");
    const first = page.locator('input[name="service"]').first();
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await expect(first).toBeFocused();
    const errId = await first.getAttribute("aria-describedby");
    expect(errId).toBeTruthy();
    await expect(page.locator(`#${errId}`)).toBeVisible();
  });

  test("submitting step 3 empty shows inline errors and focuses the summary", async ({ page }) => {
    await goToContactStep(page);
    await waitForTurnstile(page);
    let posted = false;
    await page.route("**/api/booking", (route) => {
      posted = true;
      return route.abort();
    });
    await send(page).click();

    await expect(summary(page)).toBeVisible();
    await expect(summary(page)).toBeFocused();
    for (const label of ["Your name", "Email", "ZIP code"]) {
      const input = page.getByLabel(label);
      await expect(input).toHaveAttribute("aria-invalid", "true");
      const describedBy = (await input.getAttribute("aria-describedby"))!.split(" ")[0];
      await expect(page.locator(`#${describedBy}`)).not.toBeEmpty();
    }
    await expect(page.getByLabel("Phone", { exact: true })).toHaveAttribute("aria-invalid", "true");
    // optional field stays clean
    await expect(page.getByLabel(/Street address/)).not.toHaveAttribute("aria-invalid", "true");
    expect(posted).toBe(false);

    // summary links move focus to the field
    await summary(page).getByRole("link", { name: /^Email/ }).click();
    await expect(page.getByLabel("Email")).toBeFocused();
  });

  test("a 400 from the server sends you back to the step with the problem", async ({ page }) => {
    await goToContactStep(page);
    await fillContact(page);
    await waitForTurnstile(page);
    await page.route("**/api/booking", (route) =>
      json(route, 400, { ok: false, error: "validation", errors: { timeWindow: "Pick a time that works.", zip: "Enter a 5-digit ZIP code." } }),
    );
    await send(page).click();
    await expectStep(page, 2, "When works?");
    await expect(summary(page)).toBeFocused();
    await expect(summary(page)).toContainText("Pick a time that works.");
    await page.getByLabel(/Afternoon/).check();
    await next(page).click();
    await expectStep(page, 3, "How do we reach you?");
    await expect(page.getByText("Enter a 5-digit ZIP code.")).toBeVisible();
    await expect(page.getByLabel("ZIP code")).toHaveAttribute("aria-invalid", "true");
  });
});

test("back keeps everything you entered", async ({ page }) => {
  await page.goto("/book/");
  await page.getByText(HEAT.name).click();
  await page.getByLabel(/Anything we should know/).fill("Clicks on, then off.");
  await next(page).click();
  await page.getByLabel(/Afternoon/).check();
  await next(page).click();
  await fillContact(page);

  await back(page).click();
  await expectStep(page, 2, "When works?");
  await expect(stepHeading(page)).toBeFocused();
  await expect(page.getByLabel(/Afternoon/)).toBeChecked();

  await back(page).click();
  await expectStep(page, 1, "What's going on?");
  await expect(page.getByLabel(new RegExp(HEAT.name))).toBeChecked();
  await expect(page.getByLabel(/Anything we should know/)).toHaveValue("Clicks on, then off.");
  await expect(back(page)).toHaveCount(0);

  await next(page).click();
  await next(page).click();
  await expect(page.getByLabel("Your name")).toHaveValue(contact.name);
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue(contact.phone);
  await expect(page.getByLabel("Email")).toHaveValue(contact.email);
  await expect(page.getByLabel(/Street address/)).toHaveValue(contact.street);
  await expect(page.getByLabel("ZIP code")).toHaveValue(contact.zip);
});

test.describe("server and network errors", () => {
  async function submitWith(page: Page, handler: (route: Route) => Promise<void>) {
    await goToContactStep(page);
    await fillContact(page);
    await waitForTurnstile(page);
    await page.route("**/api/booking", handler);
    await send(page).click();
  }

  test("403: spam check failed, widget resets, retry works", async ({ page }) => {
    await submitWith(page, (route) => json(route, 403, { ok: false, error: "turnstile" }));
    await expect(summary(page)).toHaveText("The spam check didn't go through. Please try again.");
    await expect(summary(page)).toBeFocused();
    await expect(page.getByLabel("Your name")).toHaveValue(contact.name);

    await page.unroute("**/api/booking");
    await page.route("**/api/booking", (route) => json(route, 200, { ok: true, id: "bk_test" }));
    await waitForTurnstile(page); // reset, then passes again
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Got it, Pat." })).toBeFocused();
  });

  test("429: rate limited", async ({ page }) => {
    await submitWith(page, (route) => json(route, 429, { ok: false, error: "rate_limited" }));
    await expect(summary(page)).toContainText("Too many requests from this connection. Please wait a minute or call us");
    await expect(summary(page).getByRole("link", { name: business.phoneDisplay })).toHaveAttribute("href", `tel:${business.phoneE164}`);
    await expect(summary(page)).toBeFocused();
  });

  test("500: says it wasn't sent and offers the phone", async ({ page }) => {
    await submitWith(page, (route) => json(route, 500, { ok: false, error: "server" }));
    await expect(summary(page)).toContainText("Something went wrong on our end. Your request wasn't sent. Please call");
    await expect(summary(page)).toContainText("or try again.");
    await expect(summary(page).getByRole("link", { name: business.phoneDisplay })).toHaveAttribute("href", `tel:${business.phoneE164}`);
    await expect(send(page)).toBeEnabled();
  });

  test("network failure is treated like a server error", async ({ page }) => {
    await submitWith(page, (route) => route.abort("failed"));
    await expect(summary(page)).toContainText("Your request wasn't sent.");
  });

  test("the button is disabled while sending, so it can't double-submit", async ({ page }) => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await submitWith(page, async (route) => {
      calls++;
      await gate;
      await json(route, 200, { ok: true, id: "bk_test" });
    });
    await expect(send(page)).toBeDisabled();
    await expect(send(page)).toHaveText(/Sending/);
    await page.getByLabel("ZIP code").press("Enter");
    release();
    await expect(page.getByRole("heading", { name: "Got it, Pat." })).toBeVisible();
    expect(calls).toBe(1);
  });
});

test("keyboard only, start to finish", async ({ page }) => {
  await page.goto("/book/");

  /** Press Tab until the focused element matches, like a keyboard user would. */
  async function tabTo(selector: string, max = 40) {
    for (let i = 0; i < max; i++) {
      if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`could not Tab to ${selector}`);
  }

  await tabTo('input[name="service"]');
  await page.keyboard.press("Space");
  await expect(page.locator('input[name="service"]:checked')).toHaveCount(1);
  await tabTo("textarea");
  await page.keyboard.type("Making a rattling noise.");
  await tabTo('button[type="submit"]');
  await page.keyboard.press("Enter");

  await expectStep(page, 2, "When works?");
  await tabTo('input[name="timeWindow"]');
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight"); // moves and selects the next window
  await expect(page.locator('input[name="timeWindow"]:checked')).toHaveCount(1);
  await tabTo('button[type="submit"]');
  await page.keyboard.press("Enter");

  await expectStep(page, 3, "How do we reach you?");
  for (const [name, value] of Object.entries(contact)) {
    await tabTo(`input[name="${name}"]`);
    await page.keyboard.type(value);
  }
  await waitForTurnstile(page);
  await expect(page.getByLabel("ZIP code")).toBeFocused();
  await page.keyboard.press("Enter"); // implicit submit from the last field
  await expect(page.getByRole("heading", { name: "Got it, Pat." })).toBeFocused();
});

test.describe("every phone number on /book/ is a tel: link", () => {
  async function unlinkedPhoneNumbers(page: Page) {
    return page.evaluate(() => {
      const re = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || el.closest("script, style, noscript, [hidden], [aria-hidden='true']")) continue;
        if (re.test(n.textContent ?? "") && !el.closest('a[href^="tel:"]')) out.push(n.textContent!.trim());
      }
      return out;
    });
  }

  test("on load", async ({ page }) => {
    await page.goto("/book/");
    expect(await unlinkedPhoneNumbers(page)).toEqual([]);
    const tels = page.locator('a[href^="tel:"]');
    expect(await tels.count()).toBeGreaterThan(0);
    for (const href of await tels.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      expect(href).toBe(`tel:${business.phoneE164}`);
    }
  });

  test("in the error messages", async ({ page }) => {
    await goToContactStep(page);
    await fillContact(page);
    await waitForTurnstile(page);
    await page.route("**/api/booking", (route) => json(route, 500, { ok: false, error: "server" }));
    await send(page).click();
    await expect(summary(page)).toBeVisible();
    // The customer's own number is only in the input's value, which isn't a text node.
    expect(await unlinkedPhoneNumbers(page)).toEqual([]);
  });

  test("on the confirmation, the business number is linked", async ({ page }) => {
    await goToContactStep(page);
    await fillContact(page);
    await waitForTurnstile(page);
    await page.route("**/api/booking", (route) => json(route, 200, { ok: true, id: "bk_test" }));
    await send(page).click();
    await expect(page.getByRole("heading", { name: "Got it, Pat." })).toBeVisible();
    // The only unlinked number allowed is the customer's own, echoed back to them.
    expect(await unlinkedPhoneNumbers(page)).toEqual(["419-555-0142"]);
  });
});

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}
