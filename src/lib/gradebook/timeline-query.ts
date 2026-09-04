import { z } from "zod";
export const timelineQuery = z.object({
  before: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().nonnegative().max(2147483647))
    .optional(),
  revision: z.uuid().optional(),
});
