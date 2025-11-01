# PRPM+ Playground - Technical Specification

## Overview

The **PRPM+ Playground** is a premium feature that allows verified organizations to test prompts in a virtual environment using AI agents. Users can see live demonstrations of how packages perform before installing them.

**Target**: First killer PRPM+ feature for subscriber retention and conversion.

---

## Vision & Progression

### Phase 1: Simple Text Execution (MVP)
**Timeline**: 2-3 weeks | **Complexity**: Medium

- Test prompt against simple text inputs
- See Claude's response in real-time
- Basic conversation threading
- Share playground sessions via link

### Phase 2: Code Generation & Preview
**Timeline**: 3-4 weeks | **Complexity**: Medium-High

- Generate code from prompts
- Syntax highlighting for output
- Multi-file code generation
- Download generated code as zip

### Phase 3: Live Cursor/IDE Simulation
**Timeline**: 4-6 weeks | **Complexity**: High

- Simulate Cursor environment
- Show agent applying prompt to codebase
- Multi-step agent actions
- Real-time streaming updates

### Phase 4: Full App Deployment (Future)
**Timeline**: 8-12 weeks | **Complexity**: Very High

- Deploy generated apps to sandbox
- Interactive preview (Vercel-like)
- Test with real API calls
- Share live demos

---

## Phase 1 MVP: Simple Text Execution

### Features

#### 1. **Playground Interface**
```
┌──────────────────────────────────────────────────────┐
│  PRPM+ Playground                    [Share] [Save]  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Package: @prpm/typescript-expert                    │
│  Format: Claude Skill                                │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ Prompt Preview                              │   │
│  │ ───────────────────────────────────────     │   │
│  │ You are a TypeScript expert...             │   │
│  │ [Full prompt content shown here]           │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  Test Input:                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Write a function to validate email          │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  [▶ Run Playground]                                  │
│                                                       │
│  ╭─ Response ─────────────────────────────────────╮ │
│  │ Here's a TypeScript function...              │ │
│  │ ```typescript                                 │ │
│  │ function validateEmail(email: string): bool { │ │
│  │   ...                                         │ │
│  │ }                                             │ │
│  │ ```                                           │ │
│  ╰───────────────────────────────────────────────╯ │
│                                                       │
│  Conversation History (3 messages)                   │
│  [Continue Conversation]                             │
└──────────────────────────────────────────────────────┘
```

#### 2. **Key Capabilities**
- ✅ Load any package prompt
- ✅ Test with custom input
- ✅ See Claude's response using that prompt
- ✅ Multi-turn conversation (follow-ups)
- ✅ Save playground sessions
- ✅ Share playground sessions via link
- ✅ Rate limiting (10 runs/hour for verified, 3/hour for free)

---

## Architecture

### Backend Components

#### 1. **Playground API** (`packages/registry/src/routes/playground.ts`)

```typescript
// POST /api/v1/playground/run
interface PlaygroundRunRequest {
  packageId: string;
  packageVersion?: string;
  userInput: string;
  conversationId?: string; // For multi-turn
  model?: 'claude-3-5-sonnet' | 'claude-3-opus'; // PRPM+ gets premium models
}

interface PlaygroundRunResponse {
  id: string;
  response: string;
  conversationId: string;
  tokensUsed: number;
  durationMs: number;
  model: string;
}

// GET /api/v1/playground/sessions/:id
// GET /api/v1/playground/sessions (list user's sessions)
// DELETE /api/v1/playground/sessions/:id
```

#### 2. **Playground Service** (`packages/registry/src/services/playground.ts`)

```typescript
class PlaygroundService {
  // Load package prompt content
  async loadPackagePrompt(packageId: string, version?: string): Promise<string>

  // Execute prompt with Claude API
  async executePrompt(prompt: string, userInput: string, conversation?: Message[]): Promise<Response>

  // Save playground session
  async saveSession(session: PlaygroundSession): Promise<string>

  // Get session by ID (for sharing)
  async getSession(sessionId: string): Promise<PlaygroundSession>
}
```

#### 3. **Rate Limiting**
```typescript
// Different limits for free vs verified
const RATE_LIMITS = {
  free: {
    runs: 3,
    windowHours: 1,
    maxTokens: 4000,
    models: ['claude-3-5-sonnet']
  },
  verified: {
    runs: 30,
    windowHours: 1,
    maxTokens: 200000,
    models: ['claude-3-5-sonnet', 'claude-3-opus']
  }
}
```

---

### Frontend Components

#### 1. **Playground Page** (`packages/webapp/src/app/(app)/playground/page.tsx`)

Main playground interface with:
- Package selector (search/autocomplete)
- Prompt preview panel
- Input textarea
- Run button with loading state
- Response display with markdown rendering
- Conversation history

#### 2. **Components**

```typescript
// packages/webapp/src/components/Playground/
PlaygroundEditor.tsx        // Main editor interface
PlaygroundPromptPreview.tsx // Show package prompt
PlaygroundInput.tsx         // User input area
PlaygroundResponse.tsx      // Display AI response
PlaygroundHistory.tsx       // Conversation thread
PlaygroundShare.tsx         // Share link modal
PlaygroundControls.tsx      // Run/Save/Share buttons
```

#### 3. **State Management**

```typescript
interface PlaygroundState {
  packageId: string | null;
  packageContent: string;
  userInput: string;
  conversation: Message[];
  isRunning: boolean;
  error: string | null;
  sessionId: string | null;
  shareUrl: string | null;
}
```

---

### Database Schema

```sql
-- Playground sessions table
CREATE TABLE playground_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Package info
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  package_version VARCHAR(50),
  package_name VARCHAR(255) NOT NULL,

  -- Session data
  conversation JSONB NOT NULL DEFAULT '[]',
  -- conversation format: [{ role: 'user' | 'assistant', content: string, timestamp: ISO }]

  -- Metadata
  model VARCHAR(50) NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 1,

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(32) UNIQUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_sessions_user ON playground_sessions(user_id, created_at DESC);
CREATE INDEX idx_playground_sessions_package ON playground_sessions(package_id);
CREATE INDEX idx_playground_sessions_share ON playground_sessions(share_token) WHERE is_public = TRUE;

-- Usage tracking for rate limiting
CREATE TABLE playground_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  session_id UUID REFERENCES playground_sessions(id) ON DELETE SET NULL,

  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playground_usage_user_time ON playground_usage(user_id, created_at DESC);
CREATE INDEX idx_playground_usage_org_time ON playground_usage(org_id, created_at DESC);
```

---

## Implementation Plan - Phase 1 MVP

### Week 1: Backend Foundation
- [ ] Create playground database schema
- [ ] Implement PlaygroundService class
- [ ] Create playground API routes
- [ ] Add rate limiting middleware
- [ ] Test with Anthropic SDK integration
- [ ] Add usage tracking

### Week 2: Frontend Core
- [ ] Create playground page layout
- [ ] Build PlaygroundEditor component
- [ ] Implement input/response UI
- [ ] Add conversation threading
- [ ] Integrate with backend API
- [ ] Add loading states and error handling

### Week 3: Polish & Features
- [ ] Add session saving
- [ ] Implement share functionality
- [ ] Build session history view
- [ ] Add markdown rendering for responses
- [ ] Implement syntax highlighting
- [ ] Add "Try in Playground" button on package pages
- [ ] Testing and bug fixes

---

## User Flow

### 1. **From Package Page**
```
User on package page → Click "Try in Playground" button →
Load playground with prompt pre-loaded →
Enter test input → Run → See results
```

### 2. **From Playground Page**
```
User goes to /playground →
Search for package →
Select package →
Enter test input →
Run →
See results →
Continue conversation OR Save session
```

### 3. **Shared Sessions**
```
User receives share link →
Opens /playground/shared/:token →
See conversation history →
Can fork to own session →
Can continue conversation (if verified)
```

---

## Pricing & Access Control

### Free Users
- 3 playground runs per hour
- Max 4K tokens per run
- Claude 3.5 Sonnet only
- Cannot save sessions
- Can view shared sessions (read-only)

### Verified Users (PRPM+)
- 30 playground runs per hour
- Max 200K tokens per run
- Access to Claude 3 Opus
- Save unlimited sessions
- Share sessions publicly
- Priority API queue

### Future: Enterprise Tier
- Unlimited runs
- Custom models (GPT-4, etc.)
- Private playgrounds (team-only)
- API access to playground
- Custom rate limits

---

## Technical Considerations

### 1. **Cost Management**
- Track token usage per user/org
- Set hard limits for free tier
- Implement token budgets for verified tier
- Alert admins when usage spikes

### 2. **Security**
- Sanitize all user inputs
- Rate limit aggressively
- Prevent prompt injection attacks
- Isolate execution environments
- Don't expose system prompts

### 3. **Performance**
- Cache package content (Redis)
- Stream responses for better UX
- Use WebSockets for real-time updates
- CDN for static playground assets

### 4. **Monitoring**
- Track playground usage metrics
- Monitor API costs (Anthropic)
- Alert on unusual patterns
- Log all playground runs for debugging

---

## Success Metrics

### Engagement
- Playground runs per day
- Average session length
- Repeat usage rate
- Shared session views

### Conversion
- Free → Verified conversion from playground usage
- Playground → Package install conversion
- Time spent in playground

### Business
- Cost per playground run
- Token usage trends
- Revenue impact (upgrade attribution)

---

## Future Enhancements (Phase 2+)

### Code Generation Mode
- Generate full files/projects
- Multi-file output
- Download as ZIP
- GitHub integration (create repo)

### IDE Simulation
- Embed Monaco editor
- Show agent editing files
- Simulate cursor actions
- Real-time streaming

### Advanced Features
- Compare prompts side-by-side
- A/B test different versions
- Benchmark performance
- Record and replay sessions
- Custom system prompts
- Temperature/model controls

### Deployment
- Deploy to sandbox environment
- Live preview URLs
- Test with real APIs
- Database provisioning
- Environment variables

---

## API Cost Estimation

### Assumptions
- Average: 2000 tokens per run (input + output)
- Claude 3.5 Sonnet: $3/million input, $15/million output
- Average split: 500 input, 1500 output tokens

### Costs
- **Per run**: ~$0.024
- **100 runs/day** (verified org): ~$2.40/day = $72/month
- **1000 users × 5 runs/day**: $120/day = $3,600/month

### Revenue vs Cost
- Verified org: $20/month subscription
- Playground cost: ~$72/month
- **Loss leader initially**, but drives:
  - Higher package discovery
  - More package installations
  - Better quality packages (testing)
  - Platform stickiness

---

## Alternative Approaches

### Option 1: Local Execution (Not Recommended)
- Run prompts in browser
- No API costs
- Limited to client-side models
- Poor quality, slow

### Option 2: Hybrid (Future Phase)
- Simple runs: Client-side
- Complex runs: Server-side
- Best of both worlds
- More complexity

### Option 3: Credits System (Consider)
- Give users "playground credits"
- Buy more credits if needed
- Better cost control
- Might hurt adoption

---

## Development Checklist

### Phase 1 MVP
- [ ] Database schema and migrations
- [ ] Backend API routes
- [ ] Playground service implementation
- [ ] Rate limiting middleware
- [ ] Frontend playground page
- [ ] Component library
- [ ] Session save/load
- [ ] Share functionality
- [ ] Package integration ("Try in Playground" button)
- [ ] Usage tracking and analytics
- [ ] Testing (unit + integration)
- [ ] Documentation (user guide)
- [ ] Deployment (feature flag)

### Pre-Launch
- [ ] Load testing (simulate 100 concurrent users)
- [ ] Cost monitoring dashboard
- [ ] Rate limit tuning
- [ ] Security audit
- [ ] Beta testing with 10 verified orgs
- [ ] Feedback collection
- [ ] Marketing materials
- [ ] Announcement blog post

---

## Timeline Summary

| Phase | Features | Timeline | Complexity |
|-------|----------|----------|------------|
| **Phase 1** | Text execution, conversation, sharing | 2-3 weeks | Medium |
| **Phase 2** | Code generation, syntax highlighting | 3-4 weeks | Medium-High |
| **Phase 3** | IDE simulation, agent streaming | 4-6 weeks | High |
| **Phase 4** | App deployment, live previews | 8-12 weeks | Very High |

**Recommended**: Start with Phase 1 MVP, gather feedback, iterate.

---

## Next Steps

1. **Get approval** on Phase 1 scope
2. **Create feature flag**: `PLAYGROUND_ENABLED`
3. **Set up Anthropic API budget alerts**
4. **Create database migrations**
5. **Implement backend service**
6. **Build frontend components**
7. **Beta test with verified orgs**
8. **Launch publicly**

---

*Last Updated*: 2025-10-30
*Status*: Planning Phase
*Owner*: Engineering Team
