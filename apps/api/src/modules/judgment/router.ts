import { submitJudgmentInput } from "@idem/contracts";
import { authedProcedure, router } from "../../trpc";
import { submitJudgment } from "./service";

export const judgmentRouter = router({
  submit: authedProcedure
    .input(submitJudgmentInput)
    .mutation(({ ctx, input }) => submitJudgment(ctx.db, ctx.userId, input)),
});
