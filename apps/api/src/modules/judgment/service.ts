import { TRPCError } from "@trpc/server";
import type { Db, DbLike } from "@idem/db";
import { TUNING } from "@idem/shared";
import type { SubmitJudgmentInput } from "@idem/contracts";
import { duelUpdate, verdictUpdate, type Rating } from "../../engine/rating";
import { getChildren, getEntityById, type EntityRow } from "../entity/repository";
import {
  adjustRating,
  getEntitiesByIds,
  getScoreOrInit,
  insertJudgment,
  setScore,
} from "./repository";

/**
 * Soumission d'un jugement — SPEC.md §3 et §4.
 * 1. Le jugement est TOUJOURS inséré tel quel (append-only, c'est l'actif).
 * 2. Le score dérivé est mis à jour selon le mode.
 * 3. Le delta se propage le long de la hiérarchie (§4.3).
 */
export async function submitJudgment(
  db: Db,
  userId: string,
  input: SubmitJudgmentInput,
): Promise<{ ok: true }> {
  await db.transaction(async (tx) => {
    await insertJudgment(tx, {
      userId,
      entityId: input.entityId,
      kind: input.kind,
      value: input.value,
      context: input.context ?? {},
    });

    switch (input.kind) {
      case "duel":
        await applyDuel(tx, userId, input);
        break;
      case "sort":
        await applySort(tx, userId, input);
        break;
      case "verdict":
        await applyVerdict(tx, userId, input);
        break;
      case "axis":
        // Aucun score par entité : les axes alimentent le vecteur (batch, Phase 3).
        if (input.value.pair_id !== input.entityId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "value.pair_id doit être l'entité jugée.",
          });
        }
        break;
    }
  });
  return { ok: true };
}

async function requireEntity(db: DbLike, id: string): Promise<EntityRow> {
  const e = await getEntityById(db, id);
  if (!e || e.status !== "active") {
    throw new TRPCError({ code: "NOT_FOUND", message: `Entité inconnue ou inactive : ${id}` });
  }
  return e;
}

async function applyDuel(
  db: DbLike,
  userId: string,
  input: Extract<SubmitJudgmentInput, { kind: "duel" }>,
) {
  const { opponent_id, winner_id } = input.value;
  if (winner_id !== input.entityId && winner_id !== opponent_id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "winner_id doit être l'une des deux entités du duel.",
    });
  }
  const a = await requireEntity(db, input.entityId);
  const b = await requireEntity(db, opponent_id);
  const sa = await getScoreOrInit(db, userId, a.id);
  const sb = await getScoreOrInit(db, userId, b.id);
  const outcomeA = winner_id === a.id ? 1 : 0;
  // Mise à jour simultanée : les deux nouveaux scores sont calculés sur les anciens.
  const na = duelUpdate(sa, sb, outcomeA as 0 | 1);
  const nb = duelUpdate(sb, sa, (1 - outcomeA) as 0 | 1);
  await setScore(db, { userId, entityId: a.id, domain: a.domain, ...na, gamesInc: 1 });
  await setScore(db, { userId, entityId: b.id, domain: b.domain, ...nb, gamesInc: 1 });
  await propagate(db, userId, a, na.rating - sa.rating);
  await propagate(db, userId, b, nb.rating - sb.rating);
}

async function applyVerdict(
  db: DbLike,
  userId: string,
  input: Extract<SubmitJudgmentInput, { kind: "verdict" }>,
) {
  // `unknown` : aucun effet de score, mais le jugement est stocké — il exclut
  // l'entité des propositions futures et alimente la découverte (SPEC.md §4.1).
  if (input.value.level === "unknown") return;
  const e = await requireEntity(db, input.entityId);
  const s = await getScoreOrInit(db, userId, e.id);
  const n = verdictUpdate(s, input.value.level);
  await setScore(db, { userId, entityId: e.id, domain: e.domain, ...n, gamesInc: 1 });
  await propagate(db, userId, e, n.rating - s.rating);
}

async function applySort(
  db: DbLike,
  userId: string,
  input: Extract<SubmitJudgmentInput, { kind: "sort" }>,
) {
  const ids = input.value.ordered_ids;
  const rows = await getEntitiesByIds(db, ids);
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (byId.size !== ids.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entité du tri inconnue." });
  }
  // Décomposition en duels par paires ordonnées, impact réduit (SPEC.md §4.1).
  const scores = new Map<string, Rating>();
  for (const id of ids) scores.set(id, await getScoreOrInit(db, userId, id));
  const initial = new Map([...scores].map(([id, s]) => [id, s.rating]));
  const scale = TUNING.rating.SORT_UPDATE_SCALE;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const wId = ids[i]!;
      const lId = ids[j]!;
      const w = scores.get(wId)!;
      const l = scores.get(lId)!;
      scores.set(wId, duelUpdate(w, l, 1, scale));
      scores.set(lId, duelUpdate(l, w, 0, scale));
    }
  }
  for (const id of ids) {
    const e = byId.get(id)!;
    const s = scores.get(id)!;
    await setScore(db, { userId, entityId: id, domain: e.domain, ...s, gamesInc: 1 });
    await propagate(db, userId, e, s.rating - initial.get(id)!);
  }
}

/**
 * Propagation hiérarchique — SPEC.md §4.3.
 * Remonte la chaîne des ancêtres avec α^saut, descend d'un seul saut vers les
 * enfants directs (au-delà, α² est négligeable).
 */
async function propagate(
  db: DbLike,
  userId: string,
  entity: EntityRow,
  delta: number,
) {
  if (delta === 0) return;
  const { ALPHA_PARENT, ALPHA_CHILD, MAX_ANCESTOR_HOPS } = TUNING.propagation;

  let current = entity;
  let factor = 1;
  for (let hop = 0; hop < MAX_ANCESTOR_HOPS && current.parentId; hop++) {
    const parent = await getEntityById(db, current.parentId);
    if (!parent) break;
    factor *= ALPHA_PARENT;
    await adjustRating(db, {
      userId,
      entityId: parent.id,
      domain: parent.domain,
      delta: delta * factor,
    });
    current = parent;
  }

  const children = await getChildren(db, entity.id);
  for (const child of children) {
    await adjustRating(db, {
      userId,
      entityId: child.id,
      domain: child.domain,
      delta: delta * ALPHA_CHILD,
    });
  }
}
