// schemas.ts
// Contains Zod schemas for validating the OpenRouter API response.

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const ArchitectureSchema = z.object({
  modality: z.string(),
  input_modalities: z.array(z.string()),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
  instruct_type: z.string().nullable(),
});

export const PricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  request: z.string(),
  image: z.string(),
  web_search: z.string().optional(),
  internal_reasoning: z.string().optional(),
  input_cache_read: z.string().optional(),
  input_cache_write: z.string().optional(),
});

export const TopProviderSchema = z.object({
  context_length: z.number().int().nullable(),
  max_completion_tokens: z.number().int().nullable(),
  is_moderated: z.boolean(),
});

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  context_length: z.number().int(),
  created: z.number().int(),
  hugging_face_id: z.string().nullable(),
  canonical_slug: z.string(),
  architecture: ArchitectureSchema,
  pricing: PricingSchema,
  top_provider: TopProviderSchema,
  per_request_limits: z.record(z.unknown()).nullable(),
  supported_parameters: z.array(z.string()),
});

export const OpenRouterModelsSchema = z.object({
  data: z.array(ModelSchema),
});

// Infer TypeScript types from schemas
export type Model = z.infer<typeof ModelSchema>;