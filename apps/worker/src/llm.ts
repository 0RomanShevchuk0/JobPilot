import { createLlm, type LlmProvider } from "@jobpilot/llm";
import type { RateLimiterOptions } from "bullmq";
import { config } from "./config.js";

export interface ScoringLlm {
   llm: LlmProvider;
   /** How many score-vacancy jobs may run at once and how often: the provider's limits. */
   concurrency: number;
   limiter?: RateLimiterOptions;
}

/** The model that scores vacancies, picked by LLM_PROVIDER, with that provider's limits. */
export function createScoringLlm(): ScoringLlm {
   const llm = createLlm(config.llm);
   if (config.llm.provider === "gemini") {
      // free tier: 15 requests per minute; retries count too, so stay below
      return { llm, concurrency: 1, limiter: { max: 12, duration: 60_000 } };
   }
   // claude-cli, the user's subscription: one call at a time leaves room for their own Claude usage
   return { llm, concurrency: 1 };
}
