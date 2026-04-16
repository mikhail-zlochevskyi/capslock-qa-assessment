# Capslock QA Tech Assignment — Walk-In Bath Form Tests

Playwright-based end-to-end tests for the multi-step lead-gen form at [test-qa.capslock.global](https://test-qa.capslock.global).

---

## Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Run all tests (desktop + mobile, headless)
npm test

# 4. Run desktop suite only (chromium project)
npm run test:desktop

# 5. Run mobile suite only (iPhone 14 Pro Max project)
npm run test:mobile

# 6. Run with browser visible (for debugging)
npm run test:headed

# 7. Interactive UI mode
npm run test:ui

# 8. View the HTML report after a test run
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
| 3 | "Estimate Your Cost" CTA button scrolls to / opens form on mobile | 🔴 Critical | ❌ **Defect** |
| 4 | ZIP too short (4 digits) stays on step 1 | 🟠 High | ✅ Pass |
| 5 | ZIP too long (6 digits) stays on step 1 | 🟠 High | ✅ Pass |
| 6 | Non-numeric ZIP stays on step 1 | 🟠 High | ✅ Pass |
| 7 | Missing Name blocks step 4 progression | 🟠 High | ✅ Pass |
| 8 | Missing Email blocks step 4 progression | 🟠 High | ✅ Pass |
| 9 | Missing Phone blocks step 5 submission | 🟠 High | ✅ Pass |
| 10 | Phone < 10 digits is rejected | 🟠 High | ✅ Pass |
| 11 | Phone input accepts number starting with 1 (country code) | 🟠 High | ❌ **Defect** |
| 12 | Mobile layout — form elements fit within 430 px viewport | 🟠 High | ❌ **Defect** |
| 13 | Invalid email format triggers HTML5 validation | 🟡 Medium | ✅ Pass |
| 14 | Video play button toggles `<i>` class lavin-play ↔ lavin-pause | 🟡 Medium | ✅ Pass |
| 15 | "Show more" expands reviews; "Show less" collapses them (mobile) | 🟡 Medium | ✅ Pass |
| 16 | Progress counter advances through all 5 steps | 🟡 Medium | ❌ **Defect** |
| 17 | Rental/Mobile Home shows disqualification error | 🟡 Medium | ❌ **Defect** |
| 18 | Out-of-area ZIP: progress indicator shows valid step count (not null) | 🟡 Medium | ❌ **Defect** |

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
The callback system needs a valid US phone number. A phone with fewer than 10 digits is structurally invalid. This test confirms the form enforces the minimum length.

---

## Discovered Defects

### Defect 1 — Progress counter skips step 3 (Test 7)
**Expected:** The "X of 5" counter increments at every step: 1 → 2 → 3 → 4 → 5.  
**Actual:** The counter goes 2 → 2 (stays on 2 during step 3) → 4. Step 3 is never reflected in the counter.  
**Severity:** Low/UX — users see confusing progress feedback; the jump from 2 to 4 makes the form look broken.

---

### Defect 2 — Rental/Mobile Home property type is not rejected (Test 8)
**Expected:** Per `data-error-text` on the form element ("Unfortunately, we don't install walk-in tubs in rental and mobile homes"), selecting "Rental Property" or "Mobile Home" should show an error and block progression to step 4.  
**Actual:** Selecting "Rental Property" and clicking Next advances to step 4 without any error message.  
**Severity:** Medium — disqualified leads reach the contact/phone capture steps, wasting sales team time.

---

### Defect 3 — Phone input accepts numbers starting with 1 (country code)
**Expected:** A US phone number beginning with `1` (e.g. `1111111111`) should be rejected — the leading `1` is the country code, not a valid area code, making the number unroutable by the callback system.  
**Actual:** The phone mask formats the input as `(111) 111-1111` and allows form submission, sending an invalid number to the sales team.  
**Severity:** High — leads submitted with a leading-1 phone are uncallable; the callback attempt fails silently.

---

### Defect 4 — Mobile layout overlap / clipping at 430 px viewport (Scenario 12)
**Expected:** At iPhone 14 Pro Max width (430 px), all form elements (inputs, labels, buttons) fit within the viewport without horizontal overflow or clipping.  
**Actual:** At 430 px, form elements overflow or get clipped — `document.documentElement.scrollWidth` exceeds `window.innerWidth` and/or element bounding boxes extend past the right edge of the viewport.  
**Severity:** High — the form is unusable on the most common iPhone size, directly blocking lead capture from mobile users.

---

### Defect 5 — "Estimate Your Cost" CTA button is unresponsive on mobile (430 px) (Scenario 3)
**Expected:** Clicking the "Estimate Your Cost →" button in the page body (below reviews section) should scroll to or activate the multi-step form, allowing mobile users to start filling it.  
**Actual:** On iPhone 14 Pro Max (430 px viewport), clicking the button produces no visible response — the form does not appear and the page does not scroll.  
**Severity:** Critical — this is the primary CTA for mobile users coming from organic/ad traffic. If the button is broken, mobile visitors cannot enter the funnel at all, resulting in complete conversion loss on mobile.

---

### Defect 6 — Out-of-area ZIP shows broken progress indicator ("1 of null") (Scenario 18)
**Expected:** When an out-of-area ZIP (e.g. 11111) is submitted, the progress indicator should either be hidden or display a meaningful value (e.g. "1 of 1" or no counter at all) on the sorry/unavailability screen.  
**Actual:** The progress bar renders with "1 of" followed by nothing (the total step count is `null`/undefined), producing malformed text and a broken progress bar UI.  
**Severity:** Medium/UX — the sorry screen is a dead-end for out-of-area users; the broken counter adds visual noise and may undermine trust, but no lead data is lost.

---

## Framework Improvement Ideas

1. **Parametrize ZIP boundary tests.** Use `test.each` to cover edge cases like `00000`, `99999`, `1234` (4 digits), `123456` (6 digits), `abc12`, and empty string from a single data-driven table — reducing boilerplate and making it easy to add new cases.

2. **Add API-level response assertions.** Hook into `page.route()` or `page.waitForResponse()` to assert the correct backend endpoint is called with the right payload on form submission, not just the URL redirect. This catches backend contract regressions that a URL check alone would miss.

3. **Cross-browser tests.** Run the suite across Firefox and WebKit (Safari). The page renders two form containers at different breakpoints;

4. **Visual regression snapshots.** Use `expect(page).toHaveScreenshot()` on the Thank You page and each step card. This catches unexpected UI changes (wrong copy, missing trust badges, broken layout) without writing brittle text assertions for every element.

5. **Add `data-testid` attributes to the source code.** The current test suite relies on `data-tracking` (a marketing/analytics attribute) and CSS attribute selectors as stable locators. The recommended Playwright approach is dedicated `data-testid` attributes on every interactive element — inputs, buttons, step containers, and the progress counter. This decouples test selectors from analytics instrumentation, allows the marketing team to rename `data-tracking` values without breaking tests, and makes locators self-documenting. Example: `<button data-testid="btn-step-1">Next</button>` → `page.getByTestId('btn-step-1')`.
