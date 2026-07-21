import { users, type DbLike } from "@idem/db";

export async function createAnonymousUser(db: DbLike): Promise<string> {
  const rows = await db.insert(users).values({}).returning({ id: users.id });
  return rows[0]!.id;
}
