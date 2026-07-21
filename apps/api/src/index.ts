import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { createDb } from "@idem/db";
import { env } from "./env";
import { appRouter } from "./router";

const db = createDb(env.DATABASE_URL);

const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true }));
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => ({
      db,
      userId: c.req.header("x-user-id") ?? null,
    }),
  }),
);

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.log(`[idem/api] écoute sur http://localhost:${info.port}`);
});

export type { AppRouter } from "./router";
