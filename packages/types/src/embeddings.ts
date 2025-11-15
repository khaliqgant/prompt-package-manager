/**
 * Package embeddings and AI search types
 */

export interface PackageEmbedding {
  package_id: string;
  ai_use_case_description: string | null;
  ai_problem_statement: string | null;
  ai_similar_to: string[];
  ai_best_for: string | null;
  embedding: number[] | null; // Float array
  generated_at: Date | string;
  updated_at: Date | string;
  embedding_source_hash: string | null;
}

/**
 * AI Search request/response types
 */

export interface AISearchQuery {
  query: string;
  filters?: {
    format?: string;
    subtype?: string;
    language?: string;
    framework?: string;
    min_quality?: number;
    categories?: string[]; // Category slugs
    use_cases?: string[]; // Use case slugs
  };
  limit?: number;
  offset?: number;
}

export interface AISearchResult {
  // Package core fields
  package_id: string;
  name: string;
  description: string | null;
  format: string;
  subtype: string;
  author_id: string;
  author_username?: string;
  version?: string; // Optional - not in packages table directly

  // Quality metrics
  quality_score: number | string | null;
  total_downloads: number;
  stars_count?: number;

  // AI-enriched content
  ai_use_case_description: string | null;
  ai_problem_statement: string | null;
  ai_best_for: string | null;
  ai_similar_to: string[];

  // Search scoring
  similarity_score: number; // 0-1, higher is better
  quality_score_normalized: number; // 0-1
  popularity_score_normalized: number; // 0-1
  final_score: number; // Weighted combination

  // Match metadata
  match_explanation?: string;
  source?: 'vector' | 'keyword' | 'hybrid'; // Search result source
}

export interface AISearchResponse {
  results: AISearchResult[];
  query: string;
  total_matches: number;
  execution_time_ms: number;
  search_metadata?: {
    embedding_time_ms: number;
    vector_search_time_ms: number;
    reranking_time_ms: number;
  };
}

/**
 * Embedding generation types
 */

export interface EmbeddingGenerationRequest {
  package_id: string;
  force_regenerate?: boolean;
}

export interface EmbeddingGenerationResult {
  package_id: string;
  package_name: string;
  success: boolean;
  error?: string;
  generated_at?: Date | string;
  skipped?: boolean;
  skip_reason?: string;
}

export interface BatchEmbeddingGenerationRequest {
  package_ids?: string[]; // If empty, process all packages
  force_regenerate?: boolean;
  batch_size?: number;
  dry_run?: boolean;
}

export interface BatchEmbeddingGenerationResult {
  total_packages: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    package_id: string;
    error: string;
  }>;
  duration_ms: number;
  estimated_cost_usd: number;
}

/**
 * AI-enriched content generation
 */

export interface EnrichedPackageContent {
  ai_use_case_description: string;
  ai_problem_statement: string;
  ai_similar_to: string[];
  ai_best_for: string;
  suggested_categories: string[]; // Category slugs
  suggested_use_cases: string[]; // Use case slugs
}

export interface ContentEnrichmentRequest {
  package_id: string;
  package_data: {
    name: string;
    description: string | null;
    full_content: string | null;
    format: string;
    subtype: string;
    tags?: string[];
    keywords?: string[];
    language?: string;
    framework?: string;
  };
}

/**
 * Search ranking configuration
 */

export interface SearchRankingWeights {
  semantic_similarity: number; // Default: 0.5
  quality_score: number; // Default: 0.3
  popularity: number; // Default: 0.2
}

export interface AISearchConfig {
  embedding_model: string; // Default: 'text-embedding-3-small'
  embedding_dimensions: number; // Default: 1536
  max_candidates: number; // Default: 50
  max_results: number; // Default: 10
  ranking_weights: SearchRankingWeights;
  min_similarity_threshold?: number; // Optional minimum similarity score
}

/**
 * Paywall and PRPM+ integration
 */

export interface AISearchPaywallCheck {
  has_access: boolean;
  reason?: 'prpm_plus_member' | 'trial_active' | 'no_subscription';
  trial_expires_at?: Date | string;
  upgrade_url?: string;
}

export interface AISearchUsageTracking {
  user_id: string;
  query: string;
  results_count: number;
  execution_time_ms: number;
  has_prpm_plus: boolean;
  created_at: Date | string;
}
