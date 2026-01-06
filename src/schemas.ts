import { z } from "zod";

export const readingSchema = z.object({
  // Normalize by parsing ISO-8601 with offset; reject non-integers and unsafe counts.
  timestamp: z.string().datetime({ offset: true }),
  count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
});

export const payloadSchema = z.object({
  id: z.string().uuid(),
  readings: z.array(readingSchema).min(1)
});
