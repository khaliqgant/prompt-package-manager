/**
 * Lock file management for reproducible installations
 * prpm.lock format similar to package-lock.json
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface LockfilePackage {
  version: string;
  resolved: string; // Tarball URL
  integrity: string; // SHA-256 hash
  dependencies?: Record<string, string>;
  format?: string;
  subtype?: string;
  installedPath?: string; // Path where the package was installed
}

export interface Lockfile {
  version: string; // Lock file format version
  lockfileVersion: number;
  packages: Record<string, LockfilePackage>;
  generated: string; // Timestamp
}

const LOCKFILE_NAME = 'prpm.lock';
const LOCKFILE_VERSION = 1;

/**
 * Read lock file from current directory
 */
export async function readLockfile(cwd: string = process.cwd()): Promise<Lockfile | null> {
  try {
    const lockfilePath = join(cwd, LOCKFILE_NAME);
    const content = await fs.readFile(lockfilePath, 'utf-8');
    return JSON.parse(content) as Lockfile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // Lock file doesn't exist
    }
    throw new Error(`Failed to read lock file: ${error}`);
  }
}

/**
 * Write lock file to current directory
 */
export async function writeLockfile(
  lockfile: Lockfile,
  cwd: string = process.cwd()
): Promise<void> {
  try {
    const lockfilePath = join(cwd, LOCKFILE_NAME);
    const content = JSON.stringify(lockfile, null, 2);
    await fs.writeFile(lockfilePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write lock file: ${error}`);
  }
}

/**
 * Create new lock file
 */
export function createLockfile(): Lockfile {
  return {
    version: '1.0.0',
    lockfileVersion: LOCKFILE_VERSION,
    packages: {},
    generated: new Date().toISOString(),
  };
}

/**
 * Add package to lock file
 */
export function addToLockfile(
  lockfile: Lockfile,
  packageId: string,
  packageInfo: {
    version: string;
    tarballUrl: string;
    dependencies?: Record<string, string>;
    format?: string;
    subtype?: string;
    installedPath?: string;
  }
): void {
  lockfile.packages[packageId] = {
    version: packageInfo.version,
    resolved: packageInfo.tarballUrl,
    integrity: '', // Will be set after download
    dependencies: packageInfo.dependencies,
    format: packageInfo.format,
    subtype: packageInfo.subtype,
    installedPath: packageInfo.installedPath,
  };
  lockfile.generated = new Date().toISOString();
}

/**
 * Update package integrity hash after download
 */
export function setPackageIntegrity(
  lockfile: Lockfile,
  packageId: string,
  tarballBuffer: Buffer
): void {
  if (!lockfile.packages[packageId]) {
    throw new Error(`Package ${packageId} not found in lock file`);
  }

  const hash = createHash('sha256').update(tarballBuffer).digest('hex');
  lockfile.packages[packageId].integrity = `sha256-${hash}`;
}

/**
 * Verify package integrity
 */
export function verifyPackageIntegrity(
  lockfile: Lockfile,
  packageId: string,
  tarballBuffer: Buffer
): boolean {
  const pkg = lockfile.packages[packageId];
  if (!pkg || !pkg.integrity) {
    return false;
  }

  const hash = createHash('sha256').update(tarballBuffer).digest('hex');
  const expectedHash = pkg.integrity.replace('sha256-', '');

  return hash === expectedHash;
}

/**
 * Get locked version for a package
 */
export function getLockedVersion(
  lockfile: Lockfile | null,
  packageId: string
): string | null {
  if (!lockfile || !lockfile.packages[packageId]) {
    return null;
  }
  return lockfile.packages[packageId].version;
}

/**
 * Check if lock file is out of sync with dependencies
 */
export function isLockfileOutOfSync(
  lockfile: Lockfile | null,
  requiredPackages: Record<string, string>
): boolean {
  if (!lockfile) {
    return true;
  }

  // Check if all required packages are in lock file
  for (const [pkgId, version] of Object.entries(requiredPackages)) {
    const locked = lockfile.packages[pkgId];
    if (!locked || locked.version !== version) {
      return true;
    }
  }

  return false;
}

/**
 * Merge lock files (for conflict resolution)
 */
export function mergeLockfiles(
  base: Lockfile,
  incoming: Lockfile
): Lockfile {
  const merged = createLockfile();

  // Merge packages from both lock files
  const allPackages = new Set([
    ...Object.keys(base.packages),
    ...Object.keys(incoming.packages),
  ]);

  for (const pkgId of allPackages) {
    const basePkg = base.packages[pkgId];
    const incomingPkg = incoming.packages[pkgId];

    if (!basePkg) {
      merged.packages[pkgId] = incomingPkg;
    } else if (!incomingPkg) {
      merged.packages[pkgId] = basePkg;
    } else {
      // Both exist - prefer newer version
      const baseVersion = basePkg.version;
      const incomingVersion = incomingPkg.version;

      merged.packages[pkgId] = compareVersions(baseVersion, incomingVersion) >= 0
        ? basePkg
        : incomingPkg;
    }
  }

  return merged;
}

/**
 * Simple semver comparison (returns 1 if a > b, -1 if a < b, 0 if equal)
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

/**
 * Prune unused packages from lock file
 */
export function pruneLockfile(
  lockfile: Lockfile,
  requiredPackages: Set<string>
): Lockfile {
  const pruned = { ...lockfile };
  pruned.packages = {};

  for (const pkgId of requiredPackages) {
    if (lockfile.packages[pkgId]) {
      pruned.packages[pkgId] = lockfile.packages[pkgId];
    }
  }

  pruned.generated = new Date().toISOString();
  return pruned;
}

/**
 * Add package to lock file (convenience wrapper)
 */
export async function addPackage(packageInfo: {
  id: string;
  version: string;
  tarballUrl: string;
  dependencies?: Record<string, string>;
  format?: string;
  subtype?: string;
  installedPath?: string;
}): Promise<void> {
  const lockfile = (await readLockfile()) || createLockfile();
  addToLockfile(lockfile, packageInfo.id, {
    version: packageInfo.version,
    tarballUrl: packageInfo.tarballUrl,
    dependencies: packageInfo.dependencies,
    format: packageInfo.format,
    subtype: packageInfo.subtype,
    installedPath: packageInfo.installedPath,
  });
  await writeLockfile(lockfile);
}

/**
 * Remove package from lock file
 */
export async function removePackage(packageId: string): Promise<LockfilePackage | null> {
  const lockfile = await readLockfile();
  if (!lockfile || !lockfile.packages[packageId]) {
    return null;
  }

  const removed = lockfile.packages[packageId];
  delete lockfile.packages[packageId];
  lockfile.generated = new Date().toISOString();
  await writeLockfile(lockfile);
  return removed;
}

/**
 * List all packages in lock file
 */
export async function listPackages(): Promise<Array<{ id: string } & LockfilePackage>> {
  const lockfile = await readLockfile();
  if (!lockfile) {
    return [];
  }

  return Object.entries(lockfile.packages).map(([id, pkg]) => ({
    id,
    ...pkg,
  }));
}

/**
 * Get a specific package from lock file
 */
export async function getPackage(packageId: string): Promise<LockfilePackage | null> {
  const lockfile = await readLockfile();
  if (!lockfile || !lockfile.packages[packageId]) {
    return null;
  }
  return lockfile.packages[packageId];
}
