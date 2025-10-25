import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display hero section with PRPM branding', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.getByRole('heading', { name: 'PRPM' })).toBeVisible();
    await expect(page.getByText('Prompt Package Manager')).toBeVisible();

    // Check description
    await expect(page.getByText(/npm-style package manager for AI coding prompts/)).toBeVisible();
  });

  test('should have working GitHub and Claim Invite CTAs', async ({ page }) => {
    await page.goto('/');

    // Check GitHub link
    const githubLink = page.getByRole('link', { name: 'View on GitHub' });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/pr-pm/prpm');
    await expect(githubLink).toHaveAttribute('target', '_blank');

    // Check Claim Invite link
    const claimLink = page.getByRole('link', { name: 'Claim Invite' });
    await expect(claimLink).toBeVisible();
    await expect(claimLink).toHaveAttribute('href', '/claim');
  });

  test('should display all 6 feature cards', async ({ page }) => {
    await page.goto('/');

    // Check all feature cards are visible
    await expect(page.getByText('1,500+ Packages')).toBeVisible();
    await expect(page.getByText('CLI Tool')).toBeVisible();
    await expect(page.getByText('Search & Discover')).toBeVisible();
    await expect(page.getByText('16 Collections')).toBeVisible();
    await expect(page.getByText('Verified Authors')).toBeVisible();
    await expect(page.getByText('Version Control')).toBeVisible();
  });

  test('should navigate to authors page when clicking Verified Authors card', async ({ page }) => {
    await page.goto('/');

    // Click on Verified Authors card
    await page.getByRole('link', { name: /Verified Authors/ }).click();

    // Should navigate to /authors
    await expect(page).toHaveURL('/authors');
    await expect(page.getByRole('heading', { name: 'Top Authors' })).toBeVisible();
  });

  test('should display Quick Start section with CLI commands', async ({ page }) => {
    await page.goto('/');

    // Check Quick Start heading
    await expect(page.getByRole('heading', { name: 'Quick Start' })).toBeVisible();

    // Check CLI commands are visible
    await expect(page.getByText('npm install -g prpm')).toBeVisible();
    await expect(page.getByText('prpm search react')).toBeVisible();
    await expect(page.getByText('prpm install @sanjeed5/react-best-practices')).toBeVisible();
  });

  test('should display supported AI tools section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Supports Your Favorite AI Coding Tools')).toBeVisible();
    await expect(page.getByText('Cursor')).toBeVisible();
    await expect(page.getByText('Claude')).toBeVisible();
    await expect(page.getByText('Continue')).toBeVisible();
    await expect(page.getByText('Windsurf')).toBeVisible();
    await expect(page.getByText('Generic')).toBeVisible();
  });

  test('should have claim invite link at bottom', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Have an invite code?')).toBeVisible();

    const claimLink = page.getByRole('link', { name: /Claim your verified author username/ });
    await expect(claimLink).toBeVisible();
    await expect(claimLink).toHaveAttribute('href', '/claim');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main heading should still be visible
    await expect(page.getByRole('heading', { name: 'PRPM' })).toBeVisible();

    // Feature cards should stack vertically (still visible)
    await expect(page.getByText('1,500+ Packages')).toBeVisible();
    await expect(page.getByText('CLI Tool')).toBeVisible();
  });
});
