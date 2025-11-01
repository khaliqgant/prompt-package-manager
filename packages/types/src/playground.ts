/**
 * Playground types for PRPM+ testing environment
 * Convention: snake_case for all fields (matches database and API responses)
 */

export interface PlaygroundMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  tokens?: number;
}

export interface PlaygroundSession {
  id: string;
  user_id: string;
  org_id?: string;
  package_id: string;
  package_version?: string;
  package_name: string;
  conversation: PlaygroundMessage[];
  credits_spent: number;
  estimated_tokens: number;
  model: string;
  total_tokens: number;
  total_duration_ms: number;
  run_count: number;
  is_public: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
  last_run_at: string;
}

export interface PlaygroundRunRequest {
  package_id: string;
  package_version?: string;
  input: string;
  model?: 'sonnet' | 'opus' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';
  session_id?: string;
}

export interface PlaygroundRunResponse {
  session_id: string;
  response: string;
  credits_spent: number;
  credits_remaining: number;
  tokens_used: number;
  duration_ms: number;
  model: string;
  conversation: PlaygroundMessage[];
}

export interface CreditBalance {
  balance: number;
  monthly: {
    allocated: number;
    used: number;
    remaining: number;
    reset_at: string | null;
  };
  rollover: {
    amount: number;
    expires_at: string | null;
  };
  purchased: number;
  breakdown: {
    monthly: number;
    rollover: number;
    purchased: number;
  };
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  type: 'signup' | 'monthly' | 'purchase' | 'spend' | 'rollover' | 'expire' | 'refund' | 'bonus' | 'admin';
  description: string;
  metadata?: any;
  session_id?: string;
  purchase_id?: string;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export interface PurchaseRecord {
  id: string;
  user_id: string;
  credits: number;
  amount_cents: number;
  currency: string;
  package_type: 'small' | 'medium' | 'large';
  stripe_payment_intent_id: string;
  stripe_status: string;
  created_at: string;
  completed_at?: string;
}

/**
 * AI-generated test case for playground testing
 */
export interface GeneratedTestCase {
  id?: string;
  entity_type: 'package' | 'collection';
  entity_id: string;
  title: string;
  description: string;
  input: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  test_type: 'concept' | 'practical' | 'edge_case' | 'comparison' | 'quality';
  expected_criteria: string[];
  tags: string[];
  confidence_score: number;
  version_generated_from?: string;
  usage_count?: number;
  helpful_votes?: number;
  unhelpful_votes?: number;
  success_rate?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * User feedback on a test case
 */
export interface TestCaseFeedback {
  id: string;
  test_case_id: string;
  user_id: string;
  was_helpful: boolean;
  feedback_comment?: string;
  created_at: string;
}
