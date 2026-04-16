import { test, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Mobile layout tests — iPhone 14 Pro Max (430 × 932)
//
// ❌ DEFECT: At 430 px viewport width, form elements overlap or get clipped.
// ❌ DEFECT: "Estimate Your Cost" CTA button is unresponsive on mobile.
//
// These tests are run only on the mobile-chrome project defined in
// playwright.config.ts and are skipped on desktop automatically via the
// project filter in that config.
//
// Each test targets a specific step so failures are easy to localise.
// ---------------------------------------------------------------------------

test.describe('Mobile layout — form fits within 430 px viewport', () => {

  // ── Helper ──────────────────────────────────────────────────────────────
  /**
   * Assert that no element inside the form overflows the viewport horizontally.
   * A scrollWidth > innerWidth means content is clipped or forces a scrollbar.
   */
  async function assertNoHorizontalOverflow(form: Awaited<ReturnType<typeof import('./fixtures')['test']['extend']>> extends never ? never : InstanceType<typeof import('./pages/FormPage')['FormPage']>, page: import('@playwright/test').Page) {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow — content is clipped').toBe(false);
  }

  // ── CTA button: "Estimate Your Cost" ─────────────────────────────────────
  // ❌ DEFECT: button is unresponsive on mobile — clicking it does not scroll
  //    to or activate the form, so mobile visitors cannot enter the funnel.
  test('"Estimate Your Cost" CTA button activates the form on mobile [DEFECT]', async ({ page }) => {
    // The fixture already navigated to '/'. Look for the body CTA button
    // (outside the form containers — it appears in the reviews / cost section).
    const ctaBtn = page.locator('a, button').filter({ hasText: /estimate your cost/i }).first();

    await expect(ctaBtn, '"Estimate Your Cost" button not found on page').toBeVisible({ timeout: 10_000 });

    await ctaBtn.click();

    // After clicking, the ZIP input (step 1) should become visible / in-viewport,
    // indicating the page scrolled to or revealed the form.
    // Expected: step 1 ZIP input is visible.
    // Actual (defect): nothing happens — the ZIP input is never scrolled into view.
    const zipInput = page.locator('[data-zip-code-input]').first();
    await expect(zipInput, 'ZIP input not visible after clicking CTA — button is unresponsive').toBeInViewport({ timeout: 5_000 });
  });

  // ── Step 1: ZIP input and Next button ────────────────────────────────────
  test('step 1: ZIP input and Next button are fully visible', async ({ form, page }) => {
    const zipBox  = await form.zipInput.boundingBox();
    const btnBox  = await form.step1NextBtn.boundingBox();
    const vw      = page.viewportSize()!.width;

    expect(zipBox, 'ZIP input not found').not.toBeNull();
    expect(btnBox, 'Next button not found').not.toBeNull();

    // Neither element should extend beyond the right edge of the viewport
    expect(zipBox!.x + zipBox!.width).toBeLessThanOrEqual(vw);
    expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(vw);

    // Both should have positive height (not collapsed / zero-height)
    expect(zipBox!.height).toBeGreaterThan(0);
    expect(btnBox!.height).toBeGreaterThan(0);

    // No horizontal overflow on the page
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow on step 1').toBe(false);
  });

  // ── Step 2: Interest cards ────────────────────────────────────────────────
  test('step 2: interest option cards do not overflow viewport', async ({ form, page }) => {
    await form.fillZip('68901');
    await form.waitForZipResult();
    await expect(form.step2).toBeVisible();

    const vw = page.viewportSize()!.width;

    // Check each interest checkbox label fits within the viewport
    const checkboxes = form.interestCheckboxes;
    const count = await checkboxes.count();

    for (let i = 0; i < count; i++) {
      const id    = await checkboxes.nth(i).getAttribute('id');
      const label = page.locator(`label[for="${id}"]`);
      const box   = await label.boundingBox();

      if (box) {
        expect(
          box.x + box.width,
          `Interest card "${id}" overflows viewport`,
        ).toBeLessThanOrEqual(vw + 1); // +1 px tolerance for sub-pixel rendering
      }
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow on step 2').toBe(false);
  });

  // ── Step 3: Property type cards ───────────────────────────────────────────
  test('step 3: property type cards do not overflow viewport', async ({ form, page }) => {
    await form.fillZip('68901');
    await form.waitForZipResult();
    await form.selectInterests(['Safety']);
    await expect(form.step3).toBeVisible();

    const vw    = page.viewportSize()!.width;
    const radios = form.propertyRadios;
    const count  = await radios.count();

    for (let i = 0; i < count; i++) {
      const id    = await radios.nth(i).getAttribute('id');
      const label = page.locator(`label[for="${id}"]`);
      const box   = await label.boundingBox();

      if (box) {
        expect(
          box.x + box.width,
          `Property card "${id}" overflows viewport`,
        ).toBeLessThanOrEqual(vw + 1);
      }
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow on step 3').toBe(false);
  });

  // ── Step 4: Name / Email inputs ───────────────────────────────────────────
  test('step 4: Name and Email inputs do not overflow viewport', async ({ form, page }) => {
    await form.fillZip('68901');
    await form.waitForZipResult();
    await form.selectInterests(['Safety']);
    await form.selectPropertyType('Owned House / Condo');
    await expect(form.step4).toBeVisible();

    const vw      = page.viewportSize()!.width;
    const nameBox = await form.nameInput.boundingBox();
    const mailBox = await form.emailInput.boundingBox();

    expect(nameBox, 'Name input not found').not.toBeNull();
    expect(mailBox, 'Email input not found').not.toBeNull();

    expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(vw + 1);
    expect(mailBox!.x + mailBox!.width).toBeLessThanOrEqual(vw + 1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow on step 4').toBe(false);
  });

  // ── Step 5: Phone input and Submit button ─────────────────────────────────
  test('step 5: Phone input and Submit button do not overflow viewport', async ({ form, page }) => {
    await form.fillZip('68901');
    await form.waitForZipResult();
    await form.selectInterests(['Safety']);
    await form.selectPropertyType('Owned House / Condo');
    await form.fillContactInfo('John Doe', 'john@example.com');
    await expect(form.step5).toBeVisible();

    const vw      = page.viewportSize()!.width;
    const phoneBox = await form.phoneInput.boundingBox();
    const btnBox   = await form.submitBtn.boundingBox();

    expect(phoneBox, 'Phone input not found').not.toBeNull();
    expect(btnBox,   'Submit button not found').not.toBeNull();

    expect(phoneBox!.x + phoneBox!.width).toBeLessThanOrEqual(vw + 1);
    expect(btnBox!.x  + btnBox!.width).toBeLessThanOrEqual(vw + 1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, 'Page has horizontal overflow on step 5').toBe(false);
  });
});
