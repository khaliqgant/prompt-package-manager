# Proposal: PRPM Integration for agents.md Ecosystem

**For submission to:** https://github.com/openai/agents.md/issues

---

## Title

**Proposal: Consider mentioning PRPM as a distribution layer for agents.md files**

## Summary

We're building [PRPM (Prompt Package Manager)](https://prpm.dev) - an early-stage universal registry for AI coding tool configurations - and have added native support for the agents.md format. As fellow early-stage projects in this rapidly evolving space, we believe PRPM could help accelerate agents.md adoption by providing immediate access to hundreds of pre-written, conversion-ready configurations. This is a humble proposal to explore potential collaboration.

## Background

The agents.md format is excellent - a simple, open standard that solves a real problem: giving AI coding agents predictable, project-specific guidance. The collaboration between OpenAI, Google, and others to create this standard is exactly what the ecosystem needs.

PRPM approaches a complementary problem: right now, if you want to adopt agents.md, you're starting from scratch. There's no shared library of proven patterns, no way to install battle-tested configurations, and no easy path to migrate from existing tool-specific formats.

## What PRPM Does

PRPM is a package manager (like npm, but for AI tool configurations) that:

1. **Provides a searchable registry** of 1,500+ AI coding configurations
2. **Converts between formats** - including to/from agents.md
3. **Makes installation simple**: `prpm install typescript-best-practices --format agents.md`
4. **Enables sharing** of proven patterns across teams and projects

## How This Benefits agents.md

We believe PRPM could help drive agents.md adoption in several ways:

### 1. Immediate Content Library
- 1,500+ existing packages can be converted to agents.md format
- Communities like cursor.directory contributors have shared proven patterns
- New agents.md users get working examples instantly instead of starting from blank files

### 2. Migration Path from Tool-Specific Formats
Many teams already use:
- `.cursor/rules` (Cursor)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `.claude/` files (Claude)
- `.kiro/steering/` (Kiro)

PRPM can convert these to agents.md, making it easier for teams to standardize on the open format.

### 3. Format Compatibility
PRPM validates conversions and provides quality scores, ensuring that converted files work well with agents.md-compatible tools like Codex.

## Proposed Documentation Addition

We'd be honored if agents.md documentation could include a brief mention like:

> **Tooling & Distribution**
>
> - **[PRPM](https://prpm.dev)** - A package manager for AI coding configurations with native agents.md support. Install pre-written agents.md files from a registry of 1,500+ configurations, or convert existing tool-specific formats to agents.md.
>   ```bash
>   prpm install typescript-best-practices --format agents.md
>   ```

This could appear in:
- README.md tooling section (if one exists or is planned)
- The agents.md website under "Getting Started" or "Tools"
- A separate "Ecosystem" page

## What We're NOT Asking For

To be clear, we're **not** asking for:
- Endorsement of PRPM over other tools
- Changes to the agents.md specification
- Exclusive positioning or special treatment
- Any commitment of resources or support
- To imply PRPM is production-ready (we're early stage and transparent about it)

## Our Commitment

As an early-stage project ourselves, we understand the importance of community trust and transparency. Regardless of whether this proposal is accepted, we're committed to:
- Maintaining high-quality agents.md conversion
- Following the agents.md specification exactly
- Contributing back to the ecosystem (we're open source: MIT licensed)
- Driving awareness of agents.md as an open standard
- Being transparent about our early-stage status and limitations

## Example: How It Works Today

A developer can already do this:

```bash
# Install PRPM
npm install -g @pr-pm/cli

# Browse available packages
prpm search typescript

# Install as agents.md format
prpm install typescript-best-practices --format agents.md

# Result: agents.md file created in project root with proven TypeScript patterns
```

The converted agents.md file maintains quality because:
- PRPM validates section structure
- Conversion preserves examples and rationale
- Quality scoring ensures good conversions (we skip low-quality ones)

## Why We Built This

We saw developers constantly re-writing the same `.cursor/rules`, `.github/copilot-instructions.md`, and other files across projects. Communities were sharing incredible patterns, but there was no standard way to package and distribute this work across different AI coding tools.

The agents.md format is the perfect standard to rally around - simple, open, and backed by major players. We want to help it succeed.

## Questions We're Happy to Answer

- How can we better align with agents.md goals?
- Are there specific conversion quality requirements we should meet?
- Would you prefer different positioning/messaging?
- Are there other ways we can support the agents.md ecosystem?

## Links

- **PRPM Registry:** https://prpm.dev
- **GitHub:** https://github.com/pr-pm/prpm
- **Blog Post on Distributable Intelligence:** https://prpm.dev/blog/distributable-intelligence
- **Live Example:** Try `prpm search agents.md` (once published)

## Conclusion

We deeply respect the work that's gone into creating agents.md as an open standard. Both agents.md and PRPM are early-stage projects trying to solve real problems in this rapidly evolving AI coding ecosystem. This proposal is offered in the spirit of collaboration - if there's a way PRPM can help drive adoption of agents.md, we'd be honored to contribute. If not, we'll continue supporting the format anyway because we believe in open standards.

Thank you for considering this proposal, and thank you for creating agents.md.

---

**Submitted by:** PRPM Team
**Contact:** https://github.com/pr-pm/prpm
**License:** MIT (same as agents.md)
**Stage:** Early stage, actively developing
