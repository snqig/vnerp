import { test, expect, request } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

test('diagnostic: capture api-docs page state and console errors', async ({ page }) => {
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  // Login first
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input#username', { timeout: 30000 });
  await page.fill('input#username', 'admin');
  await page.fill('input#password', 'admin123');
  await page.locator('input#password').press('Enter');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60000 });

  // Navigate to api-docs
  await page.goto(`${BASE_URL}/api-docs`, { waitUntil: 'domcontentloaded' });

  // Wait for potential dynamic import + fetch
  await page.waitForTimeout(10000);

  const url = page.url();
  const bodyText = await page.locator('body').innerText();
  const bodyHtml = await page.locator('body').innerHTML();

  console.log('=== DIAGNOSTIC OUTPUT ===');
  console.log('Current URL:', url);
  console.log('Body text (first 500 chars):', bodyText.slice(0, 500));
  console.log('Has .swagger-ui:', await page.locator('.swagger-ui').count());
  console.log('Has "Loading":', bodyText.includes('Loading'));
  console.log('Has "API Documentation":', bodyText.includes('API Documentation'));
  console.log('Has "Loading API Docs":', bodyText.includes('Loading API Docs'));
  console.log('Body HTML length:', bodyHtml.length);

  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach((m) => console.log(m));

  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) console.log('(none)');
  consoleErrors.forEach((e) => console.log(e));

  console.log('\n=== PAGE ERRORS ===');
  if (pageErrors.length === 0) console.log('(none)');
  pageErrors.forEach((e) => console.log(e));

  console.log('=== END DIAGNOSTIC ===');
});
