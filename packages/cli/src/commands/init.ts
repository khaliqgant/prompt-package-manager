/**
 * Init command implementation
 * Scaffolds a new PRPM package with interactive prompts
 */

import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

interface InitOptions {
  yes?: boolean; // Skip prompts and use defaults
  private?: boolean; // Create private package
  force?: boolean; // Overwrite existing prpm.json
}

interface PackageConfig {
  name: string;
  version: string;
  description: string;
  format: string;
  subtype?: string;
  author: string;
  license: string;
  repository?: string;
  tags: string[];
  files: string[];
}

const FORMATS = [
  'cursor',
  'claude',
  'continue',
  'windsurf',
  'copilot',
  'kiro',
  'agents.md',
  'generic',
  'mcp',
] as const;

const SUBTYPES = [
  'rule',
  'agent',
  'skill',
  'slash-command',
  'prompt',
  'workflow',
  'tool',
  'template',
  'collection',
] as const;

const FORMAT_EXAMPLES: Record<string, { files: string[]; description: string }> = {
  cursor: {
    description: 'Cursor AI coding rules',
    files: ['.cursorrules', 'README.md'],
  },
  claude: {
    description: 'Claude AI skills and agents',
    files: ['.claude/skills/example-skill.md', 'README.md'],
  },
  continue: {
    description: 'Continue AI coding rules',
    files: ['.continuerules', 'README.md'],
  },
  windsurf: {
    description: 'Windsurf AI coding rules',
    files: ['.windsurfrules', 'README.md'],
  },
  copilot: {
    description: 'GitHub Copilot instructions',
    files: ['.github/copilot-instructions.md', 'README.md'],
  },
  kiro: {
    description: 'Kiro steering files',
    files: ['.kiro/steering/example.md', 'README.md'],
  },
  'agents.md': {
    description: 'OpenAI agents.md project instructions',
    files: ['agents.md', 'README.md'],
  },
  generic: {
    description: 'Generic AI prompts',
    files: ['prompts/example.md', 'README.md'],
  },
  mcp: {
    description: 'Model Context Protocol',
    files: ['mcp.json', 'README.md'],
  },
};

const EXAMPLE_TEMPLATES: Record<string, Record<string, string>> = {
  cursor: {
    '.cursorrules': `# Cursor Rules

Add your Cursor AI coding rules here.

## Code Style

- Use TypeScript
- Follow functional programming patterns
- Write comprehensive tests

## Best Practices

- Keep functions small and focused
- Use meaningful variable names
- Document complex logic
`,
  },
  claude: {
    '.claude/skills/example-skill.md': `---
description: Example Claude skill
---

# Example Skill

This is an example Claude skill. Replace this content with your actual skill definition.

## What this skill does

Describe what this skill helps the AI accomplish.

## When to use this skill

Explain when this skill should be invoked.

## Instructions

Provide detailed instructions for the AI to follow when using this skill.
`,
  },
  windsurf: {
    '.windsurfrules': `# Windsurf Rules

Add your Windsurf AI coding rules here.

## Code Conventions

- Use TypeScript for type safety
- Follow React best practices
- Write unit tests for all components

## Architecture

- Component-based architecture
- Separate business logic from UI
- Use hooks for state management
`,
  },
  copilot: {
    '.github/copilot-instructions.md': `---
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
---

# GitHub Copilot Instructions

Add your GitHub Copilot instructions here.

## Code Standards

- Use TypeScript strict mode
- Follow ESLint rules
- Write JSDoc comments

## Patterns to Follow

- Use async/await for asynchronous operations
- Implement error handling with try/catch
- Export named functions instead of default exports
`,
  },
  kiro: {
    '.kiro/steering/example.md': `---
inclusion: manual
---

# Example Kiro Steering File

Add your Kiro steering instructions here.

## Context

Describe the context where this steering file applies.

## Guidelines

- Guideline 1
- Guideline 2
- Guideline 3

## Examples

Provide examples of correct patterns.
`,
  },
  'agents.md': {
    'agents.md': `# Project Coding Guidelines

Project-specific instructions for AI coding agents (OpenAI Codex, etc.).

## TypeScript Conventions

- Use strict mode for type safety
- Prefer interfaces over types for object shapes
- Use const assertions where appropriate

## Testing Requirements

- Write tests for all public APIs
- Maintain >80% code coverage
- Use descriptive test names

## Code Examples

### Preferred: Async/Await

\`\`\`typescript
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}
\`\`\`

### Avoid: Callback Hell

\`\`\`typescript
getData(function(data) {
  processData(data, function(result) {
    // Deeply nested callbacks
  });
});
\`\`\`
`,
  },
  generic: {
    'prompts/example.md': `# Example Prompt

This is an example generic AI prompt. Replace with your actual prompt content.

## Purpose

Describe what this prompt is meant to accomplish.

## Instructions

Provide clear instructions for the AI.

## Examples

Include examples if helpful.
`,
  },
};

/**
 * Prompt user for input with a default value
 */
async function prompt(
  rl: readline.Interface,
  question: string,
  defaultValue?: string
): Promise<string> {
  const promptText = defaultValue
    ? `${question} (${defaultValue}): `
    : `${question}: `;

  const answer = await rl.question(promptText);
  return answer.trim() || defaultValue || '';
}

/**
 * Prompt user to select from a list
 */
async function select(
  rl: readline.Interface,
  question: string,
  options: readonly string[],
  defaultValue?: string
): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((opt, idx) => {
    const isDefault = opt === defaultValue;
    console.log(`  ${idx + 1}. ${opt}${isDefault ? ' (default)' : ''}`);
  });

  const answer = await rl.question('\nSelect (1-' + options.length + '): ');
  const selection = parseInt(answer.trim(), 10);

  if (!answer.trim() && defaultValue) {
    return defaultValue;
  }

  if (selection >= 1 && selection <= options.length) {
    return options[selection - 1];
  }

  console.log('Invalid selection, using default.');
  return defaultValue || options[0];
}

/**
 * Get package name from current directory or git config
 */
function getDefaultPackageName(): string {
  const cwd = process.cwd();
  const dirName = cwd.split('/').pop() || 'my-package';
  // Normalize to package name format
  return dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Get author from git config
 */
function getDefaultAuthor(): string {
  try {
    const { execSync } = require('child_process');
    const name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    if (name && email) {
      return `${name} <${email}>`;
    }
    if (name) {
      return name;
    }
  } catch {
    // Git not configured
  }
  return '';
}

/**
 * Create example files based on format
 */
async function createExampleFiles(format: string, files: string[]): Promise<void> {
  const templates = EXAMPLE_TEMPLATES[format] || {};

  for (const file of files) {
    const filePath = join(process.cwd(), file);
    const dirPath = join(filePath, '..');

    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Skip if file already exists
    if (existsSync(filePath)) {
      console.log(`  Skipping ${file} (already exists)`);
      continue;
    }

    // Use template or create empty file
    const content = templates[file] || `# ${file}\n\nAdd your content here.\n`;
    await writeFile(filePath, content, 'utf-8');
    console.log(`  Created ${file}`);
  }
}

/**
 * Create README.md
 */
async function createReadme(config: PackageConfig): Promise<void> {
  const readmePath = join(process.cwd(), 'README.md');

  if (existsSync(readmePath)) {
    console.log('  Skipping README.md (already exists)');
    return;
  }

  const content = `# ${config.name}

${config.description}

## Installation

\`\`\`bash
prpm install ${config.name}
\`\`\`

## Format

${config.format}${config.subtype ? ` (${config.subtype})` : ''}

## Files

${config.files.map(f => `- ${f}`).join('\n')}

## Author

${config.author}

## License

${config.license}
`;

  await writeFile(readmePath, content, 'utf-8');
  console.log('  Created README.md');
}

/**
 * Initialize a new PRPM package
 */
async function initPackage(options: InitOptions): Promise<void> {
  const manifestPath = join(process.cwd(), 'prpm.json');

  // Check if prpm.json already exists
  if (existsSync(manifestPath) && !options.force) {
    throw new Error(
      'prpm.json already exists. Use --force to overwrite, or run this command in a different directory.'
    );
  }

  const config: Partial<PackageConfig> = {};

  // Use defaults if --yes flag
  if (options.yes) {
    config.name = getDefaultPackageName();
    config.version = '1.0.0';
    config.description = 'A PRPM package';
    config.format = 'cursor';
    config.subtype = 'rule';
    config.author = getDefaultAuthor() || 'Your Name';
    config.license = 'MIT';
    config.tags = [];
    config.files = FORMAT_EXAMPLES.cursor.files;
  } else {
    // Interactive prompts
    const rl = readline.createInterface({ input, output });

    try {
      console.log('\n🚀 Welcome to PRPM package initialization!\n');
      console.log('This utility will walk you through creating a prpm.json file.\n');

      // Package name
      const defaultName = getDefaultPackageName();
      config.name = await prompt(rl, 'Package name', defaultName);

      // Version
      config.version = await prompt(rl, 'Version', '1.0.0');

      // Description
      config.description = await prompt(
        rl,
        'Description',
        'A PRPM package for AI coding assistants'
      );

      // Format
      config.format = await select(rl, 'Select package format:', FORMATS, 'cursor');

      // Subtype
      const includeSubtype = await prompt(rl, 'Specify subtype? (y/N)', 'n');
      if (includeSubtype.toLowerCase() === 'y') {
        config.subtype = await select(rl, 'Select package subtype:', SUBTYPES, 'rule');
      }

      // Author
      const defaultAuthor = getDefaultAuthor();
      config.author = await prompt(rl, 'Author', defaultAuthor || 'Your Name');

      // License
      config.license = await prompt(rl, 'License', 'MIT');

      // Repository
      const includeRepo = await prompt(rl, 'Add repository URL? (y/N)', 'n');
      if (includeRepo.toLowerCase() === 'y') {
        config.repository = await prompt(rl, 'Repository URL', '');
      }

      // Tags
      const tagsInput = await prompt(
        rl,
        'Tags (comma-separated)',
        config.format
      );
      config.tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Files - use examples based on format
      const formatExamples = FORMAT_EXAMPLES[config.format];
      console.log(`\nExample files for ${config.format}:`);
      formatExamples.files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

      const useExamples = await prompt(
        rl,
        '\nUse example file structure? (Y/n)',
        'y'
      );

      if (useExamples.toLowerCase() !== 'n') {
        config.files = formatExamples.files;
      } else {
        const filesInput = await prompt(
          rl,
          'Files (comma-separated)',
          formatExamples.files.join(', ')
        );
        config.files = filesInput
          .split(',')
          .map(f => f.trim())
          .filter(Boolean);
      }
    } finally {
      rl.close();
    }
  }

  // Create manifest
  const manifest: Record<string, any> = {
    name: config.name,
    version: config.version,
    description: config.description,
    format: config.format,
  };

  if (config.subtype) {
    manifest.subtype = config.subtype;
  }

  manifest.author = config.author;
  manifest.license = config.license;

  if (config.repository) {
    manifest.repository = config.repository;
  }

  if (config.tags && config.tags.length > 0) {
    manifest.tags = config.tags;
  }

  manifest.files = config.files;

  // Write prpm.json
  await writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );

  console.log('\n✅ Created prpm.json\n');

  // Create example files
  if (config.files && config.format) {
    console.log('Creating example files...\n');
    await createExampleFiles(config.format, config.files);

    // Create README
    await createReadme(config as PackageConfig);
  }

  console.log('\n✨ Package initialized successfully!\n');
  console.log('Next steps:');
  console.log('  1. Edit the generated files with your content');
  console.log('  2. Review and update prpm.json as needed');
  console.log('  3. Run `prpm publish` to publish your package\n');
}

/**
 * Create init command
 */
export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new PRPM package with interactive prompts')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .option('--private', 'Create a private package')
    .option('-f, --force', 'Overwrite existing prpm.json')
    .action(async (options: InitOptions) => {
      try {
        await initPackage(options);
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}
