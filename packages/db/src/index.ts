import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

/** Helpers de requête ré-exportés : drizzle-orm reste une dépendance du seul package db. */
export { and, eq, inArray, sql } from "drizzle-orm";

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Accepté par les repositories : connexion ou transaction. */
export type DbLike = Db | Tx;
export * from "./schema";
