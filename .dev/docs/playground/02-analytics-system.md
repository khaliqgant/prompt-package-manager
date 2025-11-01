# PRPM+ Analytics System

## Overview

PRPM's analytics system provides **three tiers of insights**:
1. **Public Analytics** - Package-level data for discovery
2. **Private Analytics** - Individual user insights
3. **Organization Analytics** - Team-wide metrics (B2B selling point)

**Competitive Advantage**: Nobody else has public package analytics with community ratings.

---

## Database Schema

### Enhanced `playground_usage` Table

```sql
CREATE TABLE playground_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  org_id UUID REFERENCES organizations(id),

  -- What was tested
  package_id UUID REFERENCES packages(id),
  package_version VARCHAR(50),
  session_id UUID REFERENCES playground_sessions(id),

  -- Performance metrics
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,

  -- Request metadata
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  input_length INTEGER,
  output_length INTEGER,

  -- Success tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Quality indicators
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_helpful BOOLEAN,
  user_feedback TEXT,

  -- Analytics flags
  comparison_mode BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- User queries
CREATE INDEX idx_playground_usage_user_time
  ON playground_usage(user_id, created_at DESC);

-- Organization queries
CREATE INDEX idx_playground_usage_org_time
  ON playground_usage(org_id, created_at DESC)
  WHERE org_id IS NOT NULL;

-- Package analytics
CREATE INDEX idx_playground_usage_package
  ON playground_usage(package_id)
  WHERE package_id IS NOT NULL;

-- Model comparison
CREATE INDEX idx_playground_usage_model
  ON playground_usage(model, created_at DESC);

-- Package + model breakdown
CREATE INDEX idx_playground_usage_package_model
  ON playground_usage(package_id, model)
  WHERE package_id IS NOT NULL;

-- Version comparison
CREATE INDEX idx_playground_usage_package_version
  ON playground_usage(package_id, package_version)
  WHERE package_id IS NOT NULL;

-- Success rate queries
CREATE INDEX idx_playground_usage_success
  ON playground_usage(error_occurred, created_at DESC);

-- Rating queries
CREATE INDEX idx_playground_usage_rating
  ON playground_usage(user_rating)
  WHERE user_rating IS NOT NULL;
```

---

## API Endpoints

### 1. Public Package Analytics

**Endpoint**: `GET /api/v1/analytics/package/:packageId?days=30`

**Purpose**: Show community validation data on package pages

**Response**:
```json
{
  "packageId": "uuid",
  "packageName": "code-reviewer",
  "totalRuns": 1247,
  "uniqueUsers": 89,
  "successRate": 96.3,
  "avgDuration": 2340,
  "avgTokens": 1823,
  "avgRating": 4.7,
  "modelBreakdown": [
    {
      "model": "claude-3-5-sonnet-20241022",
      "runs": 847,
      "avg_duration": 2100,
      "success_rate": 98.1
    },
    {
      "model": "gpt-4o",
      "runs": 400,
      "avg_duration": 2800,
      "success_rate": 93.5
    }
  ],
  "versionBreakdown": [
    {
      "package_version": "1.2.0",
      "runs": 723,
      "avg_rating": 4.8
    },
    {
      "package_version": "1.1.0",
      "runs": 524,
      "avg_rating": 4.6
    }
  ],
  "dailyUsage": [
    {
      "date": "2025-01-15",
      "runs": 45,
      "unique_users": 12
    }
  ]
}
```

**Use Cases**:
- Display on package detail pages
- "✅ Tested 1,247 times by 89 developers"
- "⭐ 4.7/5 average rating"
- "⚡ Best performance on Claude Sonnet"
- "📈 +15% usage this week"

**SQL Query**:
```sql
-- Overall stats
SELECT
  COUNT(*) as total_runs,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE error_occurred = FALSE) as successful_runs,
  AVG(duration_ms) as avg_duration,
  AVG(tokens_used) as avg_tokens,
  AVG(user_rating) as avg_rating
FROM playground_usage
WHERE package_id = $1 AND created_at >= $2;

-- Model breakdown
SELECT
  model,
  COUNT(*) as runs,
  AVG(duration_ms) as avg_duration,
  COUNT(*) FILTER (WHERE error_occurred = FALSE)::float / COUNT(*)::float * 100 as success_rate
FROM playground_usage
WHERE package_id = $1 AND created_at >= $2
GROUP BY model
ORDER BY runs DESC;

-- Version comparison
SELECT
  package_version,
  COUNT(*) as runs,
  AVG(user_rating) as avg_rating
FROM playground_usage
WHERE package_id = $1 AND created_at >= $2 AND package_version IS NOT NULL
GROUP BY package_version
ORDER BY package_version DESC
LIMIT 10;
```

---

### 2. Personal User Analytics

**Endpoint**: `GET /api/v1/analytics/user/me?days=30`

**Purpose**: Show individuals their usage patterns and ROI

**Response**:
```json
{
  "totalRuns": 342,
  "creditsSpent": 487,
  "totalTokens": 284736,
  "mostUsedModel": "claude-3-5-sonnet-20241022",
  "mostTestedPackage": "seo-optimizer",
  "avgResponseTime": 2145,
  "dailyActivity": [
    {
      "date": "2025-01-15",
      "runs": 12,
      "credits": 15
    }
  ],
  "modelUsage": [
    {
      "model": "claude-3-5-sonnet-20241022",
      "runs": 200,
      "credits": 200,
      "avg_duration": 1950
    },
    {
      "model": "gpt-4o",
      "runs": 142,
      "credits": 284,
      "avg_duration": 2500
    }
  ],
  "topPackages": [
    {
      "id": "uuid",
      "name": "seo-optimizer",
      "runs": 87,
      "credits": 104,
      "avg_rating": 4.9
    }
  ]
}
```

**Dashboard Widgets**:

**1. ROI Card**:
```
💰 Your Month at a Glance
━━━━━━━━━━━━━━━━━━━━━━━━━
Spent: $5 (PRPM+ subscription)
Used: 342 tests (487 credits)
Saved vs one-time: $14.35
Time saved: ~17 hours
```

**2. Model Efficiency**:
```
⚡ Fastest Model for You
━━━━━━━━━━━━━━━━━━━━━━━━━
Claude Sonnet: 1.95s avg
GPT-4o: 2.50s avg

💡 Recommendation: Use Sonnet for 28% faster results
```

**3. Top Prompts**:
```
🔥 Your Favorite Prompts
━━━━━━━━━━━━━━━━━━━━━━━━━
1. seo-optimizer (87 uses)
2. code-reviewer (54 uses)
3. bug-finder (32 uses)
```

---

### 3. Organization Analytics

**Endpoint**: `GET /api/v1/analytics/organization/:orgId?days=30`

**Purpose**: B2B dashboard for proving team ROI

**Authentication**: Org admin/owner only

**Response**:
```json
{
  "orgId": "uuid",
  "totalRuns": 5623,
  "activeMembers": 47,
  "totalCredits": 6847,
  "totalTokens": 4283947,
  "avgDuration": 2230,
  "memberActivity": [
    {
      "username": "john_dev",
      "runs": 234,
      "credits_spent": 287,
      "last_active": "2025-01-20T15:30:00Z"
    }
  ],
  "topPackages": [
    {
      "name": "code-reviewer",
      "runs": 1247,
      "unique_users": 38,
      "avg_rating": 4.7
    }
  ],
  "dailyUsage": [
    {
      "date": "2025-01-15",
      "runs": 187,
      "active_members": 23,
      "credits": 234
    }
  ]
}
```

**B2B Dashboard Sections**:

**1. Executive Summary**:
```
📊 Acme Corp - January 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active developers: 47/50 (94% adoption)
Total tests: 5,623
Cost: $99 org + $94 members = $193
Value delivered: ~281 hours saved
ROI: $16,860 / $193 = 87x return
```

**2. Team Leaderboard**:
```
🏆 Top Contributors
━━━━━━━━━━━━━━━━━━━━━━━━━
1. john_dev: 234 tests
2. jane_eng: 198 tests
3. bob_frontend: 176 tests
```

**3. Popular Prompts**:
```
📦 Most Used by Your Team
━━━━━━━━━━━━━━━━━━━━━━━━━
1. code-reviewer (1,247 uses, 38 devs)
2. api-designer (892 uses, 31 devs)
3. test-generator (654 uses, 28 devs)

💡 Consider creating internal versions
```

**4. Cost Allocation**:
```
💰 Credits by Team
━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend: 2,340 credits ($46.80 value)
Backend: 2,100 credits ($42.00 value)
DevOps: 1,407 credits ($28.14 value)
```

---

### 4. Feedback Submission

**Endpoint**: `POST /api/v1/analytics/feedback`

**Purpose**: Collect quality ratings from users

**Request**:
```json
{
  "usageId": "uuid",
  "rating": 5,
  "wasHelpful": true,
  "feedback": "This prompt saved me 2 hours of manual code review!"
}
```

**UI Implementation**:

**After Each Test**:
```
┌─────────────────────────────────────────┐
│ Was this helpful?                       │
│                                         │
│   👍 Yes    👎 No                       │
│                                         │
│ Rate this result: ⭐⭐⭐⭐⭐            │
│                                         │
│ [Optional: Tell us more...]            │
│ ┌─────────────────────────────────────┐ │
│ │ This prompt saved me...             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Submit Feedback]          │
└─────────────────────────────────────────┘
```

---

## Data Collection Strategy

### What We Track

**Automatic** (every run):
- ✅ Package ID, version
- ✅ Model used
- ✅ Duration (ms)
- ✅ Tokens consumed
- ✅ Credits spent
- ✅ Success/failure
- ✅ Input/output length
- ✅ Organization (if member)
- ✅ Comparison mode flag

**User-provided** (optional):
- ⭐ Rating (1-5 stars)
- 👍👎 Helpful/not helpful
- 📝 Written feedback

**Computed** (from aggregation):
- 📊 Success rate
- ⚡ Average duration
- 💰 Average cost
- 🏆 Popularity rank

---

## Analytics Selling Points

### For Package Authors

**Validation Dashboard**:
```
Your Package: code-reviewer v2.0

📈 Growing Fast
━━━━━━━━━━━━━━━━━━━━━━━━━
+342 tests this week (+28%)
1,247 total tests
89 unique users

⭐ High Quality
━━━━━━━━━━━━━━━━━━━━━━━━━
4.7/5 average rating
96% success rate
⚡ 2.1s average response

💡 Insights
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Works best on Claude Sonnet
✅ v2.0 has 15% better ratings than v1.5
⚠️  Consider adding examples for Python
```

### For Individual Users

**Personal Dashboard**:
```
Your Impact This Month

⏱️  Time Saved: ~17 hours
━━━━━━━━━━━━━━━━━━━━━━━━━
342 automated tests
vs ~3 min manual testing each

💰 Money Saved: $14.35
━━━━━━━━━━━━━━━━━━━━━━━━━
Subscription: $5.00
Would've cost: $19.35 in packs
Savings: 72%

🎯 Optimization Tip
━━━━━━━━━━━━━━━━━━━━━━━━━
You use GPT-4o 142 times ($2.84)
Try Sonnet for 30% cost savings
```

### For Organizations

**Executive Report**:
```
Acme Corp - PRPM+ ROI Report
January 2025

📊 Adoption
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
47/50 developers active (94%)
5,623 tests run
Up 34% from last month

💰 Cost Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Investment: $193 ($99 org + $94 members)
Value: $16,860 (281 hours × $60/hr)
ROI: 87x return on investment

🚀 Impact
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
code-reviewer used 1,247 times
Prevented ~47 bugs before production
Saved ~93 hours of code review time

📈 Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Adoption is strong. Consider:
• Creating internal prompt library
• Training team on best practices
• Sharing success stories company-wide
```

---

## Privacy & Data Handling

### What's Public vs Private

**Public** (anyone can see):
- Package-level aggregated stats
- Number of tests, success rate
- Average ratings, model performance
- Version comparisons

**Private** (user only):
- Individual test inputs/outputs
- Personal usage patterns
- Credit spending
- Favorite prompts

**Org-Restricted** (admins only):
- Team member activity
- Cost allocation
- Internal usage patterns

### Data Retention

- **Usage records**: 12 months
- **Aggregated stats**: Forever
- **Personal feedback**: 6 months
- **Deleted users**: 30 days (then anonymized)

---

## Implementation Checklist

### Backend
- [x] Database schema with analytics fields
- [x] Enhanced `logUsage()` tracking
- [x] Analytics indexes for performance
- [ ] Analytics routes implementation
  - [ ] GET /analytics/package/:id
  - [ ] GET /analytics/user/me
  - [ ] GET /analytics/organization/:id
  - [ ] POST /analytics/feedback
- [ ] Register routes in `/routes/index.ts`

### Frontend
- [ ] Package analytics badge component
- [ ] User dashboard page
- [ ] Organization dashboard page
- [ ] Feedback widget (thumbs up/down)
- [ ] Star rating component
- [ ] Analytics charts (daily usage, model breakdown)

### Testing
- [ ] Seed analytics data for development
- [ ] Test privacy boundaries (can't see other users' data)
- [ ] Test org admin permissions
- [ ] Load test aggregation queries

---

## Marketing Copy Using Analytics

**Homepage**:
> "Backed by 1.2M community tests. See which prompts actually work—with data, not guesses."

**Package Pages**:
```
✅ Tested 1,247 times by 89 developers
⭐ 4.7/5 average rating
⚡ 96% success rate
🔥 Best on Claude Sonnet (2.1s avg)
📈 +28% usage this week
```

**Pricing Page**:
```
Individual: $5/month
• Track your usage & ROI
• See time & money saved
• Optimize credit spending

Organization: $99/month
• Team adoption metrics
• Cost allocation dashboard
• Prove ROI to leadership
```

**Sales Deck** (for orgs):
```
Slide: "See Your Team's Impact"
→ Screenshot of org dashboard
→ "94% developer adoption"
→ "87x ROI in first month"
→ "281 hours saved"
```

---

**Last Updated**: 2025-01-20
**Status**: Schema complete, APIs designed, implementation pending
**Owner**: Engineering Team
