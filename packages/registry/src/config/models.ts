/**
 * AI Model Configuration
 *
 * Centralized constants for AI model identifiers across different providers.
 * Update here when model versions change to avoid hardcoding throughout the codebase.
 */

/**
 * Anthropic Claude Models
 * @see https://docs.claude.com/en/docs/about-claude/models/overview
 */
export const ANTHROPIC_MODELS = {
  // Latest Claude 4 models (recommended)
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
  OPUS_4_1: 'claude-opus-4-1-20250805',

  // Legacy Claude 4 models
  SONNET_4: 'claude-sonnet-4-20250514',

  // Legacy Claude 3.7 models
  SONNET_3_7: 'claude-3-7-sonnet-20250219',
} as const;

/**
 * OpenAI Models
 * @see https://platform.openai.com/docs/models
 */
export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
} as const;

/**
 * User-facing model selection type
 * Maps simplified model names to actual model IDs
 */
export type PlaygroundModel = 'sonnet' | 'opus' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo';

/**
 * Get the actual model ID for a user-facing model selection
 */
export function getModelId(model: PlaygroundModel): string {
  switch (model) {
    case 'sonnet':
      return ANTHROPIC_MODELS.SONNET_4_5;
    case 'opus':
      return ANTHROPIC_MODELS.OPUS_4_1;
    case 'gpt-4o':
      return OPENAI_MODELS.GPT_4O;
    case 'gpt-4o-mini':
      return OPENAI_MODELS.GPT_4O_MINI;
    case 'gpt-4-turbo':
      return OPENAI_MODELS.GPT_4_TURBO;
    default:
      return ANTHROPIC_MODELS.SONNET_4_5;
  }
}

/**
 * Check if a model is an Anthropic model
 */
export function isAnthropicModel(model: PlaygroundModel): boolean {
  return model === 'sonnet' || model === 'opus';
}

/**
 * Check if a model is an OpenAI model
 */
export function isOpenAIModel(model: PlaygroundModel): boolean {
  return model === 'gpt-4o' || model === 'gpt-4o-mini' || model === 'gpt-4-turbo';
}
