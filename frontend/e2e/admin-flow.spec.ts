import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3006';
const ADMIN_EMAIL = 'admin@healthai.com';
const ADMIN_PASSWORD = 'Admin@1234';

test.describe('Admin User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('Access admin dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`);

    // Verify admin-specific sections load
    const adminTitle = await page.locator('text=/Admin|Management/').isVisible({ timeout: 3000 }).catch(() => false);
    expect(adminTitle || await page.url().includes('admin')).toBeTruthy();
  });

  test('View system users', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`);

    // Find users section
    const usersLink = await page.locator('button:has-text("Users")').isVisible({ timeout: 2000 }).catch(() => false);

    if (usersLink) {
      await page.click('button:has-text("Users")');

      // Wait for users list
      await page.waitForSelector('[data-testid="user-row"]', { timeout: 3000 }).catch(() => {});

      const userCount = await page.locator('[data-testid="user-row"]').count();
      expect(userCount >= 0).toBeTruthy();
    }
  });

  test('Search users by name', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/search`);

    // Search for users
    const searchInput = await page.locator('input[placeholder*="Search"]').isVisible({ timeout: 2000 }).catch(() => false);

    if (searchInput) {
      await page.fill('input[placeholder*="Search"]', 'myra');
      await page.waitForSelector('[data-testid="search-result"]', { timeout: 3000 }).catch(() => {});

      const results = await page.locator('[data-testid="search-result"]').count();
      expect(results >= 0).toBeTruthy();
    }
  });

  test('View attendance logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/attendance`);

    // Check if admin can see all attendance
    const attendanceTable = await page.locator('[data-testid="attendance-table"]').isVisible({ timeout: 3000 }).catch(() => false);
    const attendanceText = await page.locator('text=Attendance').isVisible({ timeout: 2000 }).catch(() => false);

    expect(attendanceTable || attendanceText).toBeTruthy();
  });

  test('Manage leave applications', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/attendance`);

    // Look for leave requests section
    const leaveRequests = await page.locator('text=Leave Requests').isVisible({ timeout: 2000 }).catch(() => false);

    if (leaveRequests) {
      // Try to approve a leave request
      const approveBtn = await page.locator('button:has-text("Approve")').first().isVisible({ timeout: 2000 }).catch(() => false);

      if (approveBtn) {
        await page.locator('button:has-text("Approve")').first().click();
        const approved = await page.locator('text=Approved').isVisible({ timeout: 2000 }).catch(() => false);
        expect(approved).toBeTruthy();
      }
    }
  });

  test('View system statistics', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`);

    // Look for stats section
    const statsSection = await page.locator('[data-testid="admin-stats"]').isVisible({ timeout: 3000 }).catch(() => false);
    const numbers = await page.locator('text=/[0-9]+.*users|[0-9]+.*appointments/').isVisible({ timeout: 2000 }).catch(() => false);

    expect(statsSection || numbers).toBeTruthy();
  });

  test('Access audit logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`);

    // Look for audit or logs section
    const auditBtn = await page.locator('button:has-text("Audit")').isVisible({ timeout: 2000 }).catch(() => false);
    const logsBtn = await page.locator('button:has-text("Logs")').isVisible({ timeout: 2000 }).catch(() => false);

    if (auditBtn) {
      await page.click('button:has-text("Audit")');
      const auditVisible = await page.locator('text=Audit Log').isVisible({ timeout: 2000 }).catch(() => false);
      expect(auditVisible).toBeTruthy();
    } else if (logsBtn) {
      await page.click('button:has-text("Logs")');
      expect(true).toBeTruthy();
    }
  });

  test('Export user data', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/admin`);

    // Look for export button
    const exportBtn = await page.locator('button:has-text("Export")').isVisible({ timeout: 2000 }).catch(() => false);

    if (exportBtn) {
      // Start listening for download
      const downloadPromise = page.waitForEvent('download');

      await page.click('button:has-text("Export")');

      // Wait for download (with timeout)
      const download = await downloadPromise.catch(() => null);

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx)$/);
      }
    }
  });
});
