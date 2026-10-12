import { createLlm, type LlmProvider, type LlmRequest } from "@jobpilot/llm";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** The model the API asks directly, outside the queues: the same LLM_PROVIDER as the worker's. */
@Injectable()
export class Llm implements LlmProvider {
   private readonly provider: LlmProvider;

   constructor(config: ConfigService) {
      this.provider = createLlm({
         provider: config.getOrThrow<string>("LLM_PROVIDER"),
         model: config.get<string>("LLM_MODEL") || undefined, // the provider's default when empty
         geminiApiKey: config.get<string>("GEMINI_API_KEY"),
      });
   }

   get model() {
      return this.provider.model;
   }

   generate<T>(request: LlmRequest<T>): Promise<T> {
      return this.provider.generate(request);
   }
}
