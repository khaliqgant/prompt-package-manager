# PRPM Webapp - E2E Testing Guide

## Overview

The PRPM webapp has comprehensive end-to-end testing with **34 test cases** covering all major user flows. Tests can run in two modes:

1. **Mock API Mode** (default) - Uses Playwright route interception to mock API responses
2. **Real API Mode** - Tests against actual registry backend with real data

## Test Coverage

### Test Suites

| Suite | Tests | Coverage |
|-------|-------|----------|
| Home Page | 8 | Hero, features, CTAs, navigation, mobile |
| Authors Page | 10 | Leaderboard, API mocking, error states, stats |
| Claim Flow | 16 | Form validation, OAuth, token handling, success |
| **Total** | **34** | **Full user journey coverage** |

## Prerequisites

### Option 1: Local Testing (Mock Mode)

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Install system dependencies (Ubuntu/Debian)
sudo npx playwright install-deps

# Or manually install required libraries
sudo apt-get install \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libatspi2.0-0t64 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libcairo2 \
  libpango-1.0-0 \
  libasound2t64
```

### Option 2: Docker Testing (Recommended)

No system dependencies needed! Docker handles everything.

```bash
# Install Docker and Docker Compose
# https://docs.docker.com/get-docker/
```

## Running Tests

### Mock API Mode (Default)

Tests use route interception to mock all API responses. Fast and reliable.

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific browser
npm run test:e2e -- --project=chromium

# Run specific test file
npm run test:e2e -- e2e/home.spec.ts

# Run specific test
npm run test:e2e -- -g "should display hero"
```

### Real API Mode

Tests against actual registry backend with real data (1,500+ packages).

**Prerequisites:**
```bash
# Start the registry (from root of monorepo)
cd packages/registry
docker-compose up -d

# Verify registry is healthy
curl http://localhost:3000/health
```

**Run tests:**
```bash
# Set environment variable and run
USE_REAL_API=true npm run test:e2e

# Or use the convenience script
npm run test:e2e:real
```

### Docker-Based Testing (Full Integration)

Runs the complete stack (Postgres, Redis, MinIO, Registry, Webapp) in Docker and executes tests.

```bash
# Start all services and run tests
npm run test:docker

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Stop and clean up
npm run test:docker:down
```

## Test Structure

### Home Page Tests (`e2e/home.spec.ts`)

```typescript
✓ Display hero section with PRPM branding
✓ Working GitHub and Claim Invite CTAs
✓ Display all 6 feature cards
✓ Navigate to authors page
✓ Display Quick Start CLI commands
✓ Display supported AI tools
✓ Claim invite link at bottom
✓ Responsive on mobile
```

### Authors Page Tests (`e2e/authors.spec.ts`)

```typescript
✓ Display page header and title
✓ Navigate back to home
✓ Display CTA banner with links
✓ Display leaderboard table headers
✓ Handle loading state
✓ Handle API success (with medals 🥇🥈🥉)
✓ Handle API error
✓ Display stats summary
✓ Have bottom CTA
✓ Responsive on mobile
```

### Claim Flow Tests (`e2e/claim.spec.ts`)

```typescript
Claim Entry Page:
  ✓ Display claim form
  ✓ Back to home link
  ✓ Navigate home on click
  ✓ Navigate to token page
  ✓ Require token input
  ✓ Display request invite link
  ✓ Pre-fill from query param

Claim Token Page:
  ✓ Show loading state
  ✓ Display invite details
  ✓ Display error for invalid token
  ✓ Back link on error
  ✓ Display expiration date
  ✓ Show success after claim
  ✓ Responsive on mobile

Auth Callback:
  ✓ Show loading state
  ✓ Handle callback without params
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_REAL_API` | `false` | Use real registry API instead of mocks |
| `REGISTRY_API_URL` | `http://localhost:3001` | Registry API endpoint |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` | Webapp URL |
| `CI` | - | Set to `true` in CI environments |

### Playwright Config (`playwright.config.ts`)

```typescript
// Supports both mock and real API modes
const useRealAPI = process.env.USE_REAL_API === 'true';
const registryURL = process.env.REGISTRY_API_URL || 'http://localhost:3001';

// Features:
// - Screenshot/video on failure
// - Trace on retry
// - Mobile responsive testing
// - Multi-browser support
```

## API Mocking Examples

### Mock Success Response

```typescript
await page.route('**/api/v1/search/authors*', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      authors: [
        {
          author: 'testuser',
          package_count: 100,
          total_downloads: 5000,
          verified: true,
        }
      ],
      total: 1
    })
  });
});
```

### Mock Error Response

```typescript
await page.route('**/api/v1/invites/invalid', async route => {
  await route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Invite not found' })
  });
});
```

### Mock Loading Delay

```typescript
await page.route('**/api/v1/invites/slow', async route => {
  await new Promise(resolve => setTimeout(resolve, 100));
  await route.fulfill({ status: 200, body: '{"data": "..."}' });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: packages/webapp

      - name: Install Playwright
        run: npx playwright install --with-deps chromium
        working-directory: packages/webapp

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: packages/webapp

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: packages/webapp/playwright-report
```

## Debugging

### View Test Report

```bash
# After running tests, view HTML report
npx playwright show-report
```

### Debug Mode

```bash
# Run with Playwright Inspector
PWDEBUG=1 npm run test:e2e

# Run headed to see browser
npm run test:e2e:headed

# Run UI mode for interactive debugging
npm run test:e2e:ui
```

### View Screenshots/Videos

After test failures:

```bash
# Screenshots: test-results/*/test-failed-1.png
# Videos: test-results/*/video.webm
# Traces: test-results/*/trace.zip

# View trace
npx playwright show-trace test-results/*/trace.zip
```

## Seeding Test Data

For real API testing, you can seed the database with test data:

```bash
# Run seed script (requires registry running)
npm run seed:test

# Or manually create test data via API
curl -X POST http://localhost:3001/api/v1/invites \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token-123",
    "author_username": "testuser",
    "package_count": 15
  }'
```

## Troubleshooting

### Tests Failing with "Browser launch failed"

**Problem:** Missing system dependencies

**Solution:**
```bash
# Install Playwright dependencies
sudo npx playwright install-deps

# Or use Docker
npm run test:docker
```

### Tests Failing with "Cannot connect to localhost:5173"

**Problem:** Webapp dev server not running

**Solution:**
```bash
# Start dev server in separate terminal
npm run dev

# Or let Playwright auto-start it (default behavior)
```

### Tests Failing with API errors in Real Mode

**Problem:** Registry not running or unhealthy

**Solution:**
```bash
# Check registry health
curl http://localhost:3000/health

# Restart registry
cd packages/registry
docker-compose restart registry
```

### Slow Test Execution

**Problem:** Tests running sequentially

**Solution:**
```bash
# Enable parallel execution (default in config)
# Or adjust workers in playwright.config.ts
workers: process.env.CI ? 1 : 4
```

## Best Practices

### Writing New Tests

1. **Use data-testid for stable selectors**
   ```typescript
   // Good
   await page.getByTestId('submit-button').click();

   // Avoid (text can change)
   await page.getByText('Submit').click();
   ```

2. **Mock API responses for predictability**
   ```typescript
   test('should handle error', async ({ page }) => {
     await page.route('**/api/**', route =>
       route.fulfill({ status: 500 })
     );
     // Test error handling
   });
   ```

3. **Test both success and error states**
   ```typescript
   test.describe('API Integration', () => {
     test('success case', async ({ page }) => { /* ... */ });
     test('error case', async ({ page }) => { /* ... */ });
     test('loading case', async ({ page }) => { /* ... */ });
   });
   ```

4. **Use page object pattern for complex flows**
   ```typescript
   class ClaimPage {
     constructor(private page: Page) {}
     async enterToken(token: string) {
       await this.page.getByLabel('Token').fill(token);
       await this.page.getByRole('button', { name: 'Continue' }).click();
     }
   }
   ```

## Performance Metrics

Average test execution times (on CI):

- **Home Page**: ~500ms per test
- **Authors Page**: ~600ms per test (with API mocking)
- **Claim Flow**: ~800ms per test (complex interactions)

**Total Suite**: ~30 seconds (parallel execution)

## Next Steps

1. Add visual regression testing with Percy or Playwright snapshots
2. Add accessibility testing with axe-core
3. Add performance testing with Lighthouse CI
4. Expand mobile device coverage
5. Add network throttling tests for slow connections

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Examples](./e2e/)
- [API Documentation](../registry/API.md)
- [Webapp Roadmap](./WEBAPP_ROADMAP.md)
