import { test, expect } from './fixtures';
import { FormPage } from './pages/FormPage';

// ---------------------------------------------------------------------------
// TEST SUITE — Walk-In Bath multi-step form
//
// The `form` fixture (defined in fixtures.ts) creates a FormPage instance and
// navigates to the home page before each test.
//
// Tests are organised into describe blocks by entry point:
//   • "From home page"  — tests that start at step 1
//   • "From step 2"     — tests that share a beforeEach that fills a valid ZIP
//   • "Progress indicator" — UX regression for the step counter
//
// Tests labelled [DEFECT] document EXPECTED behaviour that the application
// currently does not implement. They intentionally fail and serve as living
// bug reports.
// ---------------------------------------------------------------------------

// ── Group 1: Tests starting from the home page ────────────────────────────
test.describe('From home page', () => {

  // ── 1. Happy path ────────────────────────────────────────────────────────
  test('happy path: valid submission redirects to Thank You page', async ({ form, page }) => {
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
      await expect(page).toHaveURL(/\/thankyou/);
      await expect(page.locator('h1, h2').filter({ hasText: /thank you/i })).toBeVisible();
    });
  });

  // ── 2. Out-of-area ZIP ───────────────────────────────────────────────────
  test('out-of-area ZIP (11111) shows unavailability message', async ({ form }) => {
    await form.fillZip('11111');
    await form.waitForZipResult();

    await expect(form.stepSorry).toBeVisible();
    await expect(form.stepSorry).toContainText(/sorry/i);
    await expect(form.step2).not.toBeVisible();
  });

  // ── 2b. Out-of-area ZIP — progress indicator ─────────────────────────────
  // ❌ DEFECT: progress counter renders "1 of null" on the sorry screen —
  //    the total step count is undefined in the out-of-area flow.
  test('out-of-area ZIP: progress indicator shows valid step count [DEFECT]', async ({ form, page }) => {
    await form.fillZip('11111');
    await form.waitForZipResult();

    await expect(form.stepSorry).toBeVisible();

    // The total-steps element must exist and contain a real number, not "null"
    // or an empty string.
    const totalIndicator = page.locator('[data-form-progress-total-steps]').first();
    const totalText = await totalIndicator.textContent();

    // Should be a numeric string (e.g. "1" or "5"), never empty or "null"
    expect(
      totalText,
      `Progress total shows "${totalText}" — expected a numeric value`,
    ).toMatch(/^\d+$/);

    // The combined progress text must not contain the word "null"
    const progressText = await page.locator('[data-form-progress-current-step]').first().textContent();
    expect(progressText ?? '', 'Progress current step is null/empty').toMatch(/^\d+$/);
  });

  // ── 3. ZIP format validation ─────────────────────────────────────────────
  test.describe('ZIP code format validation', () => {

    test('too short (4 digits): stays on step 1', async ({ form }) => {
      await form.zipInput.fill('1234');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });

    test('too long (6 digits): stays on step 1', async ({ form }) => {
      await form.zipInput.fill('123456');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });

    test('non-numeric input: stays on step 1', async ({ form }) => {
      await form.zipInput.fill('abcde');
      await form.step1NextBtn.click();

      await expect(form.step2).not.toBeVisible();
      await expect(form.zipInput).toBeVisible();
    });
  });
});

// ── Group 2: Tests starting at step 2 (valid ZIP already submitted) ───────
test.describe('From step 2 (service-available ZIP pre-filled)', () => {

  test.beforeEach(async ({ form }) => {
    await form.fillZip('68901');
    await form.waitForZipResult();
    await expect(form.step2).toBeVisible();
  });

  // ── 4. Required fields ───────────────────────────────────────────────────
  test.describe('Required field validation', () => {

    test('step 4: missing name blocks progression', async ({ form }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');

      await form.emailInput.fill('test@example.com');
      await form.estimateBtn.click();

      await expect(form.nameInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 4: missing email blocks progression', async ({ form }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');

      await form.nameInput.fill('John Doe');
      await form.estimateBtn.click();

      await expect(form.emailInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 5: missing phone blocks submission', async ({ form, page }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');
      await form.fillContactInfo('John Doe', 'john@example.com');

      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });
  });

  // ── 5. Phone digit-count validation ─────────────────────────────────────
  test.describe('Phone number digit-count validation', () => {

    test.beforeEach(async ({ form }) => {
      await form.selectInterests(['Safety']);
      await form.selectPropertyType('Owned House / Condo');
      await form.fillContactInfo('John Doe', 'john@example.com');
    });

    test('fewer than 10 digits is rejected', async ({ form, page }) => {
      await form.phoneInput.fill('800555'); // 6 digits
      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });

    // ❌ DEFECT: form accepts phone numbers longer than 10 digits
    test('more than 10 digits is rejected [DEFECT]', async ({ form, page }) => {
      await form.phoneInput.fill('80055512341'); // 11 digits
      await form.submitBtn.click();

      // Should stay on step 5 — but the form navigates to /thankyou (defect)
      await expect(page).not.toHaveURL(/\/thankyou/);
      await expect(form.submitBtn).toBeVisible();
    });
  });

  // ── 6. Email format (HTML5 native validation) ────────────────────────────
  test('email without @ triggers browser validation', async ({ form }) => {
    await form.selectInterests(['Safety']);
    await form.selectPropertyType('Owned House / Condo');

    await form.nameInput.fill('John Doe');
    await form.emailInput.fill('notanemail');
    await form.estimateBtn.click();

    await expect(form.emailInput).toBeVisible();
    await expect(form.step5).not.toBeVisible();

    const validationMsg = await form.emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMsg).not.toBe('');
  });

  // ── 8. Property type disqualification ────────────────────────────────────
  // ❌ DEFECT: rental/mobile-home types proceed to step 4 instead of showing
  //    the error defined in data-error-text on the step-3 form element:
  //    "Unfortunately, we don't install walk-in tubs in rental and mobile homes."
  test('Rental Property shows disqualification error [DEFECT]', async ({ form }) => {
    await form.selectInterests(['Safety']);

    await form.step3.locator('input[value="Rental Property"]').evaluate(
      (el: HTMLElement) => el.click(),
    );
    await form.step3NextBtn.click();

    // Expected: form stays on step 3 and shows an error.
    // Actual (defect): step 4 appears — the disqualification is not enforced.
    await expect(form.step4).not.toBeVisible();
  });
});

// ── Group 3: Video player play/pause toggle ───────────────────────────────
test.describe('Video player play/pause toggle', () => {

  test('clicking play toggles <i> from lavin-play → lavin-pause → lavin-play', async ({ form, page }) => {
    const playBtn = page.locator('button.play').first();

    // Scroll the button into view so it is actionable
    await playBtn.scrollIntoViewIfNeeded();
    await expect(playBtn).toBeVisible();

    const icon = playBtn.locator('i').first();

    // ── Initial state: play icon ────────────────────────────────────────────
    await expect(icon).toHaveClass(/lavin-play/);
    await expect(icon).not.toHaveClass(/lavin-pause/);

    // ── Click once → pause icon ─────────────────────────────────────────────
    await playBtn.click();
    await expect(icon).toHaveClass(/lavin-pause/);
    await expect(icon).not.toHaveClass(/lavin-play/);

    // ── Click again → back to play icon ─────────────────────────────────────
    await playBtn.click();
    await expect(icon).toHaveClass(/lavin-play/);
    await expect(icon).not.toHaveClass(/lavin-pause/);
  });
});

// ── Group 4: Progress indicator ───────────────────────────────────────────
test.describe('Progress counter', () => {

  // ❌ DEFECT: counter skips step 3 — shows "2 → 2 → 4", never "3"
  test('advances through all steps [DEFECT on step 3]', async ({ form }) => {
    await test.step('step 1 done → counter shows 2', async () => {
      await form.fillZip('68901');
      await form.waitForZipResult();
      await expect(form.stepCurrentIndicator).toHaveText('2');
    });

    await test.step('step 2 done → counter shows 3', async () => {
      await form.selectInterests(['Safety']);
      await expect(form.stepCurrentIndicator).toHaveText('3'); // ❌ BUG: counter stays on 2
    });

    await test.step('step 3 done → counter shows 4', async () => {
      await form.selectPropertyType('Owned House / Condo');
      await expect(form.stepCurrentIndicator).toHaveText('4');
    });

    await test.step('step 4 done → counter shows 5', async () => {
      await form.fillContactInfo('John Doe', 'john@example.com');
      await expect(form.stepCurrentIndicator).toHaveText('5');
    });
  });
});
