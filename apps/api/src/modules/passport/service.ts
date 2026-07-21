import type { Db } from "@idem/db";
import { MVP_DOMAINS, TUNING, type Domain } from "@idem/shared";
import type {
  PassportDomain,
  PassportPrecision,
  PassportSummary,
} from "@idem/contracts";
import {
  axisCoverage,
  countJudgments,
  judgmentCountsByDomain,
  rankedEntities,
  scoreStatsByDomain,
  type RankedRow,
} from "./repository";

function toEntry(row: RankedRow) {
  return {
    entity: {
      id: row.id,
      name: row.canonical_name,
      domain: row.domain,
      type: row.type,
      attributes: row.attributes,
    },
    rating: row.rating,
  };
}

/**
 * Vue passeport v0 : top / flop par domaine. Le profil est DÉRIVÉ, jamais
 * saisi (SPEC.md §1.4) — tout ici est un calcul sur les scores.
 */
export async function passportSummary(
  db: Db,
  userId: string,
): Promise<PassportSummary> {
  const { MIN_GAMES_FOR_DISPLAY, TOP_N } = TUNING.passport;
  const totalJudgments = await countJudgments(db, userId);
  const counts = await judgmentCountsByDomain(db, userId);

  const domains: PassportDomain[] = [];
  for (const domain of MVP_DOMAINS as readonly Domain[]) {
    const top = await rankedEntities(db, userId, domain, {
      minGames: MIN_GAMES_FOR_DISPLAY,
      limit: TOP_N,
      direction: "desc",
    });
    const topIds = new Set(top.map((r) => r.id));
    const flop = (
      await rankedEntities(db, userId, domain, {
        minGames: MIN_GAMES_FOR_DISPLAY,
        limit: TOP_N,
        direction: "asc",
      })
    ).filter((r) => !topIds.has(r.id));
    domains.push({
      domain,
      judgmentCount: counts.get(domain) ?? 0,
      top: top.map(toEntry),
      flop: flop.map(toEntry),
    });
  }
  return { totalJudgments, domains };
}

/**
 * Jauge de précision — VISION.md §6.5 : monte vite au début, ralentit,
 * n'atteint jamais 1. Par domaine catalogue : couverture saturante n/(n+SAT)
 * × certitude moyenne (1 - RD/RD_initial). Pour l'abstrait : part des paires
 * actives répondues. Le global est la moyenne des domaines MVP — un domaine
 * vierge tire la jauge vers le bas, ce qui rouvre la carte à chaque nouveau
 * domaine.
 */
export async function passportPrecision(
  db: Db,
  userId: string,
): Promise<PassportPrecision> {
  const { PRECISION_SATURATION } = TUNING.passport;
  const { INITIAL_RD, MIN_RD } = TUNING.rating;
  const stats = await scoreStatsByDomain(db, userId);
  const axes = await axisCoverage(db, userId);

  const byDomain = (MVP_DOMAINS as readonly Domain[]).map((domain) => {
    if (domain === "abstrait") {
      const precision = axes.total === 0 ? 0 : axes.answered / axes.total;
      return { domain, precision };
    }
    const s = stats.get(domain);
    if (!s) return { domain, precision: 0 };
    const coverage = s.n / (s.n + PRECISION_SATURATION);
    const certainty = Math.min(
      1,
      Math.max(0, (INITIAL_RD - s.avgRd) / (INITIAL_RD - MIN_RD)),
    );
    return { domain, precision: coverage * certainty };
  });

  const global =
    byDomain.reduce((acc, d) => acc + d.precision, 0) / byDomain.length;
  return { global, byDomain };
}
