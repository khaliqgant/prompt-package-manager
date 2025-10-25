/**
 * Canonical Package Format
 *
 * Universal format that can be converted to any editor-specific format
 * (Cursor, Claude, Continue, Windsurf, etc.)
 */

export interface CanonicalPackage {
  // Package metadata
  id: string;
  version: string;
  name: string;
  description: string;
  author: string;
  tags: string[];

  // New taxonomy: format + subtype
  format: 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'agents.md' | 'generic' | 'mcp';
  subtype: 'rule' | 'agent' | 'skill' | 'slash-command' | 'prompt' | 'workflow' | 'tool' | 'template' | 'collection';


  // Content in canonical format
  content: CanonicalContent;

  // Extracted metadata for easier access (mirrors MetadataSection.data)
  metadata?: {
    title?: string;
    description?: string;
    icon?: string;
    version?: string;
    author?: string;
    globs?: string[];
    alwaysApply?: boolean;
    claudeAgent?: {
      model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
    };
    copilotConfig?: {
      instructionName?: string; // Name for the instruction file
      applyTo?: string; // REQUIRED for path-specific - glob pattern
    };
    kiroConfig?: {
      filename?: string; // Suggested filename in .kiro/steering/
      inclusion?: 'always' | 'fileMatch' | 'manual'; // REQUIRED - no default
      fileMatchPattern?: string; // Required if inclusion is 'fileMatch'
      domain?: string; // Domain/topic for organization
      foundationalType?: 'product' | 'tech' | 'structure'; // Foundational file type (product.md, tech.md, structure.md)
    };
    agentsMdConfig?: {
      project?: string; // Project name
      scope?: string; // Scope of the instructions (e.g., "testing", "api")
    };
  };

  // Format compatibility scores
  formatScores?: {
    cursor?: number;
    claude?: number;
    continue?: number;
    windsurf?: number;
    copilot?: number;
    kiro?: number;
    'agents.md'?: number;
  };

  // Source information
  sourceFormat?: 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'agents.md' | 'generic';
  sourceUrl?: string;

  // Quality & verification flags
  official?: boolean;    // Official package from cursor.directory, claude.ai, etc.
  verified?: boolean;    // Verified by PRPM team for quality/safety
  karenScore?: number;   // 0-100 quality score from Karen
}

export interface CanonicalContent {
  format: 'canonical';
  version: '1.0';
  sections: Section[];
}

export type Section =
  | MetadataSection
  | InstructionsSection
  | RulesSection
  | ExamplesSection
  | ToolsSection
  | PersonaSection
  | ContextSection
  | CustomSection;

/**
 * Metadata section
 * Contains package metadata and display information
 */
export interface MetadataSection {
  type: 'metadata';
  data: {
    title: string;
    description: string;
    icon?: string;
    version?: string;
    author?: string;
    claudeAgent?: {
      model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
    };
  };
}

/**
 * Instructions section
 * Free-form instructional content
 */
export interface InstructionsSection {
  type: 'instructions';
  title: string;
  content: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Rules section
 * List of rules or guidelines
 */
export interface RulesSection {
  type: 'rules';
  title: string;
  items: Rule[];
  ordered?: boolean; // Whether rules should be numbered
}

export interface Rule {
  content: string;
  rationale?: string; // Why this rule exists
  examples?: string[]; // Example code snippets
}

/**
 * Examples section
 * Code examples or use cases
 */
export interface ExamplesSection {
  type: 'examples';
  title: string;
  examples: Example[];
}

export interface Example {
  description: string;
  code: string;
  language?: string; // e.g., 'typescript', 'python'
  good?: boolean; // Is this a good or bad example?
}

/**
 * Tools section (Claude-specific)
 * Available tools/capabilities
 */
export interface ToolsSection {
  type: 'tools';
  tools: string[]; // e.g., ['Read', 'Write', 'Bash', 'WebSearch']
  description?: string;
}

/**
 * Persona section
 * AI persona/role definition
 */
export interface PersonaSection {
  type: 'persona';
  data: {
    name?: string;
    role: string;
    icon?: string;
    style?: string[]; // e.g., ['analytical', 'concise', 'friendly']
    expertise?: string[]; // Areas of expertise
  };
}

/**
 * Context section
 * Additional context or background
 */
export interface ContextSection {
  type: 'context';
  title: string;
  content: string;
}

/**
 * Custom section
 * Fallback for editor-specific features
 */
export interface CustomSection {
  type: 'custom';
  editorType?: 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro';
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Format conversion options
 */
export interface ConversionOptions {
  targetFormat: 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'canonical';
  preserveComments?: boolean;
  optimizeForEditor?: boolean; // Use editor-specific features
  includeMetadata?: boolean;

  // GitHub Copilot specific options
  copilotConfig?: {
    instructionName?: string;
    applyTo?: string; // REQUIRED for path-specific
  };

  // Kiro specific options
  kiroConfig?: {
    filename?: string;
    inclusion?: 'always' | 'fileMatch' | 'manual'; // REQUIRED
    fileMatchPattern?: string; // Required if inclusion === 'fileMatch'
    domain?: string;
    foundationalType?: 'product' | 'tech' | 'structure'; // Foundational file type (product.md, tech.md, structure.md)
  };
}

/**
 * Conversion result
 */
export interface ConversionResult {
  content: string;
  format: string;
  warnings?: string[]; // Any issues during conversion
  lossyConversion?: boolean; // Whether some features were lost
  qualityScore?: number; // 0-100, how well it converted
}
