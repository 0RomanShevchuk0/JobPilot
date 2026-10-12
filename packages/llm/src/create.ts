import { ClaudeCliProvider } from "./claude-cli.js";
import { GeminiProvider } from "./gemini.js";
import type { LlmProvider } from "./provider.js";

/** LLM_PROVIDER, LLM_MODEL and GEMINI_API_KEY from .env */
export interface LlmConfig {
   provider: string;
   /** the provider's default when missing */
   model?: string;
   geminiApiKey?: string;
}

/** The model picked by LLM_PROVIDER. */
export function createLlm({ provider, model, geminiApiKey }: LlmConfig): LlmProvider {
   switch (provider) {
      case "claude-cli":
         return new ClaudeCliProvider({ model: model ?? "sonnet" });
      case "gemini":
         if (!geminiApiKey) throw new Error("LLM_PROVIDER=gemini needs GEMINI_API_KEY");
         return new GeminiProvider({
            apiKey: geminiApiKey,
            model: model ?? "gemini-3.5-flash-lite",
         });
      default:
         throw new Error(`unknown LLM_PROVIDER "${provider}": use claude-cli or gemini`);
   }
}
