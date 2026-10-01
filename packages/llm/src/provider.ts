import type { z } from "zod";

export interface LlmRequest<T> {
   /** Who the model is and how it answers. */
   system: string;
   prompt: string;
   /** Shape of the answer; generate() returns it already validated. */
   schema: z.ZodType<T>;
}

/** One way to reach a model. Retries are the caller's job (BullMQ attempts). */
export interface LlmProvider {
   /** e.g. "claude-cli/sonnet": stored next to what the model produced */
   readonly model: string;
   generate<T>(request: LlmRequest<T>): Promise<T>;
}
