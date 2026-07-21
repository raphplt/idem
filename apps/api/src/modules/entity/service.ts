import type { DbLike } from "@idem/db";
import type { QuestionEntity } from "@idem/contracts";
import { getEntityById, toQuestionEntity } from "./repository";

export async function getQuestionEntity(
  db: DbLike,
  id: string,
): Promise<QuestionEntity | null> {
  const row = await getEntityById(db, id);
  if (!row || row.status !== "active") return null;
  return toQuestionEntity(row);
}
