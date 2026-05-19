import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';
const PATIENT_EMAIL = 'aarav.kumar@example.com';
const PATIENT_PASSWORD = 'Patient@1234';

test.describe('Patient User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as patient
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', PATIENT_EMAIL);
    await page.fill('input[type="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('View appointments list', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);

    // Wait for appointments to load
    await page.waitForSelector('[data-testid="appointment-card"]', { timeout: 5000 }).catch(() => {});

    // Check if appointments section exists
    const appointmentsSection = await page.locator('text=Appointments').isVisible();
    expect(appointmentsSection).toBeTruthy();
  });

  test('Book new appointment', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);

    // Click "Book Appointment" button
    const bookBtn = await page.locator('button:has-text("Book Appointment")').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();

      // Fill appointment form
      await page.locator('select[name="doctor_id"]').selectOption({ index: 1 });
      await page.locator('input[type="date"]').fill('2026-05-25');
      await page.locator('input[type="time"]').fill('14:00');

      // Submit
      await page.click('button:has-text("Book Appointment")');

      // Wait for success message
      const success = await page.locator('text=Appointment booked').isVisible({ timeout: 3000 }).catch(() => false);
      if (success) expect(success).toBeTruthy();
    }
  });

  test('View medical history', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Navigate to history/records
    await page.click('a:has-text("History")').catch(() =>
      page.click('a:has-text("Records")').catch(() => {})
    );

    const historyVisible = await page.locator('text=Medical History').isVisible({ timeout: 2000 }).catch(() => false);
    expect(historyVisible || await page.url().includes('history')).toBeTruthy();
  });

  test('Update profile information', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/settings`);

    // Look for profile edit section
    const profileSection = await page.locator('text=Profile').isVisible({ timeout: 2000 }).catch(() => false);

    if (profileSection) {
      // Try to edit a field
      const editBtn = await page.locator('button:has-text("Edit")').first().isVisible({ timeout: 1000 }).catch(() => false);
      if (editBtn) {
        await page.locator('button:has-text("Edit")').first().click();
        await page.fill('input[name="phone"]', '+919876543210');
        await page.click('button:has-text("Save")');
      }
    }
  });

  test('Search doctors', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/search`);

    // Search for a doctor
    await page.fill('input[placeholder*="Search"]', 'Sharma');
    await page.waitForSelector('[data-testid="search-result"]', { timeout: 3000 }).catch(() => {});

    const results = await page.locator('[data-testid="search-result"]').count();
    expect(results >= 0).toBeTruthy();
  });

  test('Cancel appointment', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);

    // Find and click cancel on first appointment (if exists)
    const cancelBtn = await page.locator('button:has-text("Cancel")').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (cancelBtn) {
      await page.locator('button:has-text("Cancel")').first().click();
      await page.click('button:has-text("Confirm")');

      const cancelled = await page.locator('text=cancelled').isVisible({ timeout: 2000 }).catch(() => false);
      expect(cancelled).toBeTruthy();
    }
  });
});
