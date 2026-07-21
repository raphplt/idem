import { z } from "zod";
import {
  DOMAINS,
  duelValueSchema,
  sortValueSchema,
  verdictValueSchema,
  axisValueSchema,
  judgmentContextSchema,
  type Domain,
  type EntityType,
} from "@idem/shared";

/**
 * Contrats d'API — seule frontière de types entre apps/mobile et apps/api
 * (SPEC.md §7.1). Les inputs sont des schémas Zod (validés côté serveur),
 * les outputs sont des types TS.
 */

// ---------- Inputs ----------

export const submitJudgmentInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("duel"),
    entityId: z.string().uuid(),
    value: duelValueSchema,
    context: judgmentContextSchema.optional(),
  }),
  z.object({
    kind: z.literal("sort"),
    entityId: z.string().uuid(),
    value: sortValueSchema,
    context: judgmentContextSchema.optional(),
  }),
  z.object({
    kind: z.literal("verdict"),
    entityId: z.string().uuid(),
    value: verdictValueSchema,
    context: judgmentContextSchema.optional(),
  }),
  z.object({
    kind: z.literal("axis"),
    entityId: z.string().uuid(),
    value: axisValueSchema,
    context: judgmentContextSchema.optional(),
  }),
]);
export type SubmitJudgmentInput = z.infer<typeof submitJudgmentInput>;

export const nextQuestionInput = z.object({
  /** Domaines des dernières questions, pour la fatigue de domaine (SPEC.md §5). */
  recentDomains: z.array(z.enum(DOMAINS)).max(16).default([]),
});
export type NextQuestionInput = z.infer<typeof nextQuestionInput>;

// ---------- Outputs ----------

export type QuestionEntity = {
  id: string;
  name: string;
  domain: Domain;
  type: EntityType;
  /** Attributs typés par `type` (année pour un film, {a,b} pour une paire d'axes...). */
  attributes: Record<string, unknown>;
};

export type NextQuestion =
  | { kind: "duel"; domain: Domain; a: QuestionEntity; b: QuestionEntity }
  | { kind: "verdict"; domain: Domain; entity: QuestionEntity }
  | { kind: "axis"; pair: QuestionEntity }
  | { kind: "sort"; domain: Domain; entities: QuestionEntity[] };

export type PassportDomain = {
  domain: Domain;
  judgmentCount: number;
  top: Array<{ entity: QuestionEntity; rating: number }>;
  flop: Array<{ entity: QuestionEntity; rating: number }>;
};

export type PassportSummary = {
  totalJudgments: number;
  domains: PassportDomain[];
};

/** Jauge de précision du profil — 0..1, n'atteint jamais 1 (VISION.md §6.5). */
export type PassportPrecision = {
  global: number;
  byDomain: Array<{ domain: Domain; precision: number }>;
};
