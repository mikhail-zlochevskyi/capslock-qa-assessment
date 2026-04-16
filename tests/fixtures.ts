import { test as base, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

type Fixtures = {
  /** FormPage instance, already navigated to the home page. */
  form: FormPage;
};

export const test = base.extend<Fixtures>({
  form: async ({ page }, use) => {
    const form = new FormPage(page);
    await form.goto();
    await use(form);
  },
});

export { expect };
