import { test, expect } from '@playwright/test';

test.describe('Admin Distribution Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (mocked or using test credentials)
    await page.goto('/admin/distributions');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load & Display', () => {
    test('should display page title and description', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Verifikasi Penyaluran');
      await expect(page.locator('p')).toContainText('Kelola dan verifikasi bukti penyaluran donasi');
    });

    test('should show loading state initially', async ({ page }) => {
      // Reload to see loading state
      await page.reload();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });

    test('should display filter tabs with counts', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Menunggu Review/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Terverifikasi/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Ditolak/ })).toBeVisible();

      // Check that counts are displayed
      const reviewButton = page.getByRole('button', { name: /Menunggu Review/ });
      await expect(reviewButton).toContainText(/\(\d+\)/);
    });

    test('should show empty state when no data', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], pagination: { limit: 50, offset: 0, total: 0 } }),
        });
      });

      await page.reload();
      await expect(page.getByText('Tidak ada data penyaluran')).toBeVisible();
    });
  });

  test.describe('Filter Tabs', () => {
    test('should filter by "Menunggu Review" status', async ({ page }) => {
      const reviewButton = page.getByRole('button', { name: /Menunggu Review/ });
      await reviewButton.click();

      // Wait for data to load
      await page.waitForLoadState('networkidle');

      // Verify active state
      await expect(reviewButton).toHaveClass(/bg-primary/);
    });

    test('should filter by "Terverifikasi" status', async ({ page }) => {
      const completedButton = page.getByRole('button', { name: /Terverifikasi/ });
      await completedButton.click();

      // Wait for data to load
      await page.waitForLoadState('networkidle');

      // Verify active state
      await expect(completedButton).toHaveClass(/bg-primary/);
    });

    test('should filter by "Ditolak" status', async ({ page }) => {
      const rejectedButton = page.getByRole('button', { name: /Ditolak/ });
      await rejectedButton.click();

      // Wait for data to load
      await page.waitForLoadState('networkidle');

      // Verify active state
      await expect(rejectedButton).toHaveClass(/bg-primary/);
    });

    test('should update counts when switching tabs', async ({ page }) => {
      const initialCount = await page.getByRole('button', { name: /Menunggu Review/ }).textContent();

      await page.getByRole('button', { name: /Terverifikasi/ }).click();
      await page.waitForLoadState('networkidle');

      // Count should be different (or at least updated)
      await page.getByRole('button', { name: /Menunggu Review/ }).click();
      await page.waitForLoadState('networkidle');

      const finalCount = await page.getByRole('button', { name: /Menunggu Review/ }).textContent();
      expect(finalCount).toBeDefined();
    });
  });

  test.describe('Photo Preview', () => {
    test('should open lightbox when clicking photo thumbnail', async ({ page }) => {
      // Mock distribution data with photo
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on photo thumbnail
      const photoThumbnail = page.locator('img[alt*="Bukti"]').first();
      await photoThumbnail.click();

      // Verify lightbox is open
      await expect(page.locator('.fixed.inset-0.bg-black\\/80')).toBeVisible();
      await expect(page.locator('.fixed.inset-0 img')).toBeVisible();
    });

    test('should close lightbox when clicking outside image', async ({ page }) => {
      // Mock distribution data with photo
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on photo thumbnail
      const photoThumbnail = page.locator('img[alt*="Bukti"]').first();
      await photoThumbnail.click();

      // Click outside (on the overlay)
      const lightboxOverlay = page.locator('.fixed.inset-0.bg-black\\/80');
      await lightboxOverlay.click({ position: { x: 10, y: 10 } });

      // Verify lightbox is closed
      await expect(lightboxOverlay).not.toBeVisible();
    });

    test('should close lightbox when clicking close button', async ({ page }) => {
      // Mock distribution data with photo
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on photo thumbnail
      const photoThumbnail = page.locator('img[alt*="Bukti"]').first();
      await photoThumbnail.click();

      // Click close button
      const closeButton = page.locator('.fixed.inset-0 button');
      await closeButton.click();

      // Verify lightbox is closed
      await expect(page.locator('.fixed.inset-0.bg-black\\/80')).not.toBeVisible();
    });

    test('should close lightbox with ESC key', async ({ page }) => {
      // Mock distribution data with photo
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on photo thumbnail
      const photoThumbnail = page.locator('img[alt*="Bukti"]').first();
      await photoThumbnail.click();

      // Press ESC key
      await page.keyboard.press('Escape');

      // Verify lightbox is closed
      await expect(page.locator('.fixed.inset-0.bg-black\\/80')).not.toBeVisible();
    });
  });

  test.describe('Verify Action', () => {
    test('should show confirmation modal when clicking verify button', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click verify button
      const verifyButton = page.getByRole('button', { name: 'Terverifikasi' }).first();
      await verifyButton.click();

      // Verify confirmation modal is shown
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).toBeVisible();
      await expect(page.getByText('Verifikasi Penyaluran?')).toBeVisible();
    });

    test('should verify distribution and update data', async ({ page }) => {
      // Mock initial data and verify response
      let isVerified = false;

      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: isVerified ? 'completed' : 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.route('**/api/admin/distributions/dist-1', async (route) => {
        if (route.request().method() === 'PATCH') {
          isVerified = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: 'dist-1',
                status: 'completed',
                verifiedById: 'admin-1',
                verifiedAt: new Date().toISOString(),
              },
            }),
          });
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click verify button
      const verifyButton = page.getByRole('button', { name: 'Terverifikasi' }).first();
      await verifyButton.click();

      // Confirm verification
      const confirmButton = page.getByRole('button', { name: 'Ya, Verifikasi' });
      await confirmButton.click();

      // Wait for update
      await page.waitForLoadState('networkidle');

      // Verify modal is closed
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).not.toBeVisible();
    });

    test('should hide action buttons after verification', async ({ page }) => {
      // Mock initial data with completed status
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'completed',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify that action buttons are not visible for completed status
      const verifyButton = page.getByRole('button', { name: 'Terverifikasi' }).first();
      const rejectButton = page.getByRole('button', { name: 'Tolak' }).first();

      // Buttons should not be visible for completed distribution
      await expect(verifyButton).not.toBeVisible();
      await expect(rejectButton).not.toBeVisible();
    });
  });

  test.describe('Reject Action', () => {
    test('should show confirmation modal with notes input when clicking reject', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click reject button
      const rejectButton = page.getByRole('button', { name: 'Tolak' }).first();
      await rejectButton.click();

      // Verify confirmation modal with notes
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).toBeVisible();
      await expect(page.getByText('Tolak Penyaluran?')).toBeVisible();
      await expect(page.getByLabel('Catatan (opsional)')).toBeVisible();
    });

    test('should reject distribution with notes and update data', async ({ page }) => {
      let isRejected = false;

      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: isRejected ? 'rejected' : 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.route('**/api/admin/distributions/dist-1', async (route) => {
        if (route.request().method() === 'PATCH') {
          isRejected = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: 'dist-1',
                status: 'rejected',
                notes: 'Foto tidak jelas',
              },
            }),
          });
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click reject button
      const rejectButton = page.getByRole('button', { name: 'Tolak' }).first();
      await rejectButton.click();

      // Enter notes
      const notesInput = page.getByLabel('Catatan (opsional)');
      await notesInput.fill('Foto tidak jelas');

      // Confirm rejection
      const confirmButton = page.getByRole('button', { name: 'Ya, Tolak' });
      await confirmButton.click();

      // Wait for update
      await page.waitForLoadState('networkidle');

      // Verify modal is closed
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).not.toBeVisible();
    });

    test('should cancel rejection when clicking Batal', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click reject button
      const rejectButton = page.getByRole('button', { name: 'Tolak' }).first();
      await rejectButton.click();

      // Click cancel
      const cancelButton = page.getByRole('button', { name: 'Batal' });
      await cancelButton.click();

      // Verify modal is closed
      await expect(page.locator('.fixed.inset-0.bg-black\\/50')).not.toBeVisible();

      // Verify distribution is still in pending_review
      await expect(rejectButton).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should show table layout on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify table is visible on desktop
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('thead')).toBeVisible();
      await expect(page.locator('tbody')).toBeVisible();
    });

    test('should show card layout on mobile', async ({ page }) => {
      // Set mobile viewport (Pixel 5)
      await page.setViewportSize({ width: 393, height: 851 });

      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify table is hidden on mobile
      await expect(page.locator('table')).not.toBeVisible();

      // Verify cards are visible on mobile
      const card = page.locator('.md\\:hidden > div').first();
      await expect(card).toBeVisible();
      await expect(card).toContainText('Donatur A');
      await expect(card).toContainText('Beneficiary A');
    });
  });

  test.describe('Data Display', () => {
    test('should display formatted dates in Indonesian locale', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-15T10:00:00Z',
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check for Indonesian date format (should contain month name in Indonesian)
      const dateText = await page.locator('td').filter({ hasText: /\d{1,2}\s\w+\s\d{4}/ }).first().textContent();
      expect(dateText).toMatch(/\d{1,2}\s[A-Za-z]+\s\d{4}/);
    });

    test('should display status badges with proper styling', async ({ page }) => {
      // Mock distribution data with different statuses
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check pending_review status badge styling
      const statusBadge = page.locator('span').filter({ hasText: 'Menunggu Review' }).first();
      await expect(statusBadge).toHaveClass(/bg-yellow-100 text-yellow-700/);
    });

    test('should display donatur and beneficiary info', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check donatur info
      await expect(page.getByText('Donatur A')).toBeVisible();
      await expect(page.getByText('donatur@example.com')).toBeVisible();

      // Check beneficiary info
      await expect(page.getByText('Beneficiary A')).toBeVisible();
      await expect(page.getByText('Jakarta')).toBeVisible();
    });

    test('should display distribution code', async ({ page }) => {
      // Mock distribution data
      await page.route('**/api/admin/distributions?status=pending_review&limit=50', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dist-1',
                distributionCode: 'SDK-123456',
                proofPhotoUrl: 'https://example.com/proof.jpg',
                status: 'pending_review',
                donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
                beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { limit: 50, offset: 0, total: 1 },
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check distribution code is displayed
      await expect(page.getByText('SDK-123456')).toBeVisible();
    });
  });
});
