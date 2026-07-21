import { sql, type DbLike } from "@idem/db";
import { TUNING, type Domain, type EntityType } from "@idem/shared";

export type CandidateRow = {
  id: string;
  canonical_name: string;
  domain: Domain;
  type: EntityType;
  attributes: Record<string, unknown>;
};

/** Domaines catalogue ayant au moins une entité active proposable. */
export async function domainsWithActiveEntities(db: DbLike): Promise<Domain[]> {
  const rows = (await db.execute(sql`
    select e.domain
    from entities e
    where e.status = 'active' and e.type <> 'axis_pair'
    group by e.domain
  `)) as unknown as Array<{ domain: Domain }>;
  return rows.map((r) => r.domain);
}

/**
 * Vivier de candidats pour duel / verdict / tri — SPEC.md §5, version simple :
 * incertitude (RD normalisé) + popularité + bruit. Les entités marquées
 * `unknown` ou `not_for_me` ne sont jamais reproposées.
 */
export async function catalogCandidates(
  db: DbLike,
  userId: string,
  domain: Domain,
  opts: { excludeAlreadyVerdicted?: boolean; limit?: number } = {},
): Promise<CandidateRow[]> {
  const { W_UNCERTAINTY, W_POPULARITY, CANDIDATE_POOL } = TUNING.selection;
  const { INITIAL_RD } = TUNING.rating;
  const limit = opts.limit ?? CANDIDATE_POOL;

  const verdictFilter = opts.excludeAlreadyVerdicted
    ? sql`and not exists (
        select 1 from judgments j
        where j.user_id = ${userId} and j.entity_id = e.id and j.kind = 'verdict'
      )`
    : sql``;

  const rows = (await db.execute(sql`
    select e.id, e.canonical_name, e.domain, e.type, e.attributes
    from entities e
    left join user_entity_scores s
      on s.entity_id = e.id and s.user_id = ${userId}
    where e.domain = ${domain}
      and e.status = 'active'
      and e.type <> 'axis_pair'
      and not exists (
        select 1 from judgments j
        where j.user_id = ${userId}
          and j.entity_id = e.id
          and j.kind = 'verdict'
          and j.value->>'level' in ('unknown', 'not_for_me')
      )
      ${verdictFilter}
    order by (
      ${W_UNCERTAINTY} * coalesce(s.rd, ${INITIAL_RD}) / ${INITIAL_RD}
      + ${W_POPULARITY} * e.popularity
      + random() * 0.5
    ) desc
    limit ${limit}
  `)) as unknown as CandidateRow[];
  return rows;
}

/** Une paire d'axes active jamais jugée par cet utilisateur, au hasard. */
export async function axisCandidate(
  db: DbLike,
  userId: string,
): Promise<CandidateRow | null> {
  const rows = (await db.execute(sql`
    select e.id, e.canonical_name, e.domain, e.type, e.attributes
    from entities e
    where e.type = 'axis_pair'
      and e.status = 'active'
      and not exists (
        select 1 from judgments j
        where j.user_id = ${userId} and j.entity_id = e.id and j.kind = 'axis'
      )
    order by random()
    limit 1
  `)) as unknown as CandidateRow[];
  return rows[0] ?? null;
}
