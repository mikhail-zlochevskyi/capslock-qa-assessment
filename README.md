# Capslock QA Tech Assignment — Walk-In Bath Form Tests

Playwright-based end-to-end tests for the multi-step lead-gen form at [test-qa.capslock.global](https://test-qa.capslock.global).

---

## Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser (Chromium)
npx playwright install chromium

# 3. Run all tests (headless)
npm test
# or
npx playwright test

# 4. Run with browser visible (for debugging)
npm run test:headed

# 5. View the HTML report after a test run
npm run test:report
```

---

## Form Structure (5 steps)

| Step | Content | Key fields |
|------|---------|------------|
| 1 | ZIP Code | `zipCode` input → "Next" button |
| 2 | Why interested? | `whyInterested[]` checkboxes → "Next" |
| 3 | Property type | `typeOfProperty` radios → "Next" |
| 4 | Contact info | `name`, `email` inputs → "Go To Estimate" |
| 5 | Phone | `phone` input → "Submit Your Request" → `/thankyou` |

Out-of-area ZIP (e.g. 11111) → `.step-sorry` screen.

---

## Full List of Scenarios

| # | Scenario | Priority | Status |
|---|----------|----------|--------|
| 1 | Happy path — valid data → /thankyou redirect | 🔴 Critical | ✅ Pass |
| 2 | Out-of-area ZIP (11111) shows sorry message | 🔴 Critical | ✅ Pass |
| 3 | ZIP too short (4 digits) stays on step 1 | 🟠 High | ✅ Pass |
| 3b | ZIP too long (6 digits) stays on step 1 | 🟠 High | ✅ Pass |
| 3c | Non-numeric ZIP stays on step 1 | 🟠 High | ✅ Pass |
| 4 | Missing Name blocks step 4 progression | 🟠 High | ✅ Pass |
| 4b | Missing Email blocks step 4 progression | 🟠 High | ✅ Pass |
| 4c | Missing Phone blocks step 5 submission | 🟠 High | ✅ Pass |
| 5 | Phone < 10 digits is rejected | 🟠 High | ✅ Pass |
| 5b | Phone > 10 digits is rejected | 🟠 High | ❌ **Defect** |
| 6 | Invalid email format triggers HTML5 validation | 🟡 Medium | ✅ Pass |
| 7 | Progress counter advances through all 5 steps | 🟡 Medium | ❌ **Defect** |
| 8 | Rental/Mobile Home shows disqualification error | 🟡 Medium | ❌ **Defect** |
| 9 | "Estimate Your Cost" CTA button scrolls to / opens form on mobile | 🔴 Critical | ❌ **Defect** |

---

## Top 5 Automated Tests — Selection & Rationale

**Selected tests: 1, 2, 3, 4, 5**

### Test 1 — Happy Path (full form → /thankyou redirect)
The golden path for the entire funnel. If this fails, no lead is being captured. It also exercises every step and verifies the final redirect, making it the highest-value single regression check.

### Test 2 — Out-of-area ZIP (11111) shows unavailability
The form has two completely different flows based on ZIP code. The out-of-area path has its own UI and a separate email-capture step. Without this test, a regression could silently route out-of-area users through the normal funnel.

### Test 3 (a/b/c) — ZIP code format validation
ZIP is the very first gate in the funnel. If the format is not enforced (exactly 5 digits, numeric only), invalid data enters the system and corrupts service-area lookups. Three sub-cases cover both sides of the boundary (too short, too long, non-numeric).

### Test 4 (a/b/c) — Required fields block progression
Steps 4 and 5 collect the actual contact data — the whole reason the form exists. If name, email, or phone can be skipped, the company receives uncallable / unemailable leads. These tests verify each field individually.

### Test 5 — Phone number digit count (< 10 digits rejected)
The callback system needs a valid US phone number. A phone with fewer than 10 digits is structurally invalid. This test confirms the form enforces the minimum length. (Test 5b documents a defect where the maximum is not enforced.)

---

## Discovered Defects

### Defect 1 — Phone number maximum not validated (Test 5b)
**Expected:** A phone number with more than 10 digits should be rejected, keeping the user on step 5.  
**Actual:** Entering 11+ digits (e.g. `80055512341`) proceeds to `/thankyou`.  
**Severity:** High — the callback system receives an invalid phone number, making the lead uncallable.

---

### Defect 2 — Progress counter skips step 3 (Test 7)
**Expected:** The "X of 5" counter increments at every step: 1 → 2 → 3 → 4 → 5.  
**Actual:** The counter goes 2 → 2 (stays on 2 during step 3) → 4. Step 3 is never reflected in the counter.  
**Severity:** Low/UX — users see confusing progress feedback; the jump from 2 to 4 makes the form look broken.

---

### Defect 3 — Rental/Mobile Home property type is not rejected (Test 8)
**Expected:** Per `data-error-text` on the form element ("Unfortunately, we don't install walk-in tubs in rental and mobile homes"), selecting "Rental Property" or "Mobile Home" should show an error and block progression to step 4.  
**Actual:** Selecting "Rental Property" and clicking Next advances to step 4 without any error message.  
**Severity:** Medium — disqualified leads reach the contact/phone capture steps, wasting sales team time.

---

### Defect 5 — "Estimate Your Cost" CTA button is unresponsive on mobile (430 px)
**Expected:** Clicking the "Estimate Your Cost →" button in the page body (below reviews section) should scroll to or activate the multi-step form, allowing mobile users to start filling it.  
**Actual:** On iPhone 14 Pro Max (430 px viewport), clicking the button produces no visible response — the form does not appear and the page does not scroll.  
**Severity:** Critical — this is the primary CTA for mobile users coming from organic/ad traffic. If the button is broken, mobile visitors cannot enter the funnel at all, resulting in complete conversion loss on mobile.

---

### Defect 4 — Mobile layout overlap / clipping at 430 px viewport (form-mobile tests)
**Expected:** At iPhone 14 Pro Max width (430 px), all form elements (inputs, labels, buttons) fit within the viewport without horizontal overflow or clipping.  
**Actual:** At 430 px, form elements overflow or get clipped — `document.documentElement.scrollWidth` exceeds `window.innerWidth` and/or element bounding boxes extend past the right edge of the viewport.  
**Severity:** High — the form is unusable on the most common iPhone size, directly blocking lead capture from mobile users.

---

## Framework Improvement Ideas

1. **Parametrize ZIP boundary tests.** Use `test.each` to cover edge cases like `00000`, `99999`, `1234` (4 digits), `123456` (6 digits), `abc12`, and empty string from a single data-driven table — reducing boilerplate and making it easy to add new cases.

2. **Add API-level response assertions.** Hook into `page.route()` or `page.waitForResponse()` to assert the correct backend endpoint is called with the right payload on form submission, not just the URL redirect. This catches backend contract regressions that a URL check alone would miss.

3. **Cross-browser and viewport matrix.** Run the suite across Firefox and WebKit (Safari) and at both mobile (375 × 812) and desktop (1280 × 720) viewports. The page renders two form containers at different breakpoints; a viewport matrix would catch layout-specific bugs.

4. **Visual regression snapshots.** Use `expect(page).toHaveScreenshot()` on the Thank You page and each step card. This catches unexpected UI changes (wrong copy, missing trust badges, broken layout) without writing brittle text assertions for every element.

5. **Add `data-testid` attributes to the source code.** The current test suite relies on `data-tracking` (a marketing/analytics attribute) and CSS attribute selectors as stable locators. The recommended Playwright approach is dedicated `data-testid` attributes on every interactive element — inputs, buttons, step containers, and the progress counter. This decouples test selectors from analytics instrumentation, allows the marketing team to rename `data-tracking` values without breaking tests, and makes locators self-documenting. Example: `<button data-testid="btn-step-1">Next</button>` → `page.getByTestId('btn-step-1')`.
