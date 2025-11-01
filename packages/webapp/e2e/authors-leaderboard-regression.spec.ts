import { test, expect } from '@playwright/test';

/**
 * Authors Page - Leaderboard Design Regression Tests (Optimized)
 *
 * These tests protect against visual and functional regressions on the authors page.
 * They verify the leaderboard table layout, ranking system, and overall design integrity.
 *
 * Optimizations:
 * - Consolidated similar tests to reduce total count
 * - Moved page.goto() to beforeEach to avoid redundant navigation
 * - Combined CSS class checks into fewer tests
 */

// Shared mock data
const MOCK_AUTHORS = {
  authors: [
    {
      author: 'topauthor1',
      package_count: 150,
      total_downloads: 10000,
      verified: true,
      latest_package: 'amazing-package-v1'
    },
    {
      author: 'topauthor2',
      package_count: 100,
      total_downloads: 8000,
      verified: true,
      latest_package: 'cool-package-v2'
    },
    {
      author: 'topauthor3',
      package_count: 75,
      total_downloads: 5000,
      verified: false,
      latest_package: 'great-package-v3'
    },
    {
      author: 'author4',
      package_count: 50,
      total_downloads: 3000,
      verified: true,
      latest_package: 'package-four'
    },
    {
      author: 'author5',
      package_count: 25,
      total_downloads: 1000,
      verified: false,
      latest_package: 'package-five'
    }
  ],
  total: 5
};

test.describe('Authors Page - Leaderboard Design Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API response with consistent test data
    await page.route('**/api/v1/search/authors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_AUTHORS)
      });
    });

    // Navigate once per test
    await page.goto('/authors');

    // Wait for data to load once
    await page.waitForSelector('text=@topauthor1');
  });

  test.describe('Page Header and Title', () => {
    test('should display header with correct styling and links', async ({ page }) => {
      // Check for the main heading
      const heading = page.getByRole('heading', { name: 'Top Authors', exact: true });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/bg-gradient-to-r/);

      // Check subtitle
      await expect(page.getByText('The amazing contributors making PRPM possible')).toBeVisible();

      // Check back link
      const backLink = page.getByRole('link', { name: '← Back to home' });
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', '/');
    });
  });

  test.describe('Stats Summary Section', () => {
    test('should display all stats with correct counts and icons', async ({ page }) => {
      // Check all stats
      await expect(page.getByText('5+ Authors')).toBeVisible();
      await expect(page.getByText('400 Packages')).toBeVisible();
      await expect(page.getByText('27,000 Downloads')).toBeVisible();

      // Check emoji icons
      await expect(page.getByText('👥')).toBeVisible();
      await expect(page.getByText('📦')).toBeVisible();
      await expect(page.getByText('⬇️')).toBeVisible();
    });
  });

  test.describe('CTA Banner', () => {
    test('should display CTA banner with GitHub sign-in', async ({ page }) => {
      await expect(page.getByText('Want to Join the Leaderboard?')).toBeVisible();
      await expect(page.getByText('Contribute packages to PRPM')).toBeVisible();

      const githubButton = page.getByRole('link', { name: /Sign in with GitHub/i });
      await expect(githubButton).toBeVisible();
      await expect(githubButton).toHaveAttribute('href', '/login');

      // Check for SVG icon
      await expect(githubButton.locator('svg')).toBeVisible();

      // Check gradient styling
      const banner = page.locator('div.bg-gradient-to-r').filter({ hasText: 'Want to Join the Leaderboard?' });
      await expect(banner).toBeVisible();
      await expect(banner).toHaveClass(/from-prpm-green/);
    });
  });

  test.describe('Leaderboard Table Structure', () => {
    test('should have correct table structure and styling', async ({ page }) => {
      // Check header row with gradient background
      const headerRow = page.locator('div.bg-gradient-to-r').filter({ hasText: 'Author' }).filter({ hasText: 'Packages' }).first();
      await expect(headerRow).toBeVisible();

      // Check all 5 column headers in correct order
      const headers = page.locator('.grid.grid-cols-12 > div');
      await expect(headers.nth(0)).toContainText('#');
      await expect(headers.nth(1)).toContainText('Author');
      await expect(headers.nth(2)).toContainText('Packages');
      await expect(headers.nth(3)).toContainText('Downloads');
      await expect(headers.nth(4)).toContainText('Status');

      // Check container styling
      const leaderboardContainer = page.locator('div.bg-white.rounded-lg.shadow-lg');
      await expect(leaderboardContainer).toBeVisible();
    });
  });

  test.describe('Medal Rankings (Top 3)', () => {
    test('should display correct medals and styling for top 3', async ({ page }) => {
      // Check medals
      const firstRow = page.locator('a').filter({ hasText: '@topauthor1' });
      await expect(firstRow.locator('text=🥇')).toBeVisible();

      const secondRow = page.locator('a').filter({ hasText: '@topauthor2' });
      await expect(secondRow.locator('text=🥈')).toBeVisible();

      const thirdRow = page.locator('a').filter({ hasText: '@topauthor3' });
      await expect(thirdRow.locator('text=🥉')).toBeVisible();

      // Check yellow background highlight for top 3
      await expect(firstRow.first()).toHaveClass(/bg-yellow-50/);
      await expect(secondRow.first()).toHaveClass(/bg-yellow-50/);
      await expect(thirdRow.first()).toHaveClass(/bg-yellow-50/);
    });

    test('should display numeric rank for positions 4+', async ({ page }) => {
      const fourthRow = page.locator('a').filter({ hasText: '@author4' });
      await expect(fourthRow.locator('text=4').first()).toBeVisible();

      // Should NOT have medals
      await expect(fourthRow.locator('text=🥇')).not.toBeVisible();
      await expect(fourthRow.locator('text=🥈')).not.toBeVisible();
      await expect(fourthRow.locator('text=🥉')).not.toBeVisible();
    });
  });

  test.describe('Author Information Display', () => {
    test('should display author details correctly', async ({ page }) => {
      // Check emoji icons
      const authorIcons = page.locator('text=👤');
      expect(await authorIcons.count()).toBeGreaterThanOrEqual(5);

      // Check usernames with @ prefix
      await expect(page.getByText('@topauthor1')).toBeVisible();
      await expect(page.getByText('@topauthor2')).toBeVisible();
      await expect(page.getByText('@topauthor3')).toBeVisible();

      // Check latest packages
      await expect(page.getByText('Latest: amazing-package-v1')).toBeVisible();
      await expect(page.getByText('Latest: cool-package-v2')).toBeVisible();

      // Check package counts with styling
      const firstAuthorPackages = page.locator('a').filter({ hasText: '@topauthor1' }).locator('text=150');
      await expect(firstAuthorPackages).toBeVisible();
      await expect(firstAuthorPackages).toHaveClass(/text-prpm-green/);

      // Check formatted download counts
      await expect(page.getByText('10,000')).toBeVisible();
      await expect(page.getByText('8,000')).toBeVisible();
      await expect(page.getByText('5,000')).toBeVisible();

      // Check labels appear multiple times
      const packagesLabels = page.getByText('packages', { exact: false });
      const downloadsLabels = page.getByText('total downloads', { exact: false });
      expect(await packagesLabels.count()).toBeGreaterThanOrEqual(5);
      expect(await downloadsLabels.count()).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('Verification Status Badges', () => {
    test('should display correct verification badges with styling', async ({ page }) => {
      // Check verified badges (at least 3)
      const verifiedBadges = page.getByText('Verified', { exact: true });
      expect(await verifiedBadges.count()).toBeGreaterThanOrEqual(3);

      // Check unclaimed badges (at least 2)
      const unclaimedBadges = page.getByText('Unclaimed', { exact: true });
      expect(await unclaimedBadges.count()).toBeGreaterThanOrEqual(2);

      // Check verified badge styling
      const verifiedBadge = page.getByText('Verified').first();
      const verifiedContainer = verifiedBadge.locator('..');
      await expect(verifiedContainer).toHaveClass(/bg-green-100/);
      await expect(verifiedContainer).toHaveClass(/text-green-800/);
      await expect(verifiedContainer).toHaveClass(/rounded-full/);

      // Check unclaimed badge styling
      const unclaimedBadge = page.getByText('Unclaimed').first();
      const unclaimedContainer = unclaimedBadge.locator('..');
      await expect(unclaimedContainer).toHaveClass(/bg-gray-100/);
      await expect(unclaimedContainer).toHaveClass(/text-gray-600/);
      await expect(unclaimedContainer).toHaveClass(/rounded-full/);

      // Check for checkmark icon
      const firstVerifiedAuthor = page.locator('a').filter({ hasText: '@topauthor1' });
      await expect(firstVerifiedAuthor.getByText('✓')).toBeVisible();
    });
  });

  test.describe('Grid Layout and Spacing', () => {
    test('should use correct 12-column grid layout with proper spans', async ({ page }) => {
      const firstRow = page.locator('a').filter({ hasText: '@topauthor1' }).first();
      const gridContainer = firstRow.locator('.grid.grid-cols-12').first();
      await expect(gridContainer).toBeVisible();

      const columns = firstRow.locator('.grid > div');

      // Check column spans: 1-4-2-3-2
      await expect(columns.nth(0)).toHaveClass(/col-span-1/);
      await expect(columns.nth(1)).toHaveClass(/col-span-4/);
      await expect(columns.nth(2)).toHaveClass(/col-span-2/);
      await expect(columns.nth(3)).toHaveClass(/col-span-3/);
      await expect(columns.nth(4)).toHaveClass(/col-span-2/);

      // Check centered alignment for rank, packages, downloads, status
      await expect(columns.nth(0)).toHaveClass(/text-center/);
      await expect(columns.nth(2)).toHaveClass(/text-center/);
      await expect(columns.nth(3)).toHaveClass(/text-center/);
      await expect(columns.nth(4)).toHaveClass(/text-center/);
    });
  });

  test.describe('Interactive Behavior', () => {
    test('should have clickable author rows with hover effects and navigation', async ({ page }) => {
      const firstAuthor = page.locator('a').filter({ hasText: '@topauthor1' }).first();

      // Check link attributes
      await expect(firstAuthor).toHaveAttribute('href', '/authors?username=topauthor1');
      await expect(firstAuthor).toHaveClass(/hover:bg-prpm-green\/5/);

      // Test navigation
      await page.click('text=@topauthor1');
      await expect(page).toHaveURL(/\/authors\?username=topauthor1/);
    });
  });

  test.describe('Bottom CTA Section', () => {
    test('should display centered bottom CTA', async ({ page }) => {
      await expect(page.getByText('Missing from the list? Contribute your packages today!')).toBeVisible();

      const bottomCTA = page.locator('div.text-center').filter({ hasText: 'Missing from the list?' });
      await expect(bottomCTA).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should maintain layout on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.getByRole('heading', { name: 'Top Authors' })).toBeVisible();
      await expect(page.getByText('@topauthor1')).toBeVisible();
      await expect(page.getByText('🥇')).toBeVisible();
    });

    test('should maintain layout on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.getByRole('heading', { name: 'Top Authors' })).toBeVisible();
      await expect(page.getByText('@topauthor1')).toBeVisible();
    });
  });

  test.describe('Visual Regression - Overall Layout', () => {
    test('should use table-style layout (not card grid)', async ({ page }) => {
      // Should NOT have the old 3-column grid layout
      const authorsList = page.locator('div').filter({ hasText: '@topauthor1' }).first();
      const parent = authorsList.locator('..');

      await expect(parent).not.toHaveClass(/grid-cols-3/);
      await expect(parent).not.toHaveClass(/lg:grid-cols-3/);
      await expect(parent).not.toHaveClass(/md:grid-cols-2/);

      // Should have divide-y for row dividers
      const tableBody = page.locator('.divide-y').filter({ has: page.getByText('@topauthor1') });
      await expect(tableBody).toBeVisible();

      // Main container should have light background
      const main = page.locator('main').first();
      await expect(main).toBeVisible();
      await expect(main).not.toHaveClass(/bg-prpm-dark/);

      // Authors should be table rows, not rounded cards
      const firstAuthor = page.locator('a').filter({ hasText: '@topauthor1' }).first();
      await expect(firstAuthor).not.toHaveClass(/rounded-xl/);
      await expect(firstAuthor).toHaveClass(/block/);
    });
  });
});

test.describe('Authors Page - Loading and Error States', () => {
  test('should show loading spinner initially', async ({ page }) => {
    // Delay the API response
    await page.route('**/api/v1/search/authors*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ authors: [], total: 0 })
      });
    });

    await page.goto('/authors');

    // Should show loading state
    await expect(page.getByText('Loading top authors...')).toBeVisible();
  });

  test('should display error message on API failure', async ({ page }) => {
    await page.route('**/api/v1/search/authors*', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/authors');

    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('❌')).toBeVisible();

    const browseButton = page.getByRole('link', { name: 'Browse Authors' });
    await expect(browseButton).toBeVisible();
    await expect(browseButton).toHaveAttribute('href', '/authors');
  });
});
