import {
  and,
  entities,
  eq,
  inArray,
  judgments,
  sql,
  userEntityScores,
  type DbLike,
} from "@idem/db";
import { TUNING, type Domain, type JudgmentKind } from "@idem/shared";

/**
 * Repository des jugements. RÈGLE (SPEC.md §9.5) : append-only.
 * Ce fichier n'expose AUCUN update ni delete sur `judgments`.
 */

export async function insertJudgment(
  db: DbLike,
  row: {
    userId: string;
    entityId: string;
    kind: JudgmentKind;
    value: Record<string, unknown>;
    context: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(judgments).values(row);
}

export type Score = { rating: number; rd: number };

export async function getScore(
  db: DbLike,
  userId: string,
  entityId: string,
): Promise<Score | null> {
  const rows = await db
    .select({ rating: userEntityScores.rating, rd: userEntityScores.rd })
    .from(userEntityScores)
    .where(
      and(
        eq(userEntityScores.userId, userId),
        eq(userEntityScores.entityId, entityId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getScoreOrInit(
  db: DbLike,
  userId: string,
  entityId: string,
): Promise<Score> {
  return (
    (await getScore(db, userId, entityId)) ?? {
      rating: TUNING.rating.INITIAL_RATING,
      rd: TUNING.rating.INITIAL_RD,
    }
  );
}

/** Écrit un score absolu (issu du moteur) et incrémente le compteur de jugements. */
export async function setScore(
  db: DbLike,
  args: {
    userId: string;
    entityId: string;
    domain: Domain;
    rating: number;
    rd: number;
    gamesInc: number;
  },
): Promise<void> {
  await db
    .insert(userEntityScores)
    .values({
      userId: args.userId,
      entityId: args.entityId,
      domain: args.domain,
      rating: args.rating,
      rd: args.rd,
      games: args.gamesInc,
    })
    .onConflictDoUpdate({
      target: [userEntityScores.userId, userEntityScores.entityId],
      set: {
        rating: args.rating,
        rd: args.rd,
        games: sql`${userEntityScores.games} + ${args.gamesInc}`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Ajuste un rating par delta (propagation hiérarchique) sans toucher
 * l'incertitude ni le compteur : la propagation est un signal indirect.
 */
export async function adjustRating(
  db: DbLike,
  args: { userId: string; entityId: string; domain: Domain; delta: number },
): Promise<void> {
  await db
    .insert(userEntityScores)
    .values({
      userId: args.userId,
      entityId: args.entityId,
      domain: args.domain,
      rating: TUNING.rating.INITIAL_RATING + args.delta,
    })
    .onConflictDoUpdate({
      target: [userEntityScores.userId, userEntityScores.entityId],
      set: {
        rating: sql`${userEntityScores.rating} + ${args.delta}`,
        updatedAt: new Date(),
      },
    });
}

export async function getEntitiesByIds(db: DbLike, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(entities).where(inArray(entities.id, ids));
}
