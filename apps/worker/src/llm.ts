import { ClaudeCliProvider, GeminiProvider, type LlmProvider } from "@jobpilot/llm";
import type { RateLimiterOptions } from "bullmq";
import { config } from "./config.js";

export interface ScoringLlm {
   llm: LlmProvider;
   /** How many score-vacancy jobs may run at once and how often: the provider's limits. */
   concurrency: number;
   limiter?: RateLimiterOptions;
}

/** The model that scores vacancies, picked by LLM_PROVIDER. */
export function createScoringLlm(): ScoringLlm {
   const { provider, model, geminiApiKey } = config.llm;
   switch (provider) {
      case "claude-cli":
         // the user's subscription: one call at a time leaves room for their own Claude usage
         return { llm: new ClaudeCliProvider({ model: model ?? "sonnet" }), concurrency: 1 };
      case "gemini":
         if (!geminiApiKey) throw new Error("LLM_PROVIDER=gemini needs GEMINI_API_KEY");
         return {
            llm: new GeminiProvider({
               apiKey: geminiApiKey,
               model: model ?? "gemini-3.5-flash-lite",
            }),
            concurrency: 1,
            // free tier: 15 requests per minute; retries count too, so stay below
            limiter: { max: 12, duration: 60_000 },
         };
      default:
         throw new Error(`unknown LLM_PROVIDER "${provider}": use claude-cli or gemini`);
   }
}
