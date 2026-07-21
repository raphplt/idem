import { TUNING } from "@idem/shared";

/**
 * Moteur de score Glicko-1 simplifié — SPEC.md §4.1.
 * Un score latent + une incertitude (RD) par (utilisateur, entité).
 * L'incertitude est ce qui pilote la sélection active (§5), d'où Glicko plutôt qu'Elo.
 */

const { Q, MIN_RD, INITIAL_RD, VERDICT_ANCHORS, VERDICT_STEP, VERDICT_RD_DECAY } =
  TUNING.rating;

export type Rating = { rating: number; rd: number };

function g(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));
}

function expectedScore(a: Rating, b: Rating): number {
  return 1 / (1 + Math.pow(10, (-g(b.rd) * (a.rating - b.rating)) / 400));
}

/**
 * Met à jour `a` après un duel contre `b`.
 * @param outcome 1 si `a` gagne, 0 si `a` perd.
 * @param scale   réduit l'impact (utilisé par le tri décomposé en paires, SORT_UPDATE_SCALE).
 */
export function duelUpdate(a: Rating, b: Rating, outcome: 0 | 1, scale = 1): Rating {
  const e = expectedScore(a, b);
  const gB = g(b.rd);
  const dSquared = 1 / (Q * Q * gB * gB * e * (1 - e));
  const denom = 1 / (a.rd * a.rd) + 1 / dSquared;
  const delta = ((Q / denom) * gB * (outcome - e)) * scale;
  const newRd = Math.sqrt(1 / denom);
  return {
    rating: a.rating + delta,
    rd: Math.max(MIN_RD, a.rd + (newRd - a.rd) * scale),
  };
}

/**
 * Verdict : ancrage direct sur une échelle fixe, incertitude réduite plus
 * faiblement qu'un duel. `unknown` ne passe jamais ici (aucun effet de score).
 */
export function verdictUpdate(a: Rating, level: string): Rating {
  const anchor = VERDICT_ANCHORS[level];
  if (anchor === undefined) return a;
  const step = VERDICT_STEP * Math.min(1, a.rd / INITIAL_RD);
  return {
    rating: a.rating + (anchor - a.rating) * step,
    rd: Math.max(MIN_RD, a.rd * VERDICT_RD_DECAY),
  };
}
