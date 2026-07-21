import { sql, type DbLike } from "@idem/db";
import type { Domain, EntityType } from "@idem/shared";

export async function countJudgments(db: DbLike, userId: string): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as c from judgments where user_id = ${userId}
  `)) as unknown as Array<{ c: number }>;
  return rows[0]?.c ?? 0;
}

export async function judgmentCountsByDomain(
  db: DbLike,
  userId: string,
): Promise<Map<Domain, number>> {
  const rows = (await db.execute(sql`
    select e.domain, count(*)::int as c
    from judgments j
    join entities e on e.id = j.entity_id
    where j.user_id = ${userId}
    group by e.domain
  `)) as unknown as Array<{ domain: Domain; c: number }>;
  return new Map(rows.map((r) => [r.domain, r.c]));
}

/** Par domaine : nombre d'entités jugées et RD moyen (matière de la jauge de précision). */
export async function scoreStatsByDomain(
  db: DbLike,
  userId: string,
): Promise<Map<Domain, { n: number; avgRd: number }>> {
  const rows = (await db.execute(sql`
    select domain, count(*)::int as n, avg(rd)::float as avg_rd
    from user_entity_scores
    where user_id = ${userId} and games > 0
    group by domain
  `)) as unknown as Array<{ domain: Domain; n: number; avg_rd: number }>;
  return new Map(rows.map((r) => [r.domain, { n: r.n, avgRd: r.avg_rd }]));
}

/** Paires d'axes : répondues par l'utilisateur / actives au total. */
export async function axisCoverage(
  db: DbLike,
  userId: string,
): Promise<{ answered: number; total: number }> {
  const rows = (await db.execute(sql`
    select
      (select count(distinct entity_id)::int from judgments
        where user_id = ${userId} and kind = 'axis') as answered,
      (select count(*)::int from entities
        where type = 'axis_pair' and status = 'active') as total
  `)) as unknown as Array<{ answered: number; total: number }>;
  return rows[0] ?? { answered: 0, total: 0 };
}

export type RankedRow = {
  id: string;
  canonical_name: string;
  domain: Domain;
  type: EntityType;
  attributes: Record<string, unknown>;
  rating: number;
};

export async function rankedEntities(
  db: DbLike,
  userId: string,
  domain: Domain,
  opts: { minGames: number; limit: number; direction: "desc" | "asc" },
): Promise<RankedRow[]> {
  const order = opts.direction === "desc" ? sql`desc` : sql`asc`;
  const rows = (await db.execute(sql`
    select e.id, e.canonical_name, e.domain, e.type, e.attributes, s.rating
    from user_entity_scores s
    join entities e on e.id = s.entity_id
    where s.user_id = ${userId}
      and s.domain = ${domain}
      and s.games >= ${opts.minGames}
      and e.status = 'active'
      and e.type <> 'axis_pair'
    order by s.rating ${order}
    limit ${opts.limit}
  `)) as unknown as RankedRow[];
  return rows;
}
