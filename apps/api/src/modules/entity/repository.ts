import { entities, eq, type DbLike } from "@idem/db";
import type { QuestionEntity } from "@idem/contracts";
import type { Domain, EntityType } from "@idem/shared";

export type EntityRow = typeof entities.$inferSelect;

export function toQuestionEntity(e: {
  id: string;
  canonicalName: string;
  domain: string;
  type: string;
  attributes: Record<string, unknown>;
}): QuestionEntity {
  return {
    id: e.id,
    name: e.canonicalName,
    domain: e.domain as Domain,
    type: e.type as EntityType,
    attributes: e.attributes,
  };
}

export async function getEntityById(
  db: DbLike,
  id: string,
): Promise<EntityRow | null> {
  const rows = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getChildren(
  db: DbLike,
  parentId: string,
  limit = 200,
): Promise<Array<{ id: string; domain: Domain }>> {
  const rows = await db
    .select({ id: entities.id, domain: entities.domain })
    .from(entities)
    .where(eq(entities.parentId, parentId))
    .limit(limit);
  return rows;
}
