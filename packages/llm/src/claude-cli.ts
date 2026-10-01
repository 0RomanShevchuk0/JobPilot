import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { z } from "zod";
import type { LlmProvider, LlmRequest } from "./provider.js";

export interface ClaudeCliOptions {
   /** alias ("sonnet", "haiku") or a full model id */
   model: string;
   /** the process is killed after this long */
   timeoutMs?: number;
}

// the part of `claude -p --output-format json` we rely on
const cliResultSchema = z.object({
   is_error: z.boolean(),
   result: z.string().optional(),
   structured_output: z.unknown().optional(), // missing when the model answered in plain text
});

/**
 * Calls the locally installed Claude Code CLI, so requests go through the user's subscription
 * instead of a paid API key.
 */
export class ClaudeCliProvider implements LlmProvider {
   readonly model: string;

   constructor(private readonly options: ClaudeCliOptions) {
      this.model = `claude-cli/${options.model}`;
   }

   async generate<T>({ system, prompt, schema }: LlmRequest<T>): Promise<T> {
      // with "$schema" in it the CLI silently answers in plain text instead of structured output
      const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
      // prettier-ignore
      const args = [
         "-p",
         "--output-format", "json",
         "--model", this.options.model,
         "--system-prompt", system,
         "--json-schema", JSON.stringify(jsonSchema),
         "--tools", "", // answer only, never act
         "--strict-mcp-config", // don't load the user's MCP servers: ~16k tokens of tool definitions per call
         "--no-session-persistence",
      ];
      const stdout = await run(args, prompt, this.options.timeoutMs ?? 180_000);

      const result = cliResultSchema.parse(JSON.parse(stdout));
      if (result.is_error) throw new Error(`claude cli: ${result.result ?? "unknown error"}`);
      if (result.structured_output === undefined) {
         throw new Error(`claude cli answered without structured output: ${result.result}`);
      }
      return schema.parse(result.structured_output);
   }
}

function run(args: string[], stdin: string, timeoutMs: number): Promise<string> {
   return new Promise((resolve, reject) => {
      // tmpdir: keep project CLAUDE.md files and settings out of the request
      const child = spawn("claude", args, { cwd: tmpdir(), timeout: timeoutMs });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("error", reject); // e.g. claude is not installed
      child.on("close", (code, signal) => {
         if (code === 0) resolve(stdout);
         else reject(new Error(`claude cli exited with ${signal ?? code}: ${stderr || stdout}`));
      });
      child.stdin.end(stdin);
   });
}
