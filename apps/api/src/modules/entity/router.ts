import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { getQuestionEntity } from "./service";

export const entityRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => getQuestionEntity(ctx.db, input.id)),
});
