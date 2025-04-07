import { z } from "zod";

export const SafeAPIMode = z.enum(["classic", "alt", "fallback"] as const);

export type SafeAPIMode = z.infer<typeof SafeAPIMode>;
