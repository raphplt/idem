import { TRPCError } from "@trpc/server";
import type { Db } from "@idem/db";
import {
  CATALOG_DOMAINS,
  TUNING,
  type Domain,
  type JudgmentKind,
} from "@idem/shared";
import type { NextQuestion, QuestionEntity } from "@idem/contracts";
import { countOccurrences, sample, sampleTwo, weightedPick } from "../../lib/random";
import {
  axisCandidate,
  catalogCandidates,
  domainsWithActiveEntities,
  type CandidateRow,
} from "./repository";

function toQuestion(row: CandidateRow): QuestionEntity {
  return {
    id: row.id,
    name: row.canonical_name,
    domain: row.domain,
    type: row.type,
    attributes: row.attributes,
  };
}

/** Fatigue de domaine (SPEC.md §5) : malus par apparition récente. */
function pickDomain(available: Domain[], recent: readonly Domain[]): Domain {
  const weights = Object.fromEntries(
    available.map((d) => [
      d,
      Math.max(0.1, 1 - TUNING.selection.W_FATIGUE * countOccurrences(recent, d)),
    ]),
  ) as Record<Domain, number>;
  return weightedPick(weights);
}

/**
 * Sélection active, version simple de Phase 1 : mode tiré selon SESSION_MIX,
 * candidats scorés incertitude + popularité, repli en cascade si un mode
 * n'a pas de question disponible.
 */
export async function nextQuestion(
  db: Db,
  userId: string,
  recentDomains: Domain[],
): Promise<NextQuestion> {
  const preferred = weightedPick(TUNING.selection.SESSION_MIX) as JudgmentKind;
  const fallbacks: JudgmentKind[] = ["duel", "verdict", "axis"];
  const order = [preferred, ...fallbacks.filter((k) => k !== preferred)];

  const availableDomains = (await domainsWithActiveEntities(db)).filter((d) =>
    (CATALOG_DOMAINS as readonly Domain[]).includes(d),
  );

  for (const kind of order) {
    if (kind === "axis") {
      const pair = await axisCandidate(db, userId);
      if (pair) return { kind: "axis", pair: toQuestion(pair) };
      continue;
    }
    if (availableDomains.length === 0) continue;
    const domain = pickDomain(availableDomains, recentDomains);

    if (kind === "duel") {
      const pool = await catalogCandidates(db, userId, domain);
      if (pool.length >= 2) {
        const [a, b] = sampleTwo(pool);
        return { kind: "duel", domain, a: toQuestion(a), b: toQuestion(b) };
      }
    } else if (kind === "verdict") {
      const pool = await catalogCandidates(db, userId, domain, {
        excludeAlreadyVerdicted: true,
      });
      if (pool.length > 0) {
        return { kind: "verdict", domain, entity: toQuestion(sample(pool)) };
      }
    } else if (kind === "sort") {
      const pool = await catalogCandidates(db, userId, domain);
      if (pool.length >= TUNING.selection.SORT_SIZE) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return {
          kind: "sort",
          domain,
          entities: shuffled.slice(0, TUNING.selection.SORT_SIZE).map(toQuestion),
        };
      }
    }
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message:
      "Catalogue vide ou épuisé — lancer le pipeline d'ingestion (voir README).",
  });
}
