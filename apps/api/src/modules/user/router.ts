import { publicProcedure, router } from "../../trpc";
import { createAnonymousUser } from "./repository";

export const userRouter = router({
  /** Compte anonyme de dev — l'inscription n'arrive qu'en fin d'onboarding (SPEC.md §6). */
  anonymous: publicProcedure.mutation(async ({ ctx }) => ({
    userId: await createAnonymousUser(ctx.db),
  })),
});
