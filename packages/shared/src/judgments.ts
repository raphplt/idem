import { z } from "zod";
import { VERDICT_LEVELS } from "./domains";

/**
 * Schémas des valeurs de jugement — SPEC.md §3.
 * Les clés sont en snake_case : c'est le format stocké dans judgments.value (jsonb).
 */

export const duelValueSchema = z.object({
  opponent_id: z.string().uuid(),
  winner_id: z.string().uuid(),
});
export type DuelValue = z.infer<typeof duelValueSchema>;

export const sortValueSchema = z.object({
  ordered_ids: z.array(z.string().uuid()).min(2).max(7),
});
export type SortValue = z.infer<typeof sortValueSchema>;

export const verdictValueSchema = z.object({
  level: z.enum(VERDICT_LEVELS),
});
export type VerdictValue = z.infer<typeof verdictValueSchema>;

export const axisValueSchema = z.object({
  pair_id: z.string().uuid(),
  side: z.enum(["a", "b"]),
  strength: z.number().int().min(1).max(3),
});
export type AxisValue = z.infer<typeof axisValueSchema>;

/** Contexte de session — le temps de réponse est stocké (SPEC.md §3). */
export const judgmentContextSchema = z
  .object({
    session_id: z.string(),
    position: z.number().int().nonnegative(),
    response_time_ms: z.number().int().nonnegative(),
  })
  .partial();
export type JudgmentContext = z.infer<typeof judgmentContextSchema>;
