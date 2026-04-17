# Capslock QA Tech Assignment — Walk-In Bath Form Tests

Playwright-based end-to-end tests for the multi-step lead-gen form at [test-qa.capslock.global](https://test-qa.capslock.global).

> **Note:** Some tests are expected to fail — they document real defects found in the application (marked with `[DEFECT]` in test names). The test suite will report failures in CI as long as these bugs remain unfixed. If needed, failures can be suppressed by adding Playwright's `test.fail()` annotation to each defect test, but this was intentionally omitted so that failures remain visible.

---

## Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium webkit

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

## Framework Configuration

All settings are defined in `playwright.config.ts`.

| Setting | Local | CI (`CI` env var set) |
|---------|-------|-----------------------|
| **Workers** | 4 (parallel) | 2 |
| **Retries** | 0 | 1 |
| **`test.only` allowed** | Yes | No (`forbidOnly: true`) |

**Timeouts:**

| Timeout | Value |
|---------|-------|
| Action (click, fill, etc.) | 15 s |
| Navigation (`goto`, redirects) | 30 s |
| `expect()` assertions | 10 s |

**Artifacts & reporting:**

- **Reporter:** HTML report (auto-generated, does not open automatically) + list output in terminal.
- **Traces:** Captured on first retry only (`on-first-retry`) — available in the HTML report for failed-then-retried tests.
- **Screenshots:** Captured only on failure (`only-on-failure`).

**Projects (browser profiles):**

| Project | Device preset | Browser engine | Viewport |
|---------|---------------|----------------|----------|
| `chromium` | Desktop Chrome | Chromium | 1280 × 720 |
| `mobile-chrome` | iPhone 14 Pro Max | WebKit | 430 × 932 |

The `chromium` project runs on the Chromium engine. The `mobile-chrome` project uses Playwright's iPhone 14 Pro Max device descriptor, which runs on WebKit (Safari's engine) with mobile viewport, user agent, and touch emulation. Both browsers must be installed: `npx playwright install chromium webkit`.

**Base URL:** `https://test-qa.capslock.global` (overridable via `BASE_URL` env var).

**CI detection:** Playwright checks for the `CI` environment variable. Most CI providers (GitHub Actions, GitLab CI, CircleCI, etc.) set it automatically, which activates stricter settings (fewer workers, retries enabled, `test.only` forbidden).

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

## Full List of Scenarios (22 tests)

### Core form flow

| # | Scenario | Project | Priority | Status |
|---|----------|---------|----------|--------|
| 1 | Happy path — valid data → /thankyou redirect | chromium | 🔴 Critical | ✅ Pass |
| 2 | Out-of-area ZIP (11111) shows sorry message | chromium | 🔴 Critical | ✅ Pass |

### Input validation

| # | Scenario | Project | Priority | Status |
|---|----------|---------|----------|--------|
| 3 | ZIP too short (4 digits) stays on step 1 | chromium | 🟠 High | ✅ Pass |
| 4 | ZIP too long (6 digits) stays on step 1 | chromium | 🟠 High | ✅ Pass |
| 5 | Non-numeric ZIP stays on step 1 | chromium | 🟠 High | ✅ Pass |
| 6 | Missing Name blocks step 4 progression | chromium | 🟠 High | ✅ Pass |
| 7 | Missing Email blocks step 4 progression | chromium | 🟠 High | ✅ Pass |
| 8 | Missing Phone blocks step 5 submission | chromium | 🟠 High | ✅ Pass |
| 9 | Phone < 10 digits is rejected | chromium | 🟠 High | ✅ Pass |
| 10 | Phone mask silently drops leading "1" digit — typed entry becomes one digit short | chromium | 🟠 High | ❌ **Defect** |
| 11 | Invalid email format triggers HTML5 validation | chromium | 🟡 Medium | ✅ Pass |
| 12 | Rental/Mobile Home shows disqualification error | chromium | 🟡 Medium | ❌ **Defect** |

### Mobile layout scenarios

| # | Scenario | Project | Priority | Status |
|---|----------|---------|----------|--------|
| 13 | "Estimate Your Cost" CTA button scrolls to / opens form on mobile | mobile-chrome | 🔴 Critical | ❌ **Defect** |
| 14 | "Show more" expands reviews; "Show less" collapses them | mobile-chrome | 🟡 Medium | ✅ Pass |
| 15 | Step 1: ZIP input and Next button are fully visible | mobile-chrome | 🟠 High | ✅ Pass |
| 16 | Step 2: interest option cards do not overflow viewport | mobile-chrome | 🟠 High | ✅ Pass |
| 17 | Step 3: property type cards do not overflow viewport | mobile-chrome | 🟠 High | ✅ Pass |
| 18 | Step 4: Name and Email inputs do not overflow viewport | mobile-chrome | 🟠 High | ✅ Pass |
| 19 | Step 5: Phone input and Submit button do not overflow viewport | mobile-chrome | 🟠 High | ✅ Pass |

### UX / UI components

| # | Scenario | Project | Priority | Status |
|---|----------|---------|----------|--------|
| 20 | Video play button toggles `<i>` class lavin-play ↔ lavin-pause | chromium | 🟡 Medium | ✅ Pass |
| 21 | Progress counter advances through all 5 steps | chromium | 🟡 Medium | ❌ **Defect** |
| 22 | Out-of-area ZIP: progress indicator shows valid step count (not null) | chromium | 🟡 Medium | ❌ **Defect** |

---

## Top 5 Automated Tests — Selection & Rationale

**Selected tests: 1, 2, 3 (a/b/c), 4 (a/b/c), 5**

### Test 1 — Happy Path (full form → /thankyou redirect)
The golden path for the entire funnel. If this fails, no lead is being captured. It also exercises every step and verifies the final redirect, making it the highest-value single regression check.

### Test 2 — Out-of-area ZIP (11111) shows unavailability
The form has two completely different flows based on ZIP code. The out-of-area path has its own UI and a separate email-capture step. Without this test, a regression could silently route out-of-area users through the normal funnel.

### Test 3 (a/b/c) — ZIP code format validation
ZIP is the very first gate in the funnel. If the format is not enforced (exactly 5 digits, numeric only), invalid data enters the system and corrupts service-area lookups. Three sub-cases cover both sides of the boundary:

- **3a** — too short (4 digits)
- **3b** — too long (6 digits)
- **3c** — non-numeric input

### Test 4 (a/b/c) — Required fields block progression
Steps 4 and 5 collect the actual contact data — the whole reason the form exists. If name, email, or phone can be skipped, the company receives uncallable / unemailable leads. Three sub-cases verify each field individually:

- **4a** — missing Name blocks step 4
- **4b** — missing Email blocks step 4
- **4c** — missing Phone blocks step 5

### Test 5 — Phone number digit count (< 10 digits rejected)
The callback system needs a valid US phone number. A phone with fewer than 10 digits is structurally invalid. This test confirms the form enforces the minimum length.

---

## Discovered Defects

### Defect 1 — Progress counter skips step 3 (Scenario 21)
**Expected:** The "X of 5" counter increments at every step: 1 → 2 → 3 → 4 → 5.  
**Actual:** The counter goes 2 → 2 (stays on 2 during step 3) → 4. Step 3 is never reflected in the counter.  
**Severity:** Low/UX — users see confusing progress feedback; the jump from 2 to 4 makes the form look broken.

---

### Defect 2 — Rental/Mobile Home property type is not rejected (Scenario 12)
**Expected:** Per `data-error-text` on the form element ("Unfortunately, we don't install walk-in tubs in rental and mobile homes"), selecting "Rental Property" or "Mobile Home" should show an error and block progression to step 4.  
**Actual:** Selecting "Rental Property" and clicking Next advances to step 4 without any error message.  
**Severity:** Medium — disqualified leads reach the contact/phone capture steps, wasting sales team time.

---

### Defect 3 — Phone mask silently drops the leading "1" digit
**Expected:** Typing `1111111111` (10 digits) into the phone field should preserve all 10 digits, resulting in a fully masked value such as `(111) 111-1111`.  
**Actual:** The phone mask treats the leading `1` as a country-code prefix and silently discards it. Only 9 of the 10 typed digits appear in the field, leaving the number one digit short of the 10-digit minimum. The form then blocks submission (correctly), but the user is given no explanation — they have to figure out that the mask ate their first character.  
**Severity:** High — any user whose real number starts with `1` (common US toll-free / some area codes) cannot enter their number without discovering this quirk manually.

---

### Defect 4 — Mobile layout overlap / clipping at 430 px viewport (Scenarios 15–19)
**Expected:** At iPhone 14 Pro Max width (430 px), all form elements (inputs, labels, buttons) fit within the viewport without horizontal overflow or clipping.  
**Actual:** At 430 px, form elements overflow or get clipped — `document.documentElement.scrollWidth` exceeds `window.innerWidth` and/or element bounding boxes extend past the right edge of the viewport.  
**Severity:** High — the form is unusable on the most common iPhone size, directly blocking lead capture from mobile users.

---

### Defect 5 — "Estimate Your Cost" CTA button is unresponsive on mobile (430 px) (Scenario 13)
**Expected:** Clicking the "Estimate Your Cost →" button in the page body (below reviews section) should scroll to or activate the multi-step form, allowing mobile users to start filling it.  
**Actual:** On iPhone 14 Pro Max (430 px viewport), clicking the button produces no visible response — the form does not appear and the page does not scroll.  
**Severity:** Critical — this is the primary CTA for mobile users coming from organic/ad traffic. If the button is broken, mobile visitors cannot enter the funnel at all, resulting in complete conversion loss on mobile.

---

### Defect 6 — Out-of-area ZIP shows broken progress indicator ("1 of null") (Scenario 22)
**Expected:** When an out-of-area ZIP (e.g. 11111) is submitted, the progress indicator should either be hidden or display a meaningful value (e.g. "1 of 1" or no counter at all) on the sorry/unavailability screen.  
**Actual:** The progress bar renders with "1 of" followed by nothing (the total step count is `null`/undefined), producing malformed text and a broken progress bar UI.  
**Severity:** Medium/UX — the sorry screen is a dead-end for out-of-area users; the broken counter adds visual noise and may undermine trust, but no lead data is lost.

---

## Framework Improvement Ideas

1. **Shift left — move validation coverage to lower test layers.** The current suite is entirely E2E (browser-driven UI tests), which sit at the top of the testing pyramid. Ideally, the bulk of validation logic (ZIP format, required fields, phone digit count, property-type disqualification) should be covered by unit tests against the form's JavaScript functions and API/integration tests against the backend endpoints. E2E tests would then focus only on critical user journeys (happy path, out-of-area flow) and visual/layout concerns that lower layers cannot catch. This reduces execution time, flakiness, and maintenance cost while catching regressions earlier in the development cycle.

2. **Add `data-testid` attributes to the source code.** The current test suite relies on `data-tracking` (a marketing/analytics attribute) and CSS attribute selectors as stable locators. The recommended Playwright approach is dedicated `data-testid` attributes on every interactive element — inputs, buttons, step containers, and the progress counter. This decouples test selectors from analytics instrumentation, allows the marketing team to rename `data-tracking` values without breaking tests, and makes locators self-documenting. Example: `<button data-testid="btn-step-1">Next</button>` → `page.getByTestId('btn-step-1')`.

3. **Add API-level response assertions.** Hook into `page.route()` or `page.waitForResponse()` to assert the correct backend endpoint is called with the right payload on form submission, not just the URL redirect. This catches backend contract regressions that a URL check alone would miss.

4. **Cross-browser tests.** Run the suite across Firefox and WebKit (Safari). The page renders two form containers at different breakpoints;

5. **Visual regression snapshots.** Use `expect(page).toHaveScreenshot()` on the Thank You page and each step card. This catches unexpected UI changes (wrong copy, missing trust badges, broken layout) without writing brittle text assertions for every element.

6. **Parametrize ZIP boundary tests.** Use `test.each` to cover edge cases like `00000`, `99999`, `1234` (4 digits), `123456` (6 digits), `abc12`, and empty string from a single data-driven table — reducing boilerplate and making it easy to add new cases.
