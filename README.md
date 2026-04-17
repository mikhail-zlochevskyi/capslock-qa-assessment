# Capslock QA Tech Assignment — Walk-In Bath Form Tests

Playwright E2E tests for the multi-step lead-gen form at [test-qa.capslock.global](https://test-qa.capslock.global).

> **Heads up:** Some tests are intentionally failing — those are real bugs found during testing. Marked with `[DEFECT]` in the test name so they stay visible in CI instead of being hidden with `test.fail()`. They'll keep failing until the app is fixed.

---

## How to run

```bash
npm install
npx playwright install chromium webkit

npm test                 # all tests
npm run test:desktop     # desktop only
npm run test:mobile      # mobile only
npm run test:headed      # with browser visible (good for debugging)
npm run test:ui          # interactive UI mode
npm run test:report      # open last HTML report
```

---

## Config overview

Defined in `playwright.config.ts`. CI is detected via the `CI` env variable (GitHub Actions, CircleCI, GitLab all set it automatically).

| Setting | Local | CI |
|---|---|---|
| Workers | 4 | 2 |
| Retries | 0 | 1 |
| `test.only` | allowed | forbidden |

Timeouts: actions 15s, navigation 30s, assertions 10s.

Artifacts: HTML report, screenshots on failure, traces on first retry.

**Two test projects:**
- `chromium` — Desktop Chrome, 1280×720
- `mobile-chrome` — iPhone 14 Pro Max via WebKit, 430×932

Base URL defaults to `https://test-qa.capslock.global`, overridable with `BASE_URL` env var.

---

## Form structure

5 steps total:

1. ZIP code → Next
2. Why interested? (checkboxes) → Next
3. Property type (radio) → Next
4. Name + email → Go To Estimate
5. Phone → Submit → `/thankyou`

If ZIP is out of area (e.g. 11111) → redirects to `.step-sorry` screen instead.

---

## Test scenarios (22 total)

### Happy path + core flow

| # | What it checks | Browser | Priority | Result |
|---|---|---|---|---|
| 1 | Full form → /thankyou redirect | chromium | Critical | ✅ |
| 2 | Out-of-area ZIP shows sorry screen | chromium | Critical | ✅ |

### Validation

| # | What it checks | Browser | Priority | Result |
|---|---|---|---|---|
| 3 | ZIP too short (4 digits) — stays on step 1 | chromium | High | ✅ |
| 4 | ZIP too long (6 digits) — stays on step 1 | chromium | High | ✅ |
| 5 | Non-numeric ZIP — stays on step 1 | chromium | High | ✅ |
| 6 | Missing name blocks step 4 | chromium | High | ✅ |
| 7 | Missing email blocks step 4 | chromium | High | ✅ |
| 8 | Missing phone blocks step 5 | chromium | High | ✅ |
| 9 | Phone under 10 digits is rejected | chromium | High | ✅ |
| 10 | Phone mask eats leading "1" — user can't submit | chromium | High | ❌ Defect |
| 11 | Invalid email triggers HTML5 validation | chromium | Medium | ✅ |
| 12 | Rental/Mobile Home shows disqualification error | chromium | Medium | ❌ Defect |

### Mobile layout

| # | What it checks | Browser | Priority | Result |
|---|---|---|---|---|
| 13 | "Estimate Your Cost" CTA opens form on mobile | mobile-chrome | Critical | ❌ Defect |
| 14 | Show more/less reviews toggle works | mobile-chrome | Medium | ✅ |
| 15 | Step 1 — ZIP + Next button visible | mobile-chrome | High | ✅ |
| 16 | Step 2 — interest cards don't overflow | mobile-chrome | High | ✅ |
| 17 | Step 3 — property cards don't overflow | mobile-chrome | High | ✅ |
| 18 | Step 4 — name/email inputs don't overflow | mobile-chrome | High | ✅ |
| 19 | Step 5 — phone + submit don't overflow | mobile-chrome | High | ✅ |

### UX / UI

| # | What it checks | Browser | Priority | Result |
|---|---|---|---|---|
| 20 | Video play/pause toggle works | chromium | Medium | ✅ |
| 21 | Progress counter increments through all 5 steps | chromium | Medium | ❌ Defect |
| 22 | Out-of-area ZIP — progress shows valid count (not null) | chromium | Medium | ❌ Defect |

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

## What could be improved

A few things worth noting for a more maintainable suite:

**Selectors** — the suite relies on `data-tracking` attributes which are really there for analytics. If the marketing team renames them, tests break for no QA-related reason. Adding `data-testid` to interactive elements would decouple the two concerns.

**API assertions** — right now tests only check the final URL redirect. Adding `page.waitForResponse()` assertions on form submission would catch backend contract changes that the URL alone won't surface.

**`test.each` for ZIP boundary cases** — the three ZIP validation tests (short, long, non-numeric) are basically the same test with different inputs. `test.each` would clean that up and make it easier to add edge cases later.

**Firefox coverage** — desktop tests only run on Chromium. Worth adding Firefox to catch rendering differences.

**Visual regression** — `toHaveScreenshot()` on the thank-you page and each step would catch unexpected copy or layout changes without having to write text assertions for every element.
