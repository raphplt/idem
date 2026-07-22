import { nextQuestionInput } from "@idem/contracts";
import { authedProcedure, router } from "../../trpc";
import { nextQuestion } from "./service";

export const sessionRouter = router({
  next: authedProcedure
    .input(nextQuestionInput)
    .query(({ ctx, input }) =>
      nextQuestion(ctx.db, ctx.userId, input.recentDomains, input.onboarding),
    ),
});
