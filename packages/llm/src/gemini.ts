import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LlmProvider, LlmRequest } from "./provider.js";

export interface GeminiOptions {
   apiKey: string;
   /** e.g. "gemini-3.5-flash-lite" */
   model: string;
   /** the request is aborted after this long */
   timeoutMs?: number;
}

/** Gemini Developer API (Google AI Studio key); has a free tier. */
export class GeminiProvider implements LlmProvider {
   readonly model: string;
   private readonly ai: GoogleGenAI;

   constructor(private readonly options: GeminiOptions) {
      this.model = `gemini/${options.model}`;
      this.ai = new GoogleGenAI({
         apiKey: options.apiKey,
         httpOptions: { timeout: options.timeoutMs ?? 120_000 },
      });
   }

   async generate<T>({ system, prompt, schema }: LlmRequest<T>): Promise<T> {
      const response = await this.ai.models.generateContent({
         model: this.options.model,
         contents: prompt,
         config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(schema),
         },
      });
      const text = response.text;
      if (!text) {
         const reason =
            response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason;
         throw new Error(`gemini returned no answer (${reason ?? "unknown reason"})`);
      }
      return schema.parse(JSON.parse(text));
   }
}
