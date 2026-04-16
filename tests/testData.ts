// ---------------------------------------------------------------------------
// Centralised test data — avoids hardcoded literals scattered across specs.
// Edit values here to propagate changes to every test that uses them.
// ---------------------------------------------------------------------------

export const ZIP = {
  /** Service-available area (Hastings, NE). */
  serviceAvailable: '68901',
  /** Out-of-area — shows the sorry/unavailability screen. */
  outOfArea: '11111',
} as const;

export const FORM = {
  interests:    ['Safety'] as string[],
  propertyType: 'Owned House / Condo',
  name:         'John Doe',
  email:        'john@example.com',
  phone: {
    /** Valid 10-digit US phone number. */
    valid:    '8005551234',
    /** Below minimum — 6 digits. */
    tooShort: '800555',
    /** Above maximum — 11 digits (triggers Defect 1). */
    tooLong:  '80055512341',
  },
} as const;
