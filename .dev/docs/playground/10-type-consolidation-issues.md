# Type Consolidation Issues & Recommendations

## Current State Analysis

### Good News ✅

The `@pr-pm/types` package **IS being used** by the frontend (webapp):

```typescript
// packages/webapp/src/lib/api.ts
import type {
  Package,
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundRunRequest,
  PlaygroundRunResponse,
  CreditBalance,
  CreditTransaction,
  CreditPackage,
} from '@pr-pm/types'
```

### Problem ❌

The **backend (registry) is NOT using** `@pr-pm/types`. Instead, it has duplicate type definitions:

#### Duplicate Package Types

**`@pr-pm/types/src/package.ts`**:
```typescript
export interface Package {
  id: string;
  name: string;
  description?: string;
  author_id?: string;
  author_username?: string;
  org_id?: string;
  org_name?: string;  // ✅ Has org_name
  // ...
}
```

**`packages/registry/src/types.ts`**:
```typescript
export interface Package {
  id: string;
  name: string;
  description?: string;
  author_id?: string;
  author_username?: string;
  org_id?: string;
  // ❌ Missing org_name (was added during playground work)
  // ...
}
```

#### Duplicate Playground Types

**`@pr-pm/types/src/playground.ts`**:
```typescript
export interface PlaygroundMessage { ... }
export interface PlaygroundSession { ... }
export interface PlaygroundRunRequest { ... }
export interface PlaygroundRunResponse { ... }
export interface CreditBalance { ... }
export interface CreditTransaction { ... }
export interface CreditPackage { ... }
```

**`packages/registry/src/services/playground.ts`**:
```typescript
// ❌ DUPLICATES!
export interface PlaygroundMessage { ... }
export interface PlaygroundSession { ... }
export interface PlaygroundRunRequest { ... }
export interface PlaygroundRunResponse { ... }
```

**`packages/registry/src/services/playground-credits.ts`**:
```typescript
// ❌ MORE DUPLICATES!
export interface CreditBalance { ... }
export interface CreditTransaction { ... }
export interface PurchaseRecord { ... }
```

---

## Issues This Causes

### 1. Type Drift

The shared types package and backend can get out of sync:

```typescript
// Frontend expects (from @pr-pm/types)
interface Package {
  org_name?: string;  // ✅ Present
}

// Backend returns (from registry/src/types.ts)
interface Package {
  // ❌ org_name missing!
}

// Result: TypeScript won't catch the mismatch!
```

### 2. Maintenance Burden

When updating a type, you must remember to update it in **multiple places**:
- `packages/types/src/playground.ts`
- `packages/registry/src/services/playground.ts`
- `packages/registry/src/services/playground-credits.ts`

**Easy to forget one** → bugs!

### 3. Inconsistent Field Names

Different parts of the codebase might use different conventions:

```typescript
// @pr-pm/types uses snake_case
interface PlaygroundRunRequest {
  package_id: string;
  session_id?: string;
}

// Registry service uses camelCase
interface PlaygroundRunRequest {
  packageId: string;
  conversationId?: string;
}
```

### 4. No Single Source of Truth

Which is correct?
- The types package?
- The registry types?
- The service-specific types?

**Developers don't know which to trust!**

---

## Type Inventory

### Types Defined in Multiple Places

| Type | `@pr-pm/types` | `registry/src/types.ts` | Service Files |
|------|----------------|------------------------|---------------|
| **Package** | ✅ | ✅ | ❌ |
| **User** | ✅ | ✅ | ❌ |
| **Organization** | ❌ | ✅ | ❌ |
| **PlaygroundMessage** | ✅ | ❌ | ✅ `playground.ts` |
| **PlaygroundSession** | ✅ | ❌ | ✅ `playground.ts` |
| **PlaygroundRunRequest** | ✅ | ❌ | ✅ `playground.ts` |
| **PlaygroundRunResponse** | ✅ | ❌ | ✅ `playground.ts` |
| **CreditBalance** | ✅ | ❌ | ✅ `playground-credits.ts` |
| **CreditTransaction** | ✅ | ❌ | ✅ `playground-credits.ts` |

### Differences Found

#### Package Interface

```diff
// @pr-pm/types/src/package.ts
export interface Package {
  author_username?: string;
+ org_name?: string;              // ✅ Added during playground work
  quality_score?: number | string;  // Allows both
  quality_explanation?: string;
  created_at: Date | string;        // Allows both
}

// registry/src/types.ts
export interface Package {
  author_username?: string;
- // Missing org_name!           // ❌ Not synced
  quality_score?: number;          // Only number
  // Missing quality_explanation
  created_at: Date;                // Only Date
}
```

#### PlaygroundRunResponse

```diff
// @pr-pm/types/src/playground.ts
export interface PlaygroundRunResponse {
  session_id: string;
  response: string;
  credits_spent: number;
  credits_remaining: number;
  tokens_used: number;
  model: string;
  estimated_cost: number;
  conversation: PlaygroundMessage[];
}

// registry/src/services/playground.ts
export interface PlaygroundRunResponse {
  id: string;                    // Different field name
  response: string;
  conversationId: string;        // Different field name
  creditsSpent: number;          // Different field name
  creditsRemaining: number;      // Different field name
  tokensUsed: number;            // Different field name
  durationMs: number;
  model: string;
}
```

**These are COMPLETELY DIFFERENT!** 😱

#### CreditBalance

```diff
// @pr-pm/types/src/playground.ts
export interface CreditBalance {
  total: number;
  monthly: number;
  rollover: number;
  purchased: number;
  monthly_used: number;
  monthly_limit: number;
  rollover_expires_at?: string;
  monthly_reset_at?: string;
}

// registry/src/services/playground-credits.ts
export interface CreditBalance {
  balance: number;               // Different field
  monthly: {                     // Nested object
    allocated: number;
    used: number;
    remaining: number;
    resetAt: Date | null;
  };
  rollover: {                    // Nested object
    amount: number;
    expiresAt: Date | null;
  };
  purchased: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
}
```

**Completely incompatible structures!** 😱

---

## Root Cause

The `@pr-pm/types` package was **created for frontend/backend sharing**, but:

1. **Registry wasn't refactored** to use it (still uses local types)
2. **Types were added to shared package** without removing duplicates
3. **No enforcement** to use shared types
4. **Types diverged** over time

---

## Recommended Solution

### Phase 1: Consolidate to Single Source (2-3 days)

#### Step 1: Audit All Types

Create a master list of all type differences and decide on the "canonical" version.

**Decision Matrix**:
| Type | Use From | Reason |
|------|----------|--------|
| Package | `@pr-pm/types` | Frontend already uses it, has `org_name` |
| PlaygroundRunResponse | **Registry** | More complete (has `durationMs`) |
| CreditBalance | **Registry** | Better structure (nested objects) |
| PlaygroundMessage | `@pr-pm/types` | Simpler, sufficient |

#### Step 2: Update Shared Types Package

Update `@pr-pm/types` with the canonical versions:

```typescript
// packages/types/src/playground.ts

// Use registry's better structure
export interface CreditBalance {
  balance: number;
  monthly: {
    allocated: number;
    used: number;
    remaining: number;
    resetAt: Date | null;
  };
  rollover: {
    amount: number;
    expiresAt: Date | null;
  };
  purchased: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
}

// Use registry's more complete response
export interface PlaygroundRunResponse {
  id: string;
  response: string;
  conversationId: string;
  creditsSpent: number;
  creditsRemaining: number;
  tokensUsed: number;
  durationMs: number;
  model: string;
}
```

#### Step 3: Add Missing Types

Add types that are only in registry:

```typescript
// packages/types/src/user.ts

export interface Organization {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  website_url?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'maintainer' | 'member';
  joined_at: Date;
}
```

#### Step 4: Refactor Registry to Import Types

**Before**:
```typescript
// packages/registry/src/services/playground.ts
export interface PlaygroundMessage { ... }
export interface PlaygroundSession { ... }
```

**After**:
```typescript
// packages/registry/src/services/playground.ts
import type {
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundRunRequest,
  PlaygroundRunResponse,
} from '@pr-pm/types';

// Remove duplicate interfaces
// Just use the imported types
```

**Do this for**:
- `packages/registry/src/services/playground.ts`
- `packages/registry/src/services/playground-credits.ts`
- `packages/registry/src/routes/playground.ts`
- `packages/registry/src/routes/playground-credits.ts`
- `packages/registry/src/types.ts` (remove duplicates)

#### Step 5: Migrate Gradually

```typescript
// packages/registry/src/types.ts

// Import from shared package
import type { Package, User, Organization } from '@pr-pm/types';

// Re-export for backward compatibility
export type { Package, User, Organization };

// Keep registry-specific types here
export interface RegistryConfig {
  // ...
}
```

### Phase 2: Add Type Testing (1 day)

Ensure types stay in sync:

```typescript
// packages/types/src/__tests__/compatibility.test.ts

import { describe, it, expect } from 'vitest';
import type { Package } from '../package';

describe('Type Compatibility', () => {
  it('Package should have required fields', () => {
    const pkg: Package = {
      id: 'test',
      name: 'test',
      author_username: 'test',
      org_name: 'test',  // Required for frontend
      format: 'cursor',
      subtype: 'rule',
      tags: [],
      keywords: [],
      visibility: 'public',
      deprecated: false,
      verified: false,
      featured: false,
      total_downloads: 0,
      weekly_downloads: 0,
      monthly_downloads: 0,
      version_count: 0,
      rating_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(pkg.org_name).toBeDefined();
  });
});
```

### Phase 3: Add Type Validation (1 day)

Use Zod to validate runtime types match TypeScript types:

```typescript
// packages/types/src/playground.schema.ts

import { z } from 'zod';
import type { CreditBalance } from './playground';

// Zod schema
export const CreditBalanceSchema = z.object({
  balance: z.number(),
  monthly: z.object({
    allocated: z.number(),
    used: z.number(),
    remaining: z.number(),
    resetAt: z.date().nullable(),
  }),
  rollover: z.object({
    amount: z.number(),
    expiresAt: z.date().nullable(),
  }),
  purchased: z.number(),
  breakdown: z.object({
    monthly: z.number(),
    rollover: z.number(),
    purchased: z.number(),
  }),
});

// Type guard
export function isCreditBalance(data: unknown): data is CreditBalance {
  return CreditBalanceSchema.safeParse(data).success;
}
```

### Phase 4: Enforce in CI (1 day)

Add a pre-commit hook:

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Build types package
cd packages/types && npm run build

# Check for duplicate type definitions
if grep -r "export interface Package" packages/registry/src --include="*.ts" | grep -v "from '@pr-pm/types'"; then
  echo "❌ Found duplicate Package interface in registry!"
  echo "Please import from @pr-pm/types instead"
  exit 1
fi
```

---

## Migration Plan

### Week 1: Audit & Update Shared Package

- [ ] Day 1: Audit all type differences
- [ ] Day 2: Update `@pr-pm/types` with canonical versions
- [ ] Day 3: Add missing types to `@pr-pm/types`
- [ ] Day 4: Test types build and exports
- [ ] Day 5: Review and document changes

### Week 2: Refactor Registry

- [ ] Day 1: Update `playground.ts` to import from types package
- [ ] Day 2: Update `playground-credits.ts` to import from types package
- [ ] Day 3: Update route files to import from types package
- [ ] Day 4: Update `registry/src/types.ts` to re-export from types package
- [ ] Day 5: Run tests, fix any breakage

### Week 3: Add Validation & CI

- [ ] Day 1-2: Add type compatibility tests
- [ ] Day 3: Add Zod schemas for runtime validation
- [ ] Day 4: Set up CI checks
- [ ] Day 5: Documentation and cleanup

---

## Quick Wins (Can Do Now)

### 1. Fix Obvious Duplicates

The playground types are clearly duplicated:

```bash
# Remove from packages/registry/src/services/playground.ts
- export interface PlaygroundMessage { ... }
- export interface PlaygroundSession { ... }
- export interface PlaygroundRunRequest { ... }
- export interface PlaygroundRunResponse { ... }

# Add import
+ import type {
+   PlaygroundMessage,
+   PlaygroundSession,
+   PlaygroundRunRequest,
+   PlaygroundRunResponse,
+ } from '@pr-pm/types';
```

**Caveat**: First need to reconcile the differences in `PlaygroundRunResponse`!

### 2. Add org_name to Registry Package Type

```typescript
// packages/registry/src/types.ts
export interface Package {
  // ... existing fields ...
  author_username?: string;
  org_id?: string;
+ org_name?: string;  // Add this
  // ...
}
```

This fixes the immediate playground bug.

### 3. Document the Pattern

Add to README:

```markdown
## Type System

All shared types between frontend and backend MUST be defined in `@pr-pm/types`.

**DO**:
```typescript
import type { Package } from '@pr-pm/types';
```

**DON'T**:
```typescript
export interface Package { ... }  // Duplicate!
```

**Adding New Types**:
1. Add to `packages/types/src/`
2. Export from `packages/types/src/index.ts`
3. Bump version in `packages/types/package.json`
4. Run `npm run build` in types package
5. Import in frontend/backend
```

---

## Risks & Mitigation

### Risk 1: Breaking Changes

**Risk**: Updating types might break existing code

**Mitigation**:
- Make changes incrementally
- Add compatibility types during migration
- Run full test suite after each change
- Use TypeScript's strict mode to catch issues

### Risk 2: Runtime Mismatch

**Risk**: TypeScript types might not match runtime data

**Mitigation**:
- Add Zod schemas for validation
- Add runtime type guards
- Log warnings when types don't match
- Add integration tests

### Risk 3: Developer Confusion

**Risk**: Developers might not know which types to use

**Mitigation**:
- Clear documentation in README
- ESLint rule to prevent duplicates
- CI check for duplicate type definitions
- Training/onboarding docs

---

## Success Criteria

✅ All shared types defined in `@pr-pm/types` only
✅ Zero duplicate type definitions
✅ Frontend and backend use same types
✅ CI fails on duplicate type definitions
✅ Types are validated with Zod schemas
✅ Documentation clearly explains type system
✅ All tests pass

---

## Example: Perfect Type Flow

```typescript
// 1. Define in shared package
// packages/types/src/playground.ts
export interface CreditBalance {
  balance: number;
  // ...
}

// 2. Build and publish
// packages/types/package.json version bumped

// 3. Import in backend
// packages/registry/src/services/playground-credits.ts
import type { CreditBalance } from '@pr-pm/types';

export class PlaygroundCreditsService {
  async getBalance(userId: string): Promise<CreditBalance> {
    // Implementation returns type-safe object
  }
}

// 4. Import in frontend
// packages/webapp/src/lib/api.ts
import type { CreditBalance } from '@pr-pm/types';

export async function getCreditBalance(): Promise<CreditBalance> {
  // Fetch from API, types match!
}

// 5. Use in component
// packages/webapp/src/components/CreditsWidget.tsx
import type { CreditBalance } from '@pr-pm/types';

function CreditsWidget() {
  const [balance, setBalance] = useState<CreditBalance>();
  // TypeScript knows exact shape!
}
```

**Everyone uses the same type → No drift → No bugs!**

---

**Last Updated**: 2025-11-01
**Priority**: HIGH (causes bugs, maintenance burden)
**Effort**: 2-3 weeks for complete migration
**Quick Win**: 1 day to fix immediate duplicates
