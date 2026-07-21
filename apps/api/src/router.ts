import { router } from "./trpc";
import { userRouter } from "./modules/user/router";
import { entityRouter } from "./modules/entity/router";
import { judgmentRouter } from "./modules/judgment/router";
import { sessionRouter } from "./modules/session/router";
import { passportRouter } from "./modules/passport/router";

export const appRouter = router({
  user: userRouter,
  entity: entityRouter,
  judgment: judgmentRouter,
  session: sessionRouter,
  passport: passportRouter,
});

export type AppRouter = typeof appRouter;
