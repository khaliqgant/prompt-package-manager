# Universal Tool Calling Across LLM Providers

How to provide Claude-style MCP plugin functionality to GPT and other models.

## The Problem

**Claude Agent SDK**: Has built-in MCP plugin support (filesystem, github, etc.)
```typescript
// Claude - Easy!
const agent = new ClaudeAgent({
  plugins: ['filesystem', 'github']
});
```

**OpenAI/GPT**: Has function calling, but no MCP plugin concept
```typescript
// GPT - Need to define tools manually
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  tools: [
    { type: 'function', function: { name: 'read_file', ... } },
    { type: 'function', function: { name: 'write_file', ... } }
  ]
});
```

## Solution: Universal Tool Calling Layer

Create an abstraction that works across all providers.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              UniversalLLMExecutor                   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │        MCP Plugin Registry                 │   │
│  │                                            │   │
│  │  plugins: {                                │   │
│  │    'filesystem': FilesystemPlugin,         │   │
│  │    'github': GithubPlugin,                 │   │
│  │    'brave-search': BraveSearchPlugin       │   │
│  │  }                                         │   │
│  └────────────┬───────────────────────────────┘   │
│               │                                    │
│               ▼                                    │
│  ┌────────────────────────────────────────────┐   │
│  │     Provider Adapters                      │   │
│  │                                            │   │
│  │  • Claude → Native tool use                │   │
│  │  • OpenAI → Function calling               │   │
│  │  • Gemini → Function calling               │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Implementation

### 1. Universal Tool Interface

```typescript
// packages/cli/src/lib/testing/tools/types.ts

export interface Tool {
  name: string;
  description: string;
  execute(args: Record<string, any>): Promise<any>;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  tool_name: string;
  result: any;
  error?: string;
}
```

### 2. Implement MCP-Compatible Tools

```typescript
// packages/cli/src/lib/testing/tools/filesystem.ts

import { promises as fs } from 'fs';
import path from 'path';

export class FilesystemTool implements Tool {
  name = 'read_file';
  description = 'Read contents of a file from the filesystem';

  schema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      }
    },
    required: ['path']
  };

  async execute(args: { path: string }): Promise<any> {
    try {
      // Security: restrict to allowed directories
      const safePath = path.resolve(args.path);
      if (!this.isPathAllowed(safePath)) {
        throw new Error('Access denied: path not allowed');
      }

      const content = await fs.readFile(safePath, 'utf-8');
      return {
        path: args.path,
        content,
        size: content.length
      };
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }

  private isPathAllowed(filePath: string): boolean {
    // Only allow reading from test workspace
    const allowedPaths = [
      process.env.TEST_WORKSPACE_PATH || '/tmp/prpm-test'
    ];
    return allowedPaths.some(allowed => filePath.startsWith(allowed));
  }
}

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Write content to a file';

  schema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['path', 'content']
  };

  async execute(args: { path: string; content: string }): Promise<any> {
    try {
      const safePath = path.resolve(args.path);
      if (!this.isPathAllowed(safePath)) {
        throw new Error('Access denied: path not allowed');
      }

      await fs.writeFile(safePath, args.content, 'utf-8');
      return {
        path: args.path,
        bytes_written: args.content.length
      };
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }

  private isPathAllowed(filePath: string): boolean {
    const allowedPaths = [
      process.env.TEST_WORKSPACE_PATH || '/tmp/prpm-test'
    ];
    return allowedPaths.some(allowed => filePath.startsWith(allowed));
  }
}
```

### 3. GitHub Tool

```typescript
// packages/cli/src/lib/testing/tools/github.ts

import { Octokit } from '@octokit/rest';

export class GitHubGetFileTool implements Tool {
  name = 'github_get_file';
  description = 'Get contents of a file from a GitHub repository';

  schema = {
    type: 'object' as const,
    properties: {
      owner: {
        type: 'string',
        description: 'Repository owner'
      },
      repo: {
        type: 'string',
        description: 'Repository name'
      },
      path: {
        type: 'string',
        description: 'Path to the file in the repository'
      },
      ref: {
        type: 'string',
        description: 'Git ref (branch, tag, or commit SHA)'
      }
    },
    required: ['owner', 'repo', 'path']
  };

  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
  }

  async execute(args: {
    owner: string;
    repo: string;
    path: string;
    ref?: string;
  }): Promise<any> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: args.owner,
        repo: args.repo,
        path: args.path,
        ref: args.ref
      });

      if (!('content' in response.data)) {
        throw new Error('Path is not a file');
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

      return {
        path: args.path,
        content,
        sha: response.data.sha,
        size: response.data.size
      };
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }
}
```

### 4. Brave Search Tool

```typescript
// packages/cli/src/lib/testing/tools/brave-search.ts

export class BraveSearchTool implements Tool {
  name = 'web_search';
  description = 'Search the web using Brave Search';

  schema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      count: {
        type: 'number',
        description: 'Number of results to return (1-20)',
        default: 10
      }
    },
    required: ['query']
  };

  async execute(args: { query: string; count?: number }): Promise<any> {
    try {
      const apiKey = process.env.BRAVE_API_KEY;
      if (!apiKey) {
        throw new Error('BRAVE_API_KEY not configured');
      }

      const count = args.count || 10;
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=${count}`,
        {
          headers: {
            'X-Subscription-Token': apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        results: data.web?.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.description
        })) || []
      };
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }
}
```

### 5. Tool Registry

```typescript
// packages/cli/src/lib/testing/tools/registry.ts

import { FilesystemTool, WriteFileTool } from './filesystem';
import { GitHubGetFileTool } from './github';
import { BraveSearchTool } from './brave-search';
import type { Tool } from './types';

export class ToolRegistry {
  private tools = new Map<string, Tool[]>();

  constructor() {
    // Register MCP-compatible plugins
    this.registerPlugin('filesystem', [
      new FilesystemTool(),
      new WriteFileTool()
    ]);

    this.registerPlugin('github', [
      new GitHubGetFileTool()
    ]);

    this.registerPlugin('brave-search', [
      new BraveSearchTool()
    ]);
  }

  private registerPlugin(pluginName: string, tools: Tool[]) {
    this.tools.set(pluginName, tools);
  }

  getToolsForPlugins(plugins: string[]): Tool[] {
    const allTools: Tool[] = [];

    for (const plugin of plugins) {
      const tools = this.tools.get(plugin);
      if (tools) {
        allTools.push(...tools);
      } else {
        console.warn(`Plugin '${plugin}' not found in registry`);
      }
    }

    return allTools;
  }

  getAllTools(): Tool[] {
    const allTools: Tool[] = [];
    for (const tools of this.tools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }
}
```

### 6. Universal Executor with Tool Calling

```typescript
// packages/cli/src/lib/testing/universal-executor.ts

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ToolRegistry } from './tools/registry';
import type { Tool, ToolResult } from './tools/types';

export class UniversalLLMExecutor {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.toolRegistry = new ToolRegistry();
  }

  async executeTest(
    testCase: PackageTestCase,
    prompt: string,
    model: string,
    plugins: string[] = []
  ): Promise<TestResult> {
    // Get tools for requested plugins
    const tools = this.toolRegistry.getToolsForPlugins(plugins);

    if (model.startsWith('claude-')) {
      return this.executeWithClaude(testCase, prompt, model, tools);
    } else if (model.startsWith('gpt-')) {
      return this.executeWithOpenAI(testCase, prompt, model, tools);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  private async executeWithClaude(
    testCase: PackageTestCase,
    prompt: string,
    model: string,
    tools: Tool[]
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Convert tools to Claude format
      const claudeTools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.schema
      }));

      let messages: any[] = [
        {
          role: 'user',
          content: testCase.input
        }
      ];

      let response = '';
      const toolsUsed: string[] = [];
      let continueLoop = true;
      let iterations = 0;
      const maxIterations = 10; // Prevent infinite loops

      while (continueLoop && iterations < maxIterations) {
        iterations++;

        const message = await this.anthropic.messages.create({
          model: model,
          max_tokens: 4096,
          temperature: 0,
          system: prompt,
          messages: messages,
          tools: claudeTools.length > 0 ? claudeTools : undefined
        });

        // Process response
        for (const content of message.content) {
          if (content.type === 'text') {
            response += content.text;
          } else if (content.type === 'tool_use') {
            toolsUsed.push(content.name);

            // Execute tool
            const tool = tools.find(t => t.name === content.name);
            if (tool) {
              const result = await tool.execute(content.input);

              // Add tool result to messages
              messages.push({
                role: 'assistant',
                content: message.content
              });

              messages.push({
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: content.id,
                    content: JSON.stringify(result)
                  }
                ]
              });

              // Continue loop to get final response
              continueLoop = true;
              break;
            }
          }
        }

        // If no tool use, we're done
        if (message.stop_reason === 'end_turn') {
          continueLoop = false;
        }
      }

      const durationMs = Date.now() - startTime;

      // Run assertions
      const assertionResults = await this.runAssertions(testCase, response);
      const assertionsPassed = assertionResults.filter(a => a.passed).length;
      const passed = assertionsPassed === assertionResults.length;
      const score = assertionResults.length > 0
        ? assertionsPassed / assertionResults.length
        : 1.0;

      return {
        testCase,
        model,
        passed,
        score,
        response,
        durationMs,
        toolsUsed,
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: assertionResults
      };

    } catch (error: any) {
      return {
        testCase,
        model,
        passed: false,
        score: 0,
        error: error.message,
        durationMs: Date.now() - startTime
      };
    }
  }

  private async executeWithOpenAI(
    testCase: PackageTestCase,
    prompt: string,
    model: string,
    tools: Tool[]
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Convert tools to OpenAI format
      const openaiTools = tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema
        }
      }));

      let messages: any[] = [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: testCase.input
        }
      ];

      let response = '';
      const toolsUsed: string[] = [];
      let continueLoop = true;
      let iterations = 0;
      const maxIterations = 10;

      while (continueLoop && iterations < maxIterations) {
        iterations++;

        const completion = await this.openai.chat.completions.create({
          model: model,
          messages: messages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          temperature: 0,
          max_tokens: 4096
        });

        const message = completion.choices[0].message;

        // Check for tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Add assistant message with tool calls
          messages.push(message);

          // Execute each tool call
          for (const toolCall of message.tool_calls) {
            toolsUsed.push(toolCall.function.name);

            const tool = tools.find(t => t.name === toolCall.function.name);
            if (tool) {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await tool.execute(args);

              // Add tool result
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            }
          }

          // Continue loop to get final response
          continueLoop = true;
        } else {
          // No more tool calls, get final response
          response = message.content || '';
          continueLoop = false;
        }
      }

      const durationMs = Date.now() - startTime;

      // Run assertions
      const assertionResults = await this.runAssertions(testCase, response);
      const assertionsPassed = assertionResults.filter(a => a.passed).length;
      const passed = assertionsPassed === assertionResults.length;
      const score = assertionResults.length > 0
        ? assertionsPassed / assertionResults.length
        : 1.0;

      return {
        testCase,
        model,
        passed,
        score,
        response,
        durationMs,
        toolsUsed,
        assertionsPassed,
        assertionsTotal: assertionResults.length,
        assertionDetails: assertionResults
      };

    } catch (error: any) {
      return {
        testCase,
        model,
        passed: false,
        score: 0,
        error: error.message,
        durationMs: Date.now() - startTime
      };
    }
  }

  // runAssertions() - same as before
}
```

## Usage

Now both Claude and GPT support the same plugin interface:

```typescript
// Test with Claude + filesystem plugin
const executor = new UniversalLLMExecutor();

const result = await executor.executeTest(
  testCase,
  prompt,
  'claude-sonnet-4',
  ['filesystem', 'github']  // ← Plugins work with Claude
);

// Test with GPT + same plugins!
const result2 = await executor.executeTest(
  testCase,
  prompt,
  'gpt-4o',
  ['filesystem', 'github']  // ← Same plugins work with GPT!
);
```

## Benefits

✅ **Unified Interface**: Same plugin names work across all providers
✅ **MCP-Compatible**: Follows Model Context Protocol concepts
✅ **Extensible**: Easy to add new tools/plugins
✅ **Secure**: Built-in path restrictions and safety
✅ **Provider-Agnostic**: Claude uses tool_use, GPT uses function_calling, but same tools

## Available Plugins (Out of the Box)

| Plugin | Tools | Description |
|--------|-------|-------------|
| `filesystem` | read_file, write_file | File operations |
| `github` | github_get_file | GitHub API access |
| `brave-search` | web_search | Web search |

## Adding More Plugins

```typescript
// packages/cli/src/lib/testing/tools/postgres.ts

export class PostgresQueryTool implements Tool {
  name = 'execute_query';
  description = 'Execute a SQL query on the database';

  schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL query to execute'
      }
    },
    required: ['query']
  };

  async execute(args: { query: string }): Promise<any> {
    // Execute query safely...
  }
}

// Register in registry
this.registerPlugin('postgres', [
  new PostgresQueryTool()
]);
```

This gives you **MCP-like functionality** across all LLM providers without needing Python or the Claude Agent SDK!
