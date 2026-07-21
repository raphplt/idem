import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Db } from "@idem/db";

export type Context = {
  db: Db;
  /** Identité dev : header `x-user-id`. Better Auth remplacera ça (SPEC.md §7.2). */
  userId: string | null;
};

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Header x-user-id manquant — appeler user.anonymous d'abord.",
    });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
