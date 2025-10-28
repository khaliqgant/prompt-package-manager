/**
 * Core types for the Prompt Package Manager
 */

export type Format = 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'agents.md' | 'generic' | 'mcp';
export type Subtype = 'rule' | 'agent' | 'skill' | 'slash-command' | 'prompt' | 'collection' | 'chatmode' | 'tool';

export interface Package {
  id: string;
  format: Format;
  subtype: Subtype;
  url: string;
  dest: string;
  // Future expansion fields (not used in MVP)
  version?: string;
  provider?: string;
  verified?: boolean;
  score?: number;
  metadata?: Record<string, any>;
}

export interface Config {
  sources: Package[];
  // Future expansion fields
  registry?: string;
  settings?: Record<string, any>;
}

export interface AddOptions {
  url: string;
  format: Format;
  subtype?: Subtype;
}

export interface RemoveOptions {
  id: string;
}

export interface ListOptions {
  // Future expansion: filtering, sorting
  format?: Format;
  subtype?: Subtype;
}

export interface IndexOptions {
  // Future expansion: specific directories, dry-run mode
  force?: boolean;
}
