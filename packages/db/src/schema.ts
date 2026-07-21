import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  DOMAINS,
  ENTITY_STATUSES,
  ENTITY_TYPES,
  JUDGMENT_KINDS,
  TUNING,
} from "@idem/shared";

export const domainEnum = pgEnum("domain", DOMAINS);
export const entityTypeEnum = pgEnum("entity_type", ENTITY_TYPES);
export const entityStatusEnum = pgEnum("entity_status", ENTITY_STATUSES);
export const judgmentKindEnum = pgEnum("judgment_kind", JUDGMENT_KINDS);

/**
 * Entité canonique typée et hiérarchique — SPEC.md §2.2.
 * N'entre en base que par le pipeline d'ingestion. Jamais de création directe.
 */
export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: entityTypeEnum("type").notNull(),
    domain: domainEnum("domain").notNull(),
    canonicalName: text("canonical_name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => entities.id),
    /** 0 = racine du domaine, croissant vers le spécifique. */
    level: smallint("level").notNull().default(1),
    aliases: text("aliases").array().notNull().default([]),
    externalIds: jsonb("external_ids")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    /** Clé de blocage générée à la normalisation, réutilisée par la dédup. */
    blockingKey: text("blocking_key"),
    embedding: vector("embedding", {
      dimensions: TUNING.vectors.EMBEDDING_DIM,
    }),
    popularity: real("popularity").notNull().default(0),
    qualityScore: real("quality_score").notNull().default(0.5),
    status: entityStatusEnum("status").notNull().default("quarantine"),
    mergedInto: uuid("merged_into"),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("entities_domain_status_idx").on(t.domain, t.status),
    index("entities_type_idx").on(t.type),
    index("entities_blocking_key_idx").on(t.blockingKey),
    index("entities_popularity_idx").on(t.popularity),
    index("entities_parent_idx").on(t.parentId),
    index("entities_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Compte anonyme au départ ; l'auth réelle (Better Auth) arrive plus tard. */
  handle: text("handle").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Jugements — SPEC.md §3. APPEND-ONLY : on n'écrase jamais, on ajoute.
 * Aucun UPDATE/DELETE sur cette table, nulle part.
 */
export const judgments = pgTable(
  "judgments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    kind: judgmentKindEnum("kind").notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    /** session_id, position, response_time_ms — le temps de réponse est stocké. */
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("judgments_user_entity_idx").on(t.userId, t.entityId),
    index("judgments_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/**
 * Score latent par (utilisateur, entité) — SPEC.md §4.1.
 * État DÉRIVÉ des jugements (recalculable), pas de la donnée métier première.
 */
export const userEntityScores = pgTable(
  "user_entity_scores",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    /** Dénormalisé pour les requêtes par domaine (top/flop, sélection). */
    domain: domainEnum("domain").notNull(),
    rating: real("rating").notNull().default(TUNING.rating.INITIAL_RATING),
    /** Incertitude (RD Glicko) — pilote la sélection active. */
    rd: real("rd").notNull().default(TUNING.rating.INITIAL_RD),
    games: integer("games").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entityId] }),
    index("scores_user_domain_rating_idx").on(t.userId, t.domain, t.rating),
  ],
);
