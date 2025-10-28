/**
 * Utility for generating package URLs
 */

/**
 * Generate the URL for a package page
 * Handles both scoped packages (@org/name) and regular packages (name)
 * Route structure: /packages/[author]/[package]
 */
export function getPackageUrl(packageName: string): string {
  if (packageName.startsWith('@')) {
    // Scoped package: @author/package -> /packages/author/package
    const withoutAt = packageName.substring(1) // Remove @
    return `/packages/${withoutAt}`
  } else {
    // Unscoped package: assume prpm as default author
    return `/packages/prpm/${packageName}`
  }
}
