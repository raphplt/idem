import { config } from "dotenv";

// .env racine du monorepo, puis .env local éventuel.
config({ path: "../../.env" });
config();

export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgres://idem:idem@localhost:5433/idem",
  API_PORT: Number(process.env.API_PORT ?? 3000),
};
