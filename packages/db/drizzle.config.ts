import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env" });
config();

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? "postgres://idem:idem@localhost:5433/idem",
  },
});
