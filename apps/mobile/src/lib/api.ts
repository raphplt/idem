import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@idem/api";

/**
 * Client tRPC typé de bout en bout : AppRouter est importé en type-only
 * depuis l'API (aucun code serveur dans le bundle), les formes de données
 * viennent de @idem/contracts (SPEC.md §7.1).
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3210";
const USER_KEY = "idem.userId";

let userId: string | null = null;

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      transformer: superjson,
      headers: () => (userId ? { "x-user-id": userId } : {}),
    }),
  ],
});

/** Identité anonyme persistée localement — l'inscription arrive après l'onboarding. */
export async function ensureUser(): Promise<string> {
  if (userId) return userId;
  const stored = await AsyncStorage.getItem(USER_KEY);
  if (stored) {
    userId = stored;
    return stored;
  }
  const fresh = await trpc.user.anonymous.mutate();
  userId = fresh.userId;
  await AsyncStorage.setItem(USER_KEY, fresh.userId);
  return fresh.userId;
}
