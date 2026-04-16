import { expect } from '@playwright/test';
import { test } from './fixtures';

// ---------------------------------------------------------------------------
// Tests labelled [DEFECT] document EXPECTED behaviour the application does not
// yet implement. They intentionally fail and serve as living bug reports.
// ---------------------------------------------------------------------------

// ── Group 1: Tests starting from the home page ────────────────────────────
test.describe('From home page', () => {

  // ── Happy path ───────────────────────────────────────────────────────────
  test('happy path: valid submission redirects to Thank You page', async ({ form, page, testData }) => {
    await test.step('complete all 5 steps', async () => {
      await form.completeFullForm(testData.happyPath);
    });

    await test.step('verify Thank You page', async () => {
      await expect(page).toHaveURL(/\/thankyou/);
      await expect(page.locator('h1, h2').filter({ hasText: /thank you/i })).toBeVisible();
    });
  });

  // ── Out-of-area ZIP ──────────────────────────────────────────────────────
  test('out-of-area ZIP shows unavailability message', async ({ form, testData }) => {
    await form.fillZip(testData.zip.outOfArea);
    await form.waitForZipResult();

    await expect(form.stepSorry).toBeVisible();
    await expect(form.stepSorry).toContainText(/sorry/i);
    await expect(form.step2).not.toBeVisible();
  });

  // ❌ DEFECT: progress counter renders "1 of null" on the sorry screen —
  //    the total step count is undefined in the out-of-area flow.
  test('out-of-area ZIP: progress indicator shows valid step count [DEFECT]', async ({ form, page, testData }) => {
    await form.fillZip(testData.zip.outOfArea);
    await form.waitForZipResult();

    await expect(form.stepSorry).toBeVisible();

    const totalIndicator = page.locator('[data-form-progress-total-steps]').first();
    const totalText = await totalIndicator.textContent();

    expect(
      totalText,
      `Progress total shows "${totalText}" — expected a numeric value`,
    ).toMatch(/^\d+$/);

    const progressText = await page.locator('[data-form-progress-current-step]').first().textContent();
    expect(progressText ?? '', 'Progress current step is null/empty').toMatch(/^\d+$/);
  });

  // ── ZIP format validation ────────────────────────────────────────────────
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

  test.beforeEach(async ({ form, testData }) => {
    await form.fillZip(testData.zip.serviceAvailable);
    await form.waitForZipResult();
    await expect(form.step2).toBeVisible();
  });

  // ── Required fields ──────────────────────────────────────────────────────
  test.describe('Required field validation', () => {

    test('step 4: missing name blocks progression', async ({ form, testData }) => {
      await form.selectInterests(testData.form.interests);
      await form.selectPropertyType(testData.form.propertyType);

      await form.emailInput.fill(testData.form.email);
      await form.estimateBtn.click();

      await expect(form.nameInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 4: missing email blocks progression', async ({ form, testData }) => {
      await form.selectInterests(testData.form.interests);
      await form.selectPropertyType(testData.form.propertyType);

      await form.nameInput.fill(testData.form.name);
      await form.estimateBtn.click();

      await expect(form.emailInput).toBeVisible();
      await expect(form.step5).not.toBeVisible();
    });

    test('step 5: missing phone blocks submission', async ({ form, page, testData }) => {
      await form.selectInterests(testData.form.interests);
      await form.selectPropertyType(testData.form.propertyType);
      await form.fillContactInfo(testData.form.name, testData.form.email);

      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });
  });

  // ── Phone digit-count validation ─────────────────────────────────────────
  test.describe('Phone number digit-count validation', () => {

    test.beforeEach(async ({ form, testData }) => {
      await form.selectInterests(testData.form.interests);
      await form.selectPropertyType(testData.form.propertyType);
      await form.fillContactInfo(testData.form.name, testData.form.email);
    });

    test('fewer than 10 digits is rejected', async ({ form, page, testData }) => {
      await form.phoneInput.fill(testData.form.phone.tooShort);
      await form.submitBtn.click();

      await expect(form.submitBtn).toBeVisible();
      await expect(page).not.toHaveURL(/\/thankyou/);
    });

    // ❌ DEFECT: phone mask silently drops the first digit when it is "1",
    //    so typing 1111111111 produces only 9 entered digits instead of 10.
    test('phone mask silently drops leading "1" digit [DEFECT]', async ({ form, testData }) => {
      await form.phoneInput.click();
      await form.phoneInput.pressSequentially(testData.form.phone.leadingOne, { delay: 50 });

      // All 10 typed digits should be preserved in the mask.
      // Actual (defect): the first "1" is dropped — value is one digit short.
      await expect(form.phoneInput).toHaveValue('(111)111-1111');
    });
  });

  // ── Email format (HTML5 native validation) ───────────────────────────────
  test('email without @ triggers browser validation', async ({ form, testData }) => {
    await form.selectInterests(testData.form.interests);
    await form.selectPropertyType(testData.form.propertyType);

    await form.nameInput.fill(testData.form.name);
    await form.emailInput.fill('notanemail');
    await form.estimateBtn.click();

    await expect(form.emailInput).toBeVisible();
    await expect(form.step5).not.toBeVisible();

    const validationMsg = await form.emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMsg).not.toBe('');
  });

  // ── Property type disqualification ───────────────────────────────────────
  // ❌ DEFECT: rental/mobile-home types proceed to step 4 instead of showing
  //    the error declared in data-error-text on the step-3 form element.
  test('Rental Property shows disqualification error [DEFECT]', async ({ form, testData }) => {
    await form.selectInterests(testData.form.interests);

    await form.step3.locator('input[value="Rental Property"]').evaluate(
      (el: HTMLElement) => el.click(),
    );

    // Read the expected error copy directly from the HTML attribute —
    // keeps the assertion in sync with the source without hardcoding the string.
    const expectedMsg = await form.step3DisqualError.getAttribute('data-error-text');

    await form.step3NextBtn.click();

    // Expected: stay on step 3, show the disqualification error.
    // Actual (defect): step 4 appears — error is never shown.
    await expect(form.step4).not.toBeVisible();
    await expect(form.step3DisqualError).toBeVisible();
    await expect(form.step3DisqualError).toHaveText(expectedMsg!);
  });
});

// ── Group 3: Video player play/pause toggle ───────────────────────────────
test.describe('Video player play/pause toggle', () => {

  test('clicking play toggles the related video paused state', async ({ page }) => {
    await page.goto('/');

    const playButtons = page.locator('button.play');
    await expect(playButtons).toHaveCount(2, { timeout: 30_000 });

    const playBtn = playButtons.first();

    const relatedVideoPaused = async (): Promise<boolean> => {
      return playBtn.evaluate((el) => {
        const container = el.parentElement;
        const video =
          container?.querySelector('video') ??
          container?.parentElement?.querySelector('video');

        if (!(video instanceof HTMLVideoElement)) {
          throw new Error('Related video element not found for play button');
        }

        return video.paused;
      });
    };

    await expect(playBtn).toBeVisible();

    await expect.poll(relatedVideoPaused).toBe(false);

    await playBtn.click();
    await expect.poll(relatedVideoPaused).toBe(true);

    await playBtn.click();
    await expect.poll(relatedVideoPaused).toBe(false);
  });
});

// ── Group 4: Progress indicator ───────────────────────────────────────────
test.describe('Progress counter', () => {

  // ❌ DEFECT: counter skips step 3 — shows "2 → 2 → 4", never "3"
  test('advances through all steps [DEFECT on step 3]', async ({ form, testData }) => {
    await test.step('step 1 done → counter shows 2', async () => {
      await form.fillZip(testData.zip.serviceAvailable);
      await form.waitForZipResult();
      await expect(form.stepCurrentIndicator).toHaveText('2');
    });

    await test.step('step 2 done → counter shows 3', async () => {
      await form.selectInterests(testData.form.interests);
      await expect(form.stepCurrentIndicator).toHaveText('3'); // ❌ BUG: counter stays on 2
    });

    await test.step('step 3 done → counter shows 4', async () => {
      await form.selectPropertyType(testData.form.propertyType);
      await expect(form.stepCurrentIndicator).toHaveText('4');
    });

    await test.step('step 4 done → counter shows 5', async () => {
      await form.fillContactInfo(testData.form.name, testData.form.email);
      await expect(form.stepCurrentIndicator).toHaveText('5');
    });
  });
});
