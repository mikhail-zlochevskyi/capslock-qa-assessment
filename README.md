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

## Why these 5 tests matter most

Core regression suite: happy path, out-of-area ZIP, ZIP format (3 cases), required fields (3 cases), phone digit count.

**Happy path** is obvious — if leads aren't getting through, nothing else matters.

**Out-of-area ZIP** is worth its own test because it's a completely separate flow with its own screen, not just a validation error. Easy to break silently.

**ZIP format** is the first gate in the funnel. Garbage in here corrupts everything downstream. Covers both boundaries — too short, too long — plus non-numeric.

**Required fields** protect the contact data that's the whole point of this form. If name/email/phone can be skipped, the sales team gets uncallable leads. Each field gets its own test so failures are easy to pinpoint.

**Phone digit count** matters because the callback system needs a valid US number. Under 10 digits means no call — should be caught at the form level.

---

## Bugs found

### Bug 1 — Progress counter skips step 3

Counter goes: 1 → 2 → 2 → 4 → 5. Step 3 just doesn't register. Low severity UX-wise, but it looks broken and users notice.

---

### Bug 2 — Rental/Mobile Home doesn't trigger disqualification

The form has `data-error-text="Unfortunately, we don't install walk-in tubs in rental and mobile homes"` right there in the DOM — but selecting "Rental Property" and clicking Next just advances to step 4. No error shown. Disqualified leads end up in the pipeline, wasting the sales team's time.

---

### Bug 3 — Phone mask silently drops the leading "1"

Type `1111111111` (10 digits) — the mask treats the first `1` as a country code and throws it away. Nine digits end up in the field, form blocks submission, but gives no explanation. Users with area codes starting with 1 will just be confused why they can't submit. High severity because it's silent and common.

---

### Bug 4 — Mobile layout overflows at 430px

On iPhone 14 Pro Max, form elements clip past the right edge of the screen. `scrollWidth > innerWidth`. The form basically doesn't work on that device. High severity — it's one of the most common phone sizes.

---

### Bug 5 — "Estimate Your Cost" CTA does nothing on mobile

The main call-to-action button below the reviews section is completely unresponsive on 430px viewport. Click it, nothing happens. This is the primary entry point for mobile users from ads/organic — if it's broken, mobile conversion is zero. Critical.

---

### Bug 6 — Out-of-area ZIP shows "1 of null"

After entering an out-of-area ZIP, the progress bar renders as "1 of" with nothing after it. The total step count comes back as null. Not a data loss issue but it looks broken and erodes trust on an already-bad experience (being told you're out of area).

---

## Framework Improvement Ideas

1. **Shift left — move validation coverage to lower test layers.** The current suite is entirely E2E (browser-driven UI tests), which sit at the top of the testing pyramid. Ideally, the bulk of validation logic (ZIP format, required fields, phone digit count, property-type disqualification) should be covered by unit tests against the form's JavaScript functions and API/integration tests against the backend endpoints. E2E tests would then focus only on critical user journeys (happy path, out-of-area flow) and visual/layout concerns that lower layers cannot catch. This reduces execution time, flakiness, and maintenance cost while catching regressions earlier in the development cycle.

2. **Add `data-testid` attributes to the source code.** The current test suite relies on `data-tracking` (a marketing/analytics attribute) and CSS attribute selectors as stable locators. The recommended Playwright approach is dedicated `data-testid` attributes on every interactive element — inputs, buttons, step containers, and the progress counter. This decouples test selectors from analytics instrumentation, allows the marketing team to rename `data-tracking` values without breaking tests, and makes locators self-documenting. Example: `<button data-testid="btn-step-1">Next</button>` → `page.getByTestId('btn-step-1')`.

3. **Add API-level response assertions.** Hook into `page.route()` or `page.waitForResponse()` to assert the correct backend endpoint is called with the right payload on form submission, not just the URL redirect. This catches backend contract regressions that a URL check alone would miss.

4. **Cross-browser tests.** Run the suite across Firefox and WebKit (Safari). The page renders two form containers at different breakpoints;

5. **Visual regression snapshots.** Use `expect(page).toHaveScreenshot()` on the Thank You page and each step card. This catches unexpected UI changes (wrong copy, missing trust badges, broken layout) without writing brittle text assertions for every element.

6. **Parametrize ZIP boundary tests.** Use `test.each` to cover edge cases like `00000`, `99999`, `1234` (4 digits), `123456` (6 digits), `abc12`, and empty string from a single data-driven table — reducing boilerplate and making it easy to add new cases.
