import { type Page } from '@playwright/test';
import { test as formTest, expect } from './fixtures';

// ---------------------------------------------------------------------------
// Mobile layout tests — iPhone 14 Pro Max (430 × 932)
//
// ❌ DEFECT: At 430 px viewport width, form elements overlap or get clipped.
// ❌ DEFECT: "Estimate Your Cost" CTA button is unresponsive on mobile.
//
// Run only on the mobile-chrome project (playwright.config.ts).
// Nested describe + beforeEach eliminates repeated step-navigation setup.
// ---------------------------------------------------------------------------

/** Assert no horizontal scrollbar / clipped content. */
async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow, `Page has horizontal overflow on ${label}`).toBe(false);
}

formTest.describe('Mobile layout — form fits within 430 px viewport', () => {

  // ── CTA button ─────────────────────────────────────────────────────────────
  // ❌ DEFECT: unresponsive — clicking does not scroll/activate the form.
  formTest('"Estimate Your Cost" CTA button activates the form on mobile [DEFECT]', async ({ page }) => {
    const ctaBtn  = page.locator('a, button').filter({ hasText: /estimate your cost/i }).first();
    const zipInput = page.locator('[data-zip-code-input]').first();

    await expect(ctaBtn, '"Estimate Your Cost" button not found').toBeVisible();
    await ctaBtn.click();

    // Expected: ZIP input scrolls into view. Actual (defect): nothing happens.
    await expect(zipInput, 'ZIP input not in viewport after CTA click — button is unresponsive').toBeInViewport();
  });

  // ── Show more / Show less toggle ────────────────────────────────────────────
  formTest('"Show more" expands reviews and "Show less" collapses them', async ({ page }) => {
    const showMoreBtn = page.locator('a.moreless').first();
    const btnText     = showMoreBtn.locator('span.moreless__txt');
    const reviewFull  = page.locator('.reviewFull').first();
    const reviewWrap  = page.locator('.reviewWrap').first();

    await showMoreBtn.scrollIntoViewIfNeeded();
    await expect(showMoreBtn).toBeVisible();

    // Initial state
    await expect(btnText).toHaveText(/show more/i);
    await expect(reviewWrap).not.toHaveClass(/reviewWrap_opened/);
    await expect(reviewFull).toBeHidden();

    // Expand
    await showMoreBtn.click();
    await expect(btnText).toHaveText(/show less/i);
    await expect(reviewWrap).toHaveClass(/reviewWrap_opened/);
    await expect(reviewFull).toBeVisible();

    // Collapse
    await showMoreBtn.click();
    await expect(btnText).toHaveText(/show more/i);
    await expect(reviewWrap).not.toHaveClass(/reviewWrap_opened/);
    await expect(reviewFull).toBeHidden();
  });

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  formTest('step 1: ZIP input and Next button are fully visible', async ({ form, page }) => {
    const vw     = page.viewportSize()!.width;
    const zipBox = await form.zipInput.boundingBox();
    const btnBox = await form.step1NextBtn.boundingBox();

    expect(zipBox, 'ZIP input not found').not.toBeNull();
    expect(btnBox, 'Next button not found').not.toBeNull();

    expect(zipBox!.x + zipBox!.width).toBeLessThanOrEqual(vw);
    expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(vw);
    expect(zipBox!.height).toBeGreaterThan(0);
    expect(btnBox!.height).toBeGreaterThan(0);

    await assertNoOverflow(page, 'step 1');
  });

  // ── Steps 2–5: share ZIP setup via beforeEach ──────────────────────────────
  formTest.describe('step 2+: valid ZIP pre-filled', () => {

    formTest.beforeEach(async ({ form }) => {
      await form.fillZip('68901');
      await form.waitForZipResult();
      await expect(form.step2).toBeVisible();
    });

    formTest('step 2: interest option cards do not overflow viewport', async ({ form, page }) => {
      const vw       = page.viewportSize()!.width;
      const checkboxes = form.interestCheckboxes;
      const count    = await checkboxes.count();

      for (let i = 0; i < count; i++) {
        const id    = await checkboxes.nth(i).getAttribute('id');
        const label = page.locator(`label[for="${id}"]`);
        const box   = await label.boundingBox();
        if (box) {
          expect(box.x + box.width, `Interest card "${id}" overflows viewport`).toBeLessThanOrEqual(vw + 1);
        }
      }

      await assertNoOverflow(page, 'step 2');
    });

    // ── Steps 3–5: share interests setup ──────────────────────────────────────
    formTest.describe('step 3+: interests selected', () => {

      formTest.beforeEach(async ({ form }) => {
        await form.selectInterests(['Safety']);
      });

      formTest('step 3: property type cards do not overflow viewport', async ({ form, page }) => {
        const vw    = page.viewportSize()!.width;
        const radios = form.propertyRadios;
        const count  = await radios.count();

        for (let i = 0; i < count; i++) {
          const id    = await radios.nth(i).getAttribute('id');
          const label = page.locator(`label[for="${id}"]`);
          const box   = await label.boundingBox();
          if (box) {
            expect(box.x + box.width, `Property card "${id}" overflows viewport`).toBeLessThanOrEqual(vw + 1);
          }
        }

        await assertNoOverflow(page, 'step 3');
      });

      // ── Steps 4–5: share property type setup ──────────────────────────────────
      formTest.describe('step 4+: property type selected', () => {

        formTest.beforeEach(async ({ form }) => {
          await form.selectPropertyType('Owned House / Condo');
        });

        formTest('step 4: Name and Email inputs do not overflow viewport', async ({ form, page }) => {
          const vw      = page.viewportSize()!.width;
          const nameBox = await form.nameInput.boundingBox();
          const mailBox = await form.emailInput.boundingBox();

          expect(nameBox, 'Name input not found').not.toBeNull();
          expect(mailBox, 'Email input not found').not.toBeNull();

          expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(vw + 1);
          expect(mailBox!.x + mailBox!.width).toBeLessThanOrEqual(vw + 1);

          await assertNoOverflow(page, 'step 4');
        });

        // ── Step 5: share contact info setup ────────────────────────────────────
        formTest.describe('step 5: contact info filled', () => {

          formTest.beforeEach(async ({ form }) => {
            await form.fillContactInfo('John Doe', 'john@example.com');
          });

          formTest('step 5: Phone input and Submit button do not overflow viewport', async ({ form, page }) => {
            const vw       = page.viewportSize()!.width;
            const phoneBox = await form.phoneInput.boundingBox();
            const btnBox   = await form.submitBtn.boundingBox();

            expect(phoneBox, 'Phone input not found').not.toBeNull();
            expect(btnBox,   'Submit button not found').not.toBeNull();

            expect(phoneBox!.x + phoneBox!.width).toBeLessThanOrEqual(vw + 1);
            expect(btnBox!.x  + btnBox!.width).toBeLessThanOrEqual(vw + 1);

            await assertNoOverflow(page, 'step 5');
          });
        });
      });
    });
  });
});
