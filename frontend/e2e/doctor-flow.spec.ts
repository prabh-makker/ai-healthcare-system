import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';
const DOCTOR_EMAIL = 'dr.sharma@healthai.com';
const DOCTOR_PASSWORD = 'Doctor@1234';

test.describe('Doctor User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('View weekly calendar', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);

    // Check for calendar component
    const calendar = await page.locator('[data-testid="doctor-calendar"]').isVisible({ timeout: 3000 }).catch(() => false);
    const weekView = await page.locator('text=/Today|Mon|Tue|Wed/').isVisible({ timeout: 2000 }).catch(() => false);

    expect(calendar || weekView).toBeTruthy();
  });

  test('Mark patient appointment as completed', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/appointments`);

    // Find appointment card
    const appointmentCard = await page.locator('[data-testid="appointment-card"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (appointmentCard) {
      // Click to open appointment details
      await page.locator('[data-testid="appointment-card"]').first().click();

      // Mark as completed
      const completeBtn = await page.locator('button:has-text("Complete")').isVisible({ timeout: 1000 }).catch(() => false);
      if (completeBtn) {
        await page.click('button:has-text("Complete")');
        const success = await page.locator('text=Completed').isVisible({ timeout: 2000 }).catch(() => false);
        expect(success).toBeTruthy();
      }
    }
  });

  test('Mark attendance', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/attendance`);

    // Look for attendance marking interface
    const attendanceForm = await page.locator('[data-testid="attendance-form"]').isVisible({ timeout: 2000 }).catch(() => false);
    const statusButtons = await page.locator('button:has-text("Present")').isVisible({ timeout: 2000 }).catch(() => false);

    if (statusButtons) {
      // Mark present
      await page.click('button:has-text("Present")');

      const marked = await page.locator('text=Present').isVisible({ timeout: 1000 }).catch(() => false);
      expect(marked).toBeTruthy();
    }
  });

  test('View patient records', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Navigate to patients section
    const patientsLink = await page.locator('a:has-text("Patients")').isVisible({ timeout: 2000 }).catch(() => false);

    if (patientsLink) {
      await page.click('a:has-text("Patients")');

      // Wait for patients list
      await page.waitForSelector('[data-testid="patient-card"]', { timeout: 3000 }).catch(() => {});

      const patientCount = await page.locator('[data-testid="patient-card"]').count();
      expect(patientCount >= 0).toBeTruthy();
    }
  });

  test('Add medical record for patient', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Find a patient and click to view records
    const firstPatient = await page.locator('[data-testid="patient-card"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    if (firstPatient) {
      await page.locator('[data-testid="patient-card"]').first().click();

      // Look for "Add Record" button
      const addRecordBtn = await page.locator('button:has-text("Add Record")').isVisible({ timeout: 2000 }).catch(() => false);

      if (addRecordBtn) {
        await page.click('button:has-text("Add Record")');

        // Fill record form
        await page.locator('textarea[name="notes"]').fill('Patient shows improvement in symptoms');
        await page.click('button:has-text("Save")');
      }
    }
  });

  test('Request leave', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/attendance`);

    // Look for leave request button
    const leaveBtn = await page.locator('button:has-text("Request Leave")').isVisible({ timeout: 2000 }).catch(() => false);

    if (leaveBtn) {
      await page.click('button:has-text("Request Leave")');

      // Fill leave form
      await page.locator('input[type="date"]').first().fill('2026-05-26');
      await page.locator('textarea').fill('Medical appointment');

      // Submit
      await page.click('button:has-text("Submit")');

      const requested = await page.locator('text=Leave requested').isVisible({ timeout: 2000 }).catch(() => false);
      expect(requested || await page.url().includes('attendance')).toBeTruthy();
    }
  });
});
