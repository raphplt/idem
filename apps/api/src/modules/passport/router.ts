import { authedProcedure, router } from "../../trpc";
import { passportPrecision, passportSummary } from "./service";

export const passportRouter = router({
  summary: authedProcedure.query(({ ctx }) =>
    passportSummary(ctx.db, ctx.userId),
  ),
  precision: authedProcedure.query(({ ctx }) =>
    passportPrecision(ctx.db, ctx.userId),
  ),
});
