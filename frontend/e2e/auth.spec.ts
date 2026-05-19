import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';

test.describe('Authentication Flow', () => {
  test('Patient login and access dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto(`${BASE_URL}/auth/login`);

    // Fill login form
    await page.fill('input[type="email"]', 'aarav.kumar@example.com');
    await page.fill('input[type="password"]', 'Patient@1234');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Verify patient sees correct dashboard
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('Patient');
  });

  test('Doctor login and access dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    await page.fill('input[type="email"]', 'dr.sharma@healthai.com');
    await page.fill('input[type="password"]', 'Doctor@1234');
    await page.click('button[type="submit"]');

    await page.waitForURL(`${BASE_URL}/dashboard`);

    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('Doctor');
  });

  test('Admin login and access admin dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Admin credentials (from seed or create if needed)
    await page.fill('input[type="email"]', 'admin@healthai.com');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button[type="submit"]');

    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Should see admin options
    const adminNav = await page.locator('a:has-text("Admin")').isVisible();
    expect(adminNav).toBeTruthy();
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Expect error message
    const error = await page.locator('[role="alert"]').isVisible();
    expect(error).toBeTruthy();
  });

  test('Logout clears session', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'aarav.kumar@example.com');
    await page.fill('input[type="password"]', 'Patient@1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Find and click logout
    await page.click('[data-testid="logout-btn"]');

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/auth/login`);
  });
});
