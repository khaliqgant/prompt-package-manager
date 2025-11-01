# PRPM CLI Testing Guide

Complete guide for testing packages using the `prpm test` command with LiteLLM and Claude Agent SDK.

## Overview

The `prpm test` command allows you to test packages using:
- **LiteLLM**: Test with 100+ LLM providers (OpenAI, Anthropic, Google, Ollama, etc.)
- **Claude Agent SDK**: Test Claude-specific packages with MCP plugins
- **Test Result Upload**: Upload results to registry to show "battle-tested" badges

## Prerequisites

### For LiteLLM Testing

1. Install and run LiteLLM proxy:
```bash
pip install litellm[proxy]

# Run proxy (default port 4000)
litellm --port 4000
```

2. Set environment variables:
```bash
# LiteLLM proxy URL (optional, defaults to http://localhost:4000)
export LITELLM_PROXY_URL=http://localhost:4000

# API key (optional, defaults to "anything" for local proxy)
export LITELLM_API_KEY=anything
```

### For Claude Agent SDK Testing

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Basic Usage

### Test a Package

```bash
# Test with default model (claude-sonnet-4)
prpm test @author/package-name

# Test with specific models
prpm test @author/package-name --models "claude-sonnet-4,gpt-4o,llama-3.1-70b"

# Test with verbose output
prpm test @author/package-name --verbose
```

### Test Claude Package with Plugins

```bash
# Test with MCP plugins
prpm test @author/claude-package --plugins "filesystem,github,brave-search"

# Force Claude Agent framework
prpm test @author/package --framework claude-agent --plugins "filesystem"
```

### Upload Test Results

```bash
# Upload results to registry (requires login)
prpm test @author/package --upload

# Upload and mark as verified (requires package ownership)
prpm test @author/package --upload --verify
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --models <models>` | Comma-separated list of models | `claude-sonnet-4` |
| `-p, --plugins <plugins>` | Comma-separated list of MCP plugins | None |
| `-f, --framework <framework>` | Testing framework (`litellm`, `claude-agent`, `auto`) | `auto` |
| `-u, --upload` | Upload test results to registry | `false` |
| `-v, --verify` | Mark results as verified (requires ownership) | `false` |
| `--verbose` | Show detailed test output | `false` |

## Framework Selection

The framework is automatically detected based on:

1. **Explicit selection**: Use `--framework` to force a specific framework
2. **Plugins specified**: If `--plugins` is provided, uses Claude Agent SDK
3. **Package format**: Claude packages default to Claude Agent SDK
4. **Default**: Falls back to LiteLLM for universal testing

## Examples

### Example 1: Multi-Model Testing

Test a package with multiple models using LiteLLM:

```bash
prpm test @anthropic/code-reviewer \
  --models "claude-sonnet-4,claude-opus-4,gpt-4o" \
  --upload
```

Output:
```
🧪 Testing package: @anthropic/code-reviewer

📦 @anthropic/code-reviewer v1.2.0
   AI-powered code review agent

📋 Found 5 test case(s)

🔧 Using framework: litellm
🤖 Testing with models: claude-sonnet-4, claude-opus-4, gpt-4o

⚡ Running tests with LiteLLM...

📊 Test Results:

✅ Test 1: Review simple function (100%)
   Model: claude-sonnet-4
   Duration: 1234ms

✅ Test 2: Detect security issues (100%)
   Model: claude-sonnet-4
   Duration: 2100ms

...

📈 Summary:

   Total Tests: 15
   Passed: 14 ✅
   Failed: 1 ❌
   Overall Score: 93.3%
   Total Duration: 23.45s
   Total Tokens: 12,543
   Total Cost: $0.0523

📤 Uploading test results to registry...

✅ Test results uploaded!
   View at: https://prpm.dev/packages/abc-123/tests
```

### Example 2: Claude Agent with Plugins

Test a Claude package that uses filesystem and GitHub:

```bash
prpm test @anthropic/repo-analyzer \
  --plugins "filesystem,github" \
  --upload \
  --verify
```

### Example 3: Cost-Optimized Testing

Test with cheaper models for CI/CD:

```bash
# Use fast, cheap models
prpm test @author/package \
  --models "gpt-3.5-turbo,llama-3.1-8b" \
  --upload
```

### Example 4: Local Model Testing

Test with local Ollama models:

```bash
# Make sure LiteLLM proxy is configured for Ollama
prpm test @author/package \
  --models "ollama/llama3.1,ollama/mistral"
```

## Test Cases

Packages must have test cases defined in the registry. Test cases include:

- **Title**: Test case name
- **Description**: What the test verifies
- **Input**: User input to test
- **Expected Output**: What the response should contain
- **Assertions**: Validation rules (contains, regex, JSON, etc.)

### Assertion Types

| Type | Description | Example |
|------|-------------|---------|
| `contains` | Response contains substring | `{"type": "contains", "value": "success"}` |
| `not-contains` | Response doesn't contain substring | `{"type": "not-contains", "value": "error"}` |
| `equals` | Response equals exact string | `{"type": "equals", "value": "OK"}` |
| `regex` | Response matches regex | `{"type": "regex", "value": "^\\d+$"}` |
| `length-greater-than` | Response length > N | `{"type": "length-greater-than", "value": 100}` |
| `length-less-than` | Response length < N | `{"type": "length-less-than", "value": 500}` |
| `is-json` | Response is valid JSON | `{"type": "is-json"}` |

## Test Badges

When you upload test results, packages receive badges based on testing rigor:

### Badge Levels

| Badge | Requirements |
|-------|-------------|
| 🏆 **Platinum** | 10+ tests, 90%+ score, 3+ models, last 30 days |
| 🥇 **Gold** | 5+ tests, 80%+ score, 2+ models, last 30 days |
| 🥈 **Silver** | 3+ tests, 70%+ score, last 30 days |
| 🥉 **Bronze** | 1+ test, last 30 days |
| ⚪ **None** | No recent tests |

### Verification

Package owners and admins can verify test results:

```bash
prpm test @your/package --upload --verify
```

Verified results are marked with a checkmark on the registry.

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Package
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install PRPM
        run: npm install -g prpm

      - name: Login to PRPM
        run: prpm login --token ${{ secrets.PRPM_TOKEN }}

      - name: Install LiteLLM
        run: pip install litellm[proxy]

      - name: Start LiteLLM Proxy
        run: |
          litellm --port 4000 &
          sleep 5
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Run Tests
        run: |
          prpm test @your/package \
            --models "claude-sonnet-4,gpt-4o" \
            --upload \
            --verify
```

## Cost Optimization

### 1. Use Cheaper Models

```bash
# GPT-3.5 Turbo: ~$0.50 per 1M tokens
prpm test @author/package --models "gpt-3.5-turbo"

# Llama 3.1 8B: ~$0.20 per 1M tokens
prpm test @author/package --models "llama-3.1-8b"
```

### 2. Local Models

```bash
# Use Ollama for free local testing
prpm test @author/package --models "ollama/llama3.1"
```

### 3. Selective Testing

Test expensive models only for important cases, use cheap models for CI:

```bash
# CI: Fast and cheap
prpm test @author/package --models "gpt-3.5-turbo"

# Pre-release: Comprehensive
prpm test @author/package --models "claude-opus-4,gpt-4o"
```

## Troubleshooting

### LiteLLM Proxy Not Running

```bash
Error: Failed to connect to LiteLLM proxy
```

**Solution**: Start the LiteLLM proxy:
```bash
litellm --port 4000
```

### Authentication Required

```bash
Error: Authentication required to upload test results
```

**Solution**: Login to PRPM:
```bash
prpm login
```

### No Test Cases Found

```bash
❌ No test cases found for @author/package
   Test cases can be added at https://prpm.dev/packages/abc-123/test-cases
```

**Solution**: Add test cases via the registry web interface.

### API Key Not Set

```bash
Error: ANTHROPIC_API_KEY is required for Claude Agent testing
```

**Solution**: Set your API key:
```bash
export ANTHROPIC_API_KEY=your_key_here
```

## MCP Plugins Reference

Available MCP plugins for Claude Agent testing:

| Plugin | Description | Use Case |
|--------|-------------|----------|
| `filesystem` | Read/write files | Code analysis, file operations |
| `github` | GitHub API access | Repository analysis, PR reviews |
| `brave-search` | Web search | Research, fact-checking |
| `postgres` | PostgreSQL database | Database queries, schema analysis |
| `sqlite` | SQLite database | Local data analysis |
| `fetch` | HTTP requests | API testing, web scraping |
| `puppeteer` | Browser automation | UI testing, screenshots |
| `google-maps` | Maps and places | Location-based tasks |
| `slack` | Slack integration | Team notifications |
| `memory` | Persistent memory | Stateful conversations |

## Best Practices

1. **Start Simple**: Test with one model first, then expand
2. **Use Cheap Models for CI**: Save expensive models for releases
3. **Upload Results**: Show your package is battle-tested
4. **Verify When Possible**: Verified results build trust
5. **Test Regularly**: Keep your badge up to date (30-day window)
6. **Use Plugins Wisely**: Only enable plugins your package needs
7. **Write Good Test Cases**: Clear inputs, specific assertions
8. **Monitor Costs**: Track token usage and costs

## Next Steps

1. Add test cases to your package: https://prpm.dev/packages/your-package/test-cases
2. Run tests locally: `prpm test @your/package --verbose`
3. Upload results: `prpm test @your/package --upload --verify`
4. Add to CI/CD pipeline
5. Earn your test badge! 🏆
