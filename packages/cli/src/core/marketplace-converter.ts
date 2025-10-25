/**
 * Converter for Claude marketplace.json format to PRPM manifest
 */

import type { PackageManifest } from '../types/registry.js';

/**
 * Claude marketplace.json structure
 */
export interface MarketplaceJson {
  name: string;
  owner: string;
  description: string;
  version: string;
  githubUrl?: string;
  websiteUrl?: string;
  keywords?: string[];
  plugins: MarketplacePlugin[];
}

export interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
  author: string;
  keywords?: string[];
  category?: string;
  agents?: MarketplaceAgent[];
  skills?: MarketplaceSkill[];
  commands?: MarketplaceCommand[];
}

export interface MarketplaceAgent {
  name: string;
  description: string;
  source: string;
}

export interface MarketplaceSkill {
  name: string;
  description: string;
  source: string;
}

export interface MarketplaceCommand {
  name: string;
  description: string;
  source: string;
}

/**
 * Convert marketplace.json to PRPM manifest format
 *
 * Strategy:
 * - If multiple plugins exist, create a manifest for the first plugin (user can publish others separately)
 * - If the plugin has agents/skills/commands, prefer those over the root plugin info
 * - Map marketplace fields to PRPM manifest fields
 *
 * @param marketplace - The marketplace.json content
 * @param pluginIndex - Which plugin to convert (default: 0, for the first plugin)
 * @returns PRPM manifest
 */
export function marketplaceToManifest(
  marketplace: MarketplaceJson,
  pluginIndex: number = 0
): PackageManifest {
  if (!marketplace.plugins || marketplace.plugins.length === 0) {
    throw new Error('marketplace.json must contain at least one plugin');
  }

  if (pluginIndex >= marketplace.plugins.length) {
    throw new Error(`Plugin index ${pluginIndex} out of range. Found ${marketplace.plugins.length} plugins.`);
  }

  const plugin = marketplace.plugins[pluginIndex];

  // Determine package format and subtype based on what the plugin contains
  let format: 'claude' | 'cursor' | 'continue' | 'windsurf' | 'generic' = 'claude';
  let subtype: 'rule' | 'agent' | 'skill' | 'slash-command' = 'rule';

  if (plugin.agents && plugin.agents.length > 0) {
    format = 'claude';
    subtype = 'agent';
  } else if (plugin.skills && plugin.skills.length > 0) {
    format = 'claude';
    subtype = 'skill';
  } else if (plugin.commands && plugin.commands.length > 0) {
    format = 'claude';
    subtype = 'slash-command';
  }

  // Generate package name from plugin name
  // Format: @owner/plugin-name
  const packageName = generatePackageName(marketplace.owner, plugin.name);

  // Collect all files that should be included
  const files = collectFiles(plugin);

  // Determine the main file
  const main = determineMainFile(plugin);

  // Collect keywords from both marketplace and plugin
  const keywords = [
    ...(marketplace.keywords || []),
    ...(plugin.keywords || []),
  ].slice(0, 20); // Max 20 keywords

  // Extract tags from keywords (first 10)
  const tags = keywords.slice(0, 10);

  const manifest: PackageManifest = {
    name: packageName,
    version: plugin.version || marketplace.version || '1.0.0',
    description: plugin.description || marketplace.description,
    format,
    subtype,
    author: plugin.author || marketplace.owner,
    files,
    tags,
    keywords,
  };

  // Add optional fields if available
  if (marketplace.githubUrl) {
    manifest.repository = marketplace.githubUrl;
  }

  if (marketplace.websiteUrl) {
    manifest.homepage = marketplace.websiteUrl;
  }

  if (plugin.category) {
    manifest.category = plugin.category;
  }

  if (main) {
    manifest.main = main;
  }

  return manifest;
}

/**
 * Generate PRPM-compatible package name from owner and plugin name
 */
function generatePackageName(owner: string, pluginName: string): string {
  // Sanitize owner and plugin name
  const sanitizedOwner = owner.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const sanitizedName = pluginName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Remove leading/trailing hyphens
  const cleanOwner = sanitizedOwner.replace(/^-+|-+$/g, '');
  const cleanName = sanitizedName.replace(/^-+|-+$/g, '');

  return `@${cleanOwner}/${cleanName}`;
}

/**
 * Collect all files referenced in the plugin
 */
function collectFiles(plugin: MarketplacePlugin): string[] {
  const files = new Set<string>();

  // Add plugin source if it's a file path
  if (plugin.source && !plugin.source.startsWith('http')) {
    files.add(plugin.source);
  }

  // Add agent files
  if (plugin.agents) {
    for (const agent of plugin.agents) {
      if (agent.source && !agent.source.startsWith('http')) {
        files.add(agent.source);
      }
    }
  }

  // Add skill files
  if (plugin.skills) {
    for (const skill of plugin.skills) {
      if (skill.source && !skill.source.startsWith('http')) {
        files.add(skill.source);
      }
    }
  }

  // Add command files
  if (plugin.commands) {
    for (const command of plugin.commands) {
      if (command.source && !command.source.startsWith('http')) {
        files.add(command.source);
      }
    }
  }

  // Add standard files if they're not already included
  const standardFiles = ['README.md', 'LICENSE', '.claude/marketplace.json'];
  for (const file of standardFiles) {
    files.add(file);
  }

  return Array.from(files);
}

/**
 * Determine the main entry file for the package
 * Only set main if there's a single clear entry point
 */
function determineMainFile(plugin: MarketplacePlugin): string | undefined {
  const agentCount = plugin.agents?.length || 0;
  const skillCount = plugin.skills?.length || 0;
  const commandCount = plugin.commands?.length || 0;

  // Only set main if there's exactly one item total
  const totalCount = agentCount + skillCount + commandCount;

  if (totalCount !== 1) {
    // Multiple items or no items - no clear main file
    return undefined;
  }

  // Single agent
  if (agentCount === 1) {
    const source = plugin.agents![0].source;
    if (source && !source.startsWith('http')) {
      return source;
    }
  }

  // Single skill
  if (skillCount === 1) {
    const source = plugin.skills![0].source;
    if (source && !source.startsWith('http')) {
      return source;
    }
  }

  // Single command
  if (commandCount === 1) {
    const source = plugin.commands![0].source;
    if (source && !source.startsWith('http')) {
      return source;
    }
  }

  // Otherwise, use plugin source if available
  if (plugin.source && !plugin.source.startsWith('http')) {
    return plugin.source;
  }

  return undefined;
}

/**
 * Validate marketplace.json structure
 */
export function validateMarketplaceJson(data: unknown): data is MarketplaceJson {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const marketplace = data as Partial<MarketplaceJson>;

  // Check required fields
  if (!marketplace.name || typeof marketplace.name !== 'string') {
    return false;
  }

  if (!marketplace.owner || typeof marketplace.owner !== 'string') {
    return false;
  }

  if (!marketplace.description || typeof marketplace.description !== 'string') {
    return false;
  }

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    return false;
  }

  // Validate first plugin has required fields
  const plugin = marketplace.plugins[0];
  if (!plugin.name || !plugin.description || !plugin.version) {
    return false;
  }

  return true;
}
