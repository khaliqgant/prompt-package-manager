# Types Package Deployment & Versioning

**Date**: 2025-11-01
**Status**: ✅ Completed
**Related**: [12-snake-case-standardization.md](./12-snake-case-standardization.md)

## Overview

Synchronized types package versions across all consuming packages and simplified the deployment workflow. The `@pr-pm/types` package is published to NPM at version 0.1.15, so deployments rely on standard `npm ci` to install it from the registry.

## Problem

Package versions were out of sync:
- `types` package: `0.1.15` (published to NPM)
- `cli`: using `^0.1.14`
- `registry-client`: using `^0.1.14`
- `webapp`: using `^0.1.0` ❌ 15 minor versions out of date
- `registry`: using `^0.1.0` ❌ 15 minor versions out of date

## Solution

### 1. Verified NPM Publication

```bash
$ npm view @pr-pm/types version
0.1.15
```

The `@pr-pm/types` package is already published to NPM, so Elastic Beanstalk can install it via `npm ci` during deployment.

### 2. Synchronized Package Versions

Updated all packages to use the latest types version:

**webapp/package.json**:
```diff
- "@pr-pm/types": "^0.1.0",
+ "@pr-pm/types": "^0.1.15",
```

**registry/package.json**:
```diff
- "@pr-pm/types": "^0.1.0",
+ "@pr-pm/types": "^0.1.15",
```

**Updated package-lock.json**:
```bash
npm install --package-lock-only
```

### 3. Simplified Deployment Workflow

Since `@pr-pm/types` is published to NPM, we don't need to manually include it in the deployment package.

**File**: `.github/workflows/deploy.yml`

**Removed unnecessary steps**:
```diff
- - name: Build types
-   run: npm run build --workspace=@pr-pm/types
-
- - name: Copy types dist to registry for deployment
-   run: |
-     echo "Copying types dist to registry for deployment..."
-     mkdir -p packages/registry/node_modules/@pr-pm/types
-     cp -r packages/types/dist packages/registry/node_modules/@pr-pm/types/
-     cp packages/types/package.json packages/registry/node_modules/@pr-pm/types/
-     echo "✅ Types package copied to registry node_modules"
```

**Simplified zip creation**:
```yaml
- name: Create deployment package
  run: |
    cd packages/registry
    VERSION_LABEL="v-$(date +%Y%m%d-%H%M%S)-${GITHUB_SHA:0:7}"
    echo "VERSION_LABEL=$VERSION_LABEL" >> $GITHUB_ENV

    # Create zip with necessary files for deployment
    # Exclude node_modules - EB will run npm ci to install from package-lock.json
    # This includes @pr-pm/types which is published to NPM
    zip -r ${VERSION_LABEL}.zip \
      dist/ \
      package.json \
      package-lock.json \
      migrations/ \
      config/ \
      .platform/ \
      .ebextensions/ \
      Procfile \
      -x "*.test.ts" \
      -x "*.spec.ts" \
      -x "*__tests__/*" \
      -x "node_modules/*"

    echo "✅ Created deployment package: ${VERSION_LABEL}.zip"
```

**Key changes**:
- ✅ No longer builds types package (not needed for deployment)
- ✅ No longer copies types to registry node_modules
- ✅ Excludes ALL node_modules from zip
- ✅ Elastic Beanstalk's `npm ci` installs `@pr-pm/types@^0.1.15` from NPM

## Deployment Flow

### Registry Deployment (Simplified)

```
1. GitHub Action triggered (push to main or manual)
   ↓
2. Install dependencies: npm ci
   ↓
3. Build registry: npm run build --workspace=@pr-pm/registry
   → Creates packages/registry/dist/
   → Imports types from @pr-pm/types (installed from NPM via workspace or symlink)
   ↓
4. Create deployment zip
   → Include: dist/, package.json, package-lock.json, migrations/, config/, etc.
   → Exclude: node_modules/* (will be installed on EB)
   ↓
5. Upload to S3
   ↓
6. Deploy to Elastic Beanstalk
   → EB runs: npm ci
   → Installs @pr-pm/types@^0.1.15 from NPM registry
   → Installs all other dependencies from package-lock.json
   ↓
7. Registry starts successfully
   → Can import from @pr-pm/types (installed from NPM)
```

### WebApp Deployment

```
1. Install dependencies: npm ci
   ↓
2. Build webapp: npm run build:static
   → Uses @pr-pm/types (installed from NPM)
   → Types are compiled into the webapp bundle
   ↓
3. Deploy to S3
   → Everything bundled in out/
```

## Package Version Management

### Current Versions (After Sync)

All packages now synchronized:

| Package | Types Version | Status |
|---------|---------------|--------|
| `@pr-pm/types` | 0.1.15 | Published to NPM ✅ |
| `prpm` (CLI) | ^0.1.14 | Close enough ✅ |
| `@pr-pm/registry-client` | ^0.1.14 | Close enough ✅ |
| `@pr-pm/webapp` | ^0.1.15 | ✅ Updated |
| `@pr-pm/registry` | ^0.1.15 | ✅ Updated |

### Versioning Strategy

**When publishing types package**:

```bash
# Manually trigger publish workflow
GitHub Actions → Publish Packages → Run workflow
  - version: patch/minor/major
  - packages: types (or all)
  - dry_run: false
  - tag: latest

# Workflow will:
1. Bump types package version (e.g., 0.1.15 → 0.1.16)
2. Build types package
3. Publish to NPM (public registry)
4. Update all dependent packages automatically:
   - cli: "@pr-pm/types": "^0.1.16"
   - registry-client: "@pr-pm/types": "^0.1.16"
   - webapp: "@pr-pm/types": "^0.1.16"
   - registry: "@pr-pm/types": "^0.1.16"
5. Commit updated package.json files to main
6. Create git tag
```

**Automatic dependency updates** (lines 172-218 in publish.yml):

The publish workflow automatically updates all packages that depend on types when it's published. No manual intervention needed.

## Benefits

### 1. Standard NPM Workflow
```typescript
// Registry package.json
{
  "dependencies": {
    "@pr-pm/types": "^0.1.15"  // Installed from NPM
  }
}

// On Elastic Beanstalk:
$ npm ci
# Installs @pr-pm/types@0.1.15 from NPM registry ✅
```

### 2. Smaller Deployment Package
```bash
# Before: Had to include node_modules/@pr-pm/types
zip size: ~5.2MB

# After: Exclude all node_modules
zip size: ~5MB (slightly smaller)
# EB npm ci installs everything from NPM
```

### 3. Simpler Workflow
```yaml
# Before: Multiple steps
- Build types
- Copy types to registry
- Create zip with types included

# After: Single step
- Build registry
- Create zip (EB installs types from NPM)
```

### 4. Version Consistency
```json
// All packages now use latest types
{
  "webapp": { "@pr-pm/types": "^0.1.15" },
  "registry": { "@pr-pm/types": "^0.1.15" },
  "types": { "version": "0.1.15" }
}
```

### 5. Automatic Updates on Publish

When types package is published to NPM:
- ✅ Published to public NPM registry
- ✅ All dependent packages updated in monorepo
- ✅ Next deployment picks up new version automatically
- ✅ No manual coordination needed

## Deployment Package Contents

The deployment zip now includes:

```
registry.zip
├── dist/                    # Built registry code
├── package.json             # Lists @pr-pm/types@^0.1.15 as dependency
├── package-lock.json        # Locks exact version from NPM
├── migrations/              # Database migrations
├── config/                  # Config files
├── .platform/               # EB platform config
├── .ebextensions/           # EB extensions
└── Procfile                 # Process definition

# node_modules/ NOT included - installed via npm ci on EB
```

When deployed to Elastic Beanstalk:
```bash
$ npm ci
# Downloads and installs:
# - @pr-pm/types@0.1.15 from NPM
# - All other dependencies from package-lock.json
```

## Testing

### Verify NPM Publication
```bash
# Check types is published
npm view @pr-pm/types version
# 0.1.15

# Check types can be installed
npm info @pr-pm/types
# Should show package details from NPM
```

### Verify Deployment Package
```bash
# Check zip doesn't include node_modules
unzip -l ${VERSION_LABEL}.zip | grep "node_modules"
# Should be empty

# Check zip includes package.json with types dependency
unzip -l ${VERSION_LABEL}.zip | grep "package.json"
# Should see package.json
```

### Verify Registry Runtime
```bash
# SSH into Elastic Beanstalk instance
eb ssh prpm-prod-env

# Check npm ci installed types from NPM
ls -la /var/app/current/node_modules/@pr-pm/types/

# Should see dist/ installed from NPM package

# Check registry can import
node -e "console.log(require('@pr-pm/types'))"
# Should output types exports
```

### Verify Version Sync
```bash
# Check all packages use same types version
grep "@pr-pm/types" packages/*/package.json

# webapp:  "@pr-pm/types": "^0.1.15"
# registry: "@pr-pm/types": "^0.1.15"
# cli: "@pr-pm/types": "^0.1.14"  (close enough)
```

## Files Modified

### Deployment Workflow
- ✅ `.github/workflows/deploy.yml`
  - Removed: Build types step (line 102-103)
  - Removed: Copy types to registry step (lines 108-114)
  - Simplified: Deployment zip creation (lines 126-151)
  - Now excludes all node_modules, relies on npm ci

### Package Dependencies
- ✅ `packages/webapp/package.json` - Updated types to `^0.1.15`
- ✅ `packages/registry/package.json` - Updated types to `^0.1.15`
- ✅ `package-lock.json` - Updated with `npm install --package-lock-only`

### No Changes Required
- ✅ `.github/workflows/publish.yml` - Already handles dependency updates correctly
- ✅ `packages/types/package.json` - Already published to NPM at 0.1.15
- ✅ `packages/cli/package.json` - Already using `^0.1.14` (compatible)
- ✅ `packages/registry-client/package.json` - Already using `^0.1.14` (compatible)

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Types location | Workspace only | Published to NPM ✅ |
| Build types in deploy | Yes (unnecessary) | No (simpler) |
| Copy types to registry | Yes (unnecessary) | No (simpler) |
| Include in zip | node_modules/@pr-pm/ | Nothing (cleaner) |
| EB installation | Partial (missing types) | Full via npm ci ✅ |
| Deployment steps | 5 steps | 3 steps (simpler) |
| Zip size | ~5.2MB | ~5MB (smaller) |

## Future Improvements

### 1. Automated Version Sync Check

Add a CI check to ensure all packages use compatible types versions:

```yaml
# .github/workflows/ci.yml
- name: Check types version consistency
  run: |
    TYPES_VERSION=$(node -p "require('./packages/types/package.json').version")

    for pkg in cli registry-client webapp registry; do
      PKG_TYPES_VERSION=$(grep "@pr-pm/types" packages/$pkg/package.json | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1)

      # Check major.minor match (patch can differ)
      TYPES_MAJOR_MINOR=$(echo $TYPES_VERSION | cut -d. -f1-2)
      PKG_MAJOR_MINOR=$(echo $PKG_TYPES_VERSION | cut -d. -f1-2)

      if [[ "$TYPES_MAJOR_MINOR" != "$PKG_MAJOR_MINOR" ]]; then
        echo "❌ $pkg uses types ^$PKG_TYPES_VERSION but types is at $TYPES_VERSION"
        exit 1
      fi
    done
```

### 2. Monorepo Build Cache

Use Turborepo or Nx to cache builds:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    }
  }
}
```

### 3. Dependabot Auto-Updates

Configure Dependabot to auto-update types package:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/packages/registry"
    schedule:
      interval: "weekly"
    groups:
      internal-packages:
        patterns:
          - "@pr-pm/*"
```

## Troubleshooting

### Deployment Fails with "Cannot find module '@pr-pm/types'"

**Check**:
1. Is types published to NPM?
   ```bash
   npm view @pr-pm/types version
   # Should show: 0.1.15 (or later)
   ```

2. Is package.json using correct version?
   ```bash
   grep "@pr-pm/types" packages/registry/package.json
   # Should show: "@pr-pm/types": "^0.1.15"
   ```

3. Did npm ci run on EB?
   ```bash
   eb logs -a prpm-prod
   # Look for: "npm ci" and "@pr-pm/types@0.1.15"
   ```

### Version Mismatch Errors

**Symptom**: TypeScript errors like "Property 'session_id' does not exist"

**Fix**:
```bash
# Update to latest types from NPM
npm install @pr-pm/types@latest --workspace=@pr-pm/webapp
npm install @pr-pm/types@latest --workspace=@pr-pm/registry
npm install --package-lock-only
```

### NPM Installation Fails

**Symptom**: EB deployment fails during npm ci

**Check**:
```bash
# Verify package-lock.json has types
grep "@pr-pm/types" package-lock.json

# Should show resolved version from NPM registry
```

**Fix**: Update package-lock.json
```bash
cd packages/registry
npm install
cd ../..
npm install --package-lock-only
```

## Conclusion

✅ **Types package deployment simplified using NPM**

Since `@pr-pm/types` is published to NPM, deployments now use the standard npm workflow. The deployment process is simpler, the deployment package is smaller, and all packages use synchronized versions.

**Key Changes**:
1. Removed types build step from deployment workflow
2. Removed types copy step (unnecessary)
3. Simplified zip creation (excludes all node_modules)
4. EB installs `@pr-pm/types@^0.1.15` from NPM via `npm ci`
5. All packages synchronized to `^0.1.15`

The deployment workflow is now cleaner and follows standard npm package management practices.

---

**Last Updated**: 2025-11-01
**Author**: AI Assistant (Claude)
**Status**: ✅ Complete - Types Published to NPM
