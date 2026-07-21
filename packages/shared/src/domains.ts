/**
 * Domaines et types d'entité — voir SPEC.md §2.2 / §2.3.
 */

export const DOMAINS = [
  "cinema",
  "musique",
  "bouffe",
  "lieu",
  "livre",
  "jeu",
  "objet",
  "sport",
  "abstrait",
] as const;
export type Domain = (typeof DOMAINS)[number];

/** Les 6 domaines du MVP (SPEC.md §6). Les autres existent dans le modèle mais ne sont pas servis. */
export const MVP_DOMAINS = [
  "cinema",
  "musique",
  "bouffe",
  "lieu",
  "livre",
  "abstrait",
] as const satisfies readonly Domain[];

/** Domaines "catalogue" proposables en duel/verdict/tri (tout sauf l'abstrait). */
export const CATALOG_DOMAINS = MVP_DOMAINS.filter(
  (d) => d !== "abstrait",
) as Domain[];

export const ENTITY_TYPES = [
  "work",
  "creator",
  "track",
  "album",
  "artist",
  "dish",
  "cuisine",
  "ingredient",
  "place_type",
  "place",
  "object",
  "brand",
  "activity",
  "club",
  "axis_pair",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_STATUSES = ["active", "merged", "quarantine"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export const JUDGMENT_KINDS = ["duel", "sort", "verdict", "axis"] as const;
export type JudgmentKind = (typeof JUDGMENT_KINDS)[number];

export const VERDICT_LEVELS = [
  "loved",
  "liked",
  "meh",
  "hated",
  "unknown",
  "not_for_me",
] as const;
export type VerdictLevel = (typeof VERDICT_LEVELS)[number];
