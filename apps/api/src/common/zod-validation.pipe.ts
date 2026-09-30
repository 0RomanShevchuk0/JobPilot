import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/** Validates a request part against a zod schema from @jobpilot/contracts: `@Body(new ZodValidationPipe(schema))`. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
   constructor(private readonly schema: T) {}

   transform(value: unknown): z.infer<T> {
      const result = this.schema.safeParse(value);
      if (!result.success) {
         throw new BadRequestException({
            message: "Validation failed",
            issues: result.error.issues,
         });
      }
      return result.data;
   }
}
