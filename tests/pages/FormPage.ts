import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the Walk-In Bath multi-step form at test-qa.capslock.global
 *
 * The page renders two identical form containers (#form-container-1 and
 * #form-container-2). Every locator uses `.first()` to always interact with
 * the topmost (above-the-fold) instance.
 *
 * Form flow:
 *   Step 1 → ZIP code              (data-tracking="form-step-1")
 *   Step 2 → Interests checkboxes  (data-tracking="form-step-2")
 *   Step 3 → Property type         (data-tracking="form-step-3")
 *   Step 4 → Name + Email          (data-tracking="form-step-4")
 *   Step 5 → Phone → Submit        (data-tracking="form-step-5") → /thankyou
 *
 * Out-of-area path: ZIP 11111 → .step-sorry
 *
 * Why JS clicks for checkboxes/radios:
 *   Custom-styled inputs use visibility:hidden on the native <input> while
 *   showing a visible <label> overlay. Playwright's actionability checks
 *   require element visibility, so we call el.click() via evaluate() to
 *   trigger the native DOM click/change events without those checks.
 *
 * Why explicit waitFor between steps:
 *   Each step transition triggers a JS animation. Waiting for the next step
 *   to be visible ensures subsequent locators resolve against a stable DOM.
 */
export class FormPage {
  readonly page: Page;

  // ── Step containers (form elements, one per step) ────────────────────────
  readonly step1: Locator;
  readonly step2: Locator;
  readonly step3: Locator;
  readonly step4: Locator;
  readonly step5: Locator;
  readonly stepSorry: Locator;

  // ── Step submit/next buttons ──────────────────────────────────────────────
  readonly step1NextBtn: Locator;
  readonly step2NextBtn: Locator;
  readonly step3NextBtn: Locator;
  readonly estimateBtn: Locator;
  readonly submitBtn: Locator;

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly zipInput: Locator;
  readonly interestCheckboxes: Locator;
  readonly propertyRadios: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;

  // ── Progress ─────────────────────────────────────────────────────────────
  readonly stepCurrentIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // data-tracking attributes are the most stable selectors on this page —
    // they do not change with CSS refactors and explicitly mark form steps.
    this.step1 = page.locator('[data-tracking="form-step-1"]').first();
    this.step2 = page.locator('[data-tracking="form-step-2"]').first();
    this.step3 = page.locator('[data-tracking="form-step-3"]').first();
    this.step4 = page.locator('[data-tracking="form-step-4"]').first();
    this.step5 = page.locator('[data-tracking="form-step-5"]').first();
    this.stepSorry = page.locator('.steps.step-sorry').first();

    this.step1NextBtn = page.locator('[data-tracking="btn-step-1"]').first();
    this.step2NextBtn = page.locator('[data-tracking="btn-step-2"]').first();
    this.step3NextBtn = page.locator('[data-tracking="btn-step-3"]').first();
    this.estimateBtn  = page.locator('[data-tracking="btn-step-4"]').first();
    this.submitBtn    = page.locator('[data-tracking="btn-step-5"]').first();

    this.zipInput            = this.step1.locator('[data-zip-code-input]');
    this.interestCheckboxes  = this.step2.locator('input[type="checkbox"]');
    this.propertyRadios      = this.step3.locator('input[type="radio"]');
    this.nameInput           = this.step4.locator('input[name="name"]');
    this.emailInput          = this.step4.locator('input[type="email"]');
    this.phoneInput          = this.step5.locator('input[name="phone"]');

    this.stepCurrentIndicator = page.locator('[data-form-progress-current-step]').first();
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Programmatically click a visibility:hidden checkbox or radio.
   * Triggers the native DOM click/change handlers without requiring the
   * element to pass Playwright's visibility actionability check.
   */
  private async jsClick(locator: Locator): Promise<void> {
    await locator.evaluate((el: HTMLElement) => el.click());
  }

  // ── Page navigation ──────────────────────────────────────────────────────

  /** Navigate to the form and wait for step 1 to be ready for interaction. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.zipInput.waitFor({ state: 'visible' });
  }

  // ── Step helpers ─────────────────────────────────────────────────────────

  /**
   * Step 1: enter a ZIP code and click Next.
   * Does NOT wait for the result — call waitForZipResult() after this.
   */
  async fillZip(zip: string): Promise<void> {
    await this.zipInput.fill(zip);
    await this.step1NextBtn.click();
  }

  /**
   * Wait for the ZIP availability animation to finish.
   * Resolves when either step 2 (service available) or the sorry step
   * (out-of-area) becomes visible, whichever comes first.
   */
  async waitForZipResult(): Promise<void> {
    await Promise.race([
      this.step2.waitFor({ state: 'visible' }),
      this.stepSorry.waitFor({ state: 'visible' }),
    ]);
  }

  /**
   * Step 2: select one or more interest checkboxes, then click Next.
   * Waits for step 3 to be visible before returning.
   */
  async selectInterests(values: string[]): Promise<void> {
    for (const value of values) {
      await this.jsClick(this.step2.locator(`input[value="${value}"]`));
    }
    await this.step2NextBtn.click();
    await this.step3.waitFor({ state: 'visible' });
  }

  /**
   * Step 3: select a property type radio, then click Next.
   * Waits for step 4 to be visible before returning.
   */
  async selectPropertyType(value: string): Promise<void> {
    await this.jsClick(this.step3.locator(`input[value="${value}"]`));
    await this.step3NextBtn.click();
    await this.step4.waitFor({ state: 'visible' });
  }

  /**
   * Step 4: fill Name and Email, then click Go To Estimate.
   * Waits for step 5 to be visible before returning.
   */
  async fillContactInfo(name: string, email: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.estimateBtn.click();
    await this.step5.waitFor({ state: 'visible' });
  }

  /** Step 5: fill phone number and click Submit. */
  async fillPhone(phone: string): Promise<void> {
    await this.phoneInput.fill(phone);
    await this.submitBtn.click();
  }

  /**
   * Convenience method: complete the full happy-path form in one call.
   * Defaults match a service-available ZIP (68901) and owned property.
   */
  async completeFullForm({
    zip          = '68901',
    interests    = ['Safety'],
    propertyType = 'Owned House / Condo',
    name         = 'John Doe',
    email        = 'john.doe@example.com',
    phone        = '8005551234',
  }: Partial<{
    zip: string;
    interests: string[];
    propertyType: string;
    name: string;
    email: string;
    phone: string;
  }> = {}): Promise<void> {
    await this.fillZip(zip);
    await this.waitForZipResult();
    await this.selectInterests(interests);
    await this.selectPropertyType(propertyType);
    await this.fillContactInfo(name, email);
    await this.fillPhone(phone);
  }

}
