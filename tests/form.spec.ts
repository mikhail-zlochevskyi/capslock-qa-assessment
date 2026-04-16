import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

// ---------------------------------------------------------------------------
// TEST SUITE — Walk-In Bath multi-step form
//
// Tests are organised into describe blocks by entry point:
//   • "From home page"  — tests that start at step 1
//   • "From step 2"     — tests that start at the interests step (valid ZIP
//                         already submitted); share a beforeEach for setup
//   • "Progress indicator" — UX regression for the step counter
//
// Tests named with ❌ DEFECT document EXPECTED behaviour that the application
// currently does not implement.  They intentionally fail and serve as living
// bug reports.
// ---------------------------------------------------------------------------

// ── Group 1: Tests starting from the home page ────────────────────────────
test.describe('From home page', () => {

  // ── 1. Happy path ────────────────────────────────────────────────────────
  test('happy path: valid submission redirects to Thank You page', async ({ page }) => {
    const form = new FormPage(page);
    await form.goto();

    await test.step('complete all 5 steps', async () => {
      await form.completeFullForm({
        zip:          '68901',
        interests:    ['Safety'],
        propertyType: 'Owned House / Condo',
        name:         'Jane Smith',
        email:        'jane.smith@example.com',
        phone:        '8005551234',
      });
    });

    await test.step('verify Thank You page', async () => {
      await expect(page).toHaveURL(/\/thankyou/, { timeout: 15_000 });
      await expect(page.locator('h1, h2').filter({ hasText: /thank you/i })).toBeVisible();
    });
  });

  // ── 2. Out-of-area ZIP ───────────────────────────────────────────────────
  test('out-of-area ZIP (11111) shows unavailability message', async ({ page }) => {
    const form = new FormPage(page);
    await form.goto();

    await form.fillZip('11111');
    await form.waitForZipResult();

    await expect(form.stepSorry).toBeVisible();
    await expect(form.stepSorry).toContainText(/sorry/i);
    // Interests step must NOT have appeared
    await expect(form.step2).not.toBeVisible();
  });

  // ── 3. ZIP format validation ─────────────────────────────────────────────
  test.describe('ZIP code format validation', () => {

    test('too short (4 digits): stays on step 1', async ({ page }) => {
      const form = new FormPage(page);
      await form.goto();

      await form.zipInput.fill('1234');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });

    test('too long (6 digits): stays on step 1', async ({ page }) => {
      const form = new FormPage(page);
      await form.goto();

      await form.zipInput.fill('123456');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });

    test('non-numeric input: stays on step 1', async ({ page }) => {
      const form = new FormPage(page);
      await form.goto();

      await form.zipInput.fill('abcde');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });
  });
});

// ── Group 2: Tests starting at step 2 (valid ZIP already submitted) ───────
test.describe('From step 2 (service-available ZIP pre-filled)', () => {
  let form: FormPage;

  test.beforeEach(async ({ page }) => {
    form = new FormPage(page);
    await form.goto();
    await form.fillZip('68901');
    await form.waitForZipResult();
    // Confirm we are on step 2 before each test
    await expect(form.step2).toBeVisible();
  });

  // ── 4. Required fields ───────────────────────────────────────────────────
  test.describe('Required field validation', () => {

    test('step 4: missing name blocks progression', async ({ page }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');

      await form.emailInput.fill('test@example.com');
      await form.estimateBtn.click();

      // Validate: step 4 stays visible, step 5 does not appear
      await expect(form.nameInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 4: missing email blocks progression', async ({ page }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');

      await form.nameInput.fill('John Doe');
      await form.estimateBtn.click();

      await expect(form.emailInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 5: missing phone blocks submission', async ({ page }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');
      await form.fillContactInfo('John Doe', 'john@example.com');

      // Leave phone empty and submit
      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });
  });

  // ── 5. Phone digit-count validation ─────────────────────────────────────
  test.describe('Phone number digit-count validation', () => {

    test.beforeEach(async () => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');
      await form.fillContactInfo('John Doe', 'john@example.com');
    });

    test('fewer than 10 digits is rejected', async ({ page }) => {
      await form.phoneInput.fill('800555'); // 6 digits
      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });

    // ❌ DEFECT: form accepts phone numbers longer than 10 digits
    test('more than 10 digits is rejected [DEFECT]', async ({ page }) => {
      await form.phoneInput.fill('80055512341'); // 11 digits
      await form.submitBtn.click();

      // Should stay on step 5 — but the form navigates to /thankyou (defect)
      await expect(page).not.toHaveURL(/\/thankyou/);
      await expect(form.submitBtn).toBeVisible();
    });
  });

  // ── 6. Email format (HTML5 native validation) ────────────────────────────
  test('email without @ triggers browser validation', async ({ page }) => {
    await form.selectInterests(['Safety']);
    await form.selectPropertyType('Owned House / Condo');

    await form.nameInput.fill('John Doe');
    await form.emailInput.fill('notanemail');
    await form.estimateBtn.click();

    // HTML5 validation should block the form; email input still visible
    await expect(form.emailInput).toBeVisible();
    await expect(form.step5).not.toBeVisible();

    // Browser surfaces a non-empty validationMessage on the invalid field
    const validationMsg = await form.emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMsg).not.toBe('');
  });

  // ── 8. Property type disqualification ────────────────────────────────────
  // ❌ DEFECT: rental/mobile-home types proceed to step 4 instead of showing
  //    the error defined in data-error-text on the step-3 form element:
  //    "Unfortunately, we don't install walk-in tubs in rental and mobile homes."
  test('Rental Property shows disqualification error [DEFECT]', async ({ page }) => {
    await form.selectInterests(['Safety']);

    await form.step3.locator('input[value="Rental Property"]').evaluate(
      (el: HTMLElement) => el.click(),
    );
    await form.step3NextBtn.click();

    // Expected: form stays on step 3 and shows an error.
    // Actual (defect): step 4 appears — the disqualification is not enforced.
    await expect(form.step4).not.toBeVisible({ timeout: 3_000 });
  });
});

// ── Group 3: Progress indicator ───────────────────────────────────────────
test.describe('Progress counter', () => {

  // ❌ DEFECT: counter skips step 3 — shows "2 → 2 → 4", never "3"
  test('advances through all steps [DEFECT on step 3]', async ({ page }) => {
    const form = new FormPage(page);
    await form.goto();

    await test.step('step 1 done → counter shows 2', async () => {
      await form.fillZip('68901');
      await form.waitForZipResult();
      await form.expectStep(2);
    });

    await test.step('step 2 done → counter shows 3', async () => {
      await form.selectInterests(['Safety']);
      await form.expectStep(3); // ❌ BUG: counter stays on 2
    });

    await test.step('step 3 done → counter shows 4', async () => {
      await form.selectPropertyType('Owned House / Condo');
      await form.expectStep(4);
    });

    await test.step('step 4 done → counter shows 5', async () => {
      await form.fillContactInfo('John Doe', 'john@example.com');
      await form.expectStep(5);
    });
  });
});
