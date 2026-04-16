import { test as base, expect } from '@playwright/test';
import { FormPage, type FullFormData } from './pages/FormPage';

type TestData = {
  zip: {
    serviceAvailable: string;
    outOfArea: string;
  };
  form: {
    interests: string[];
    propertyType: string;
    name: string;
    email: string;
    phone: {
      valid: string;
      leadingOne: string;
      tooShort: string;
    };
  };
  /** Pre-assembled happy-path payload for completeFullForm(). */
  happyPath: FullFormData;
};

type Fixtures = {
  /** FormPage instance, already navigated to the home page. */
  form: FormPage;
  /** Shared test data — single source of truth for all specs. */
  testData: TestData;
};

export const test = base.extend<Fixtures>({
  form: async ({ page }, use) => {
    const form = new FormPage(page);
    await form.goto();
    await use(form);
  },

  testData: async ({}, use) => {
    const zip = {
      serviceAvailable: '68901',
      outOfArea:        '11111',
    };

    const form = {
      interests:    ['Safety'],
      propertyType: 'Owned House / Condo',
      name:         'John Doe',
      email:        'john@example.com',
      phone: {
        valid:      '8005551234',
        leadingOne: '1111111111',
        tooShort:   '800555',
      },
    };

    await use({
      zip,
      form,
      happyPath: {
        zip:          zip.serviceAvailable,
        interests:    form.interests,
        propertyType: form.propertyType,
        name:         form.name,
        email:        form.email,
        phone:        form.phone.valid,
      },
    });
  },
});