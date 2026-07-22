import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { TUNING, type Domain, type VerdictLevel } from "@idem/shared";
import type {
  NextQuestion,
  QuestionEntity,
  SubmitJudgmentInput,
} from "@idem/contracts";
import { ensureUser, trpc } from "@/lib/api";
import { SwipeCard } from "./SwipeCard";
import { SortRanker } from "./SortRanker";
import { PrecisionGauge } from "./PrecisionGauge";

/**
 * La boucle de notation complète : jauge de précision, question servie par la
 * sélection active, les 4 modes. Utilisée par l'écran principal et
 * l'onboarding (mode `onboarding` : axes d'abord, duels très connus).
 */

const VERDICT_LABELS: Array<{ level: VerdictLevel; label: string }> = [
  { level: "loved", label: "Adoré" },
  { level: "liked", label: "Bien" },
  { level: "meh", label: "Bof" },
  { level: "hated", label: "Détesté" },
  { level: "unknown", label: "Connais pas" },
  { level: "not_for_me", label: "Pas pour moi" },
];

function questionDomain(q: NextQuestion): Domain {
  return q.kind === "axis" ? "abstrait" : q.domain;
}

function entitySubtitle(e: QuestionEntity): string | null {
  const year = e.attributes["year"];
  const author = e.attributes["author"];
  const country = e.attributes["country"];
  if (typeof author === "string") return author;
  if (typeof country === "string") return country;
  return typeof year === "number" ? String(year) : null;
}

function entityImage(e: QuestionEntity): string | null {
  const image = e.attributes["image"];
  return typeof image === "string" ? image : null;
}

type Props = {
  onboarding?: boolean;
  onAnswered?: (total: number) => void;
};

export function RatingSession({ onboarding = false, onAnswered }: Props) {
  const recentDomains = useRef<Domain[]>([]);
  const sessionId = useRef(`s-${Math.random().toString(36).slice(2, 10)}`);
  const position = useRef(0);
  const shownAt = useRef(Date.now());
  const [answered, setAnswered] = useState(0);

  const user = useQuery({
    queryKey: ["user"],
    queryFn: ensureUser,
    staleTime: Infinity,
    retry: 1,
  });

  const question = useQuery({
    queryKey: ["next-question", onboarding],
    enabled: !!user.data,
    queryFn: () =>
      trpc.session.next.query({
        recentDomains: recentDomains.current.slice(
          -TUNING.selection.RECENT_DOMAINS_WINDOW,
        ),
        onboarding,
      }),
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (question.data) {
      shownAt.current = Date.now();
      recentDomains.current.push(questionDomain(question.data));
    }
  }, [question.data]);

  const precision = useQuery({
    queryKey: ["precision"],
    enabled: !!user.data,
    queryFn: () => trpc.passport.precision.query(),
  });

  const submit = useMutation({
    mutationFn: (input: SubmitJudgmentInput) =>
      trpc.judgment.submit.mutate(input),
    onSuccess: () => {
      setAnswered((n) => {
        onAnswered?.(n + 1);
        return n + 1;
      });
    },
    onSettled: () => {
      question.refetch();
      precision.refetch();
    },
  });

  const busy = submit.isPending || question.isFetching;

  function answer(input: Omit<SubmitJudgmentInput, "context">) {
    if (busy) return;
    submit.mutate({
      ...input,
      context: {
        session_id: sessionId.current,
        position: position.current++,
        response_time_ms: Date.now() - shownAt.current,
      },
    } as SubmitJudgmentInput);
  }

  if (user.isPending || (question.isPending && !question.error)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (user.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>API injoignable.</Text>
        <Text style={styles.hint}>
          Lancer `pnpm dev:api` (port 3210) et vérifier EXPO_PUBLIC_API_URL.
        </Text>
      </View>
    );
  }

  if (question.error || !question.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Pas de question disponible.</Text>
        <Text style={styles.hint}>
          Catalogue vide ? Lancer le pipeline d'ingestion (voir README), puis :
        </Text>
        <Pressable style={styles.button} onPress={() => question.refetch()}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const q = question.data;

  return (
    <View style={styles.session}>
      <PrecisionGauge value={precision.data?.global ?? 0} />
      <Text style={styles.domainTag}>
        {questionDomain(q)} · {answered} réponses
      </Text>

      {q.kind === "duel" && (
        <>
          <Text style={styles.prompt}>Tu préfères ?</Text>
          {[q.a, q.b].map((e) => (
            <SwipeCard
              key={e.id}
              title={e.name}
              subtitle={entitySubtitle(e)}
              imageUrl={entityImage(e)}
              disabled={busy}
              onChoose={() =>
                answer({
                  kind: "duel",
                  entityId: q.a.id,
                  value: { opponent_id: q.b.id, winner_id: e.id },
                })
              }
            />
          ))}
        </>
      )}

      {q.kind === "verdict" && (
        <>
          <Text style={styles.prompt}>Ton verdict ?</Text>
          <View style={styles.card}>
            {entityImage(q.entity) && (
              <Image
                source={{ uri: entityImage(q.entity)! }}
                style={styles.cardImage}
                contentFit="cover"
                transition={150}
              />
            )}
            <Text style={styles.cardTitle}>{q.entity.name}</Text>
            {entitySubtitle(q.entity) && (
              <Text style={styles.cardSub}>{entitySubtitle(q.entity)}</Text>
            )}
          </View>
          <View style={styles.verdictGrid}>
            {VERDICT_LABELS.map(({ level, label }) => (
              <Pressable
                key={level}
                style={[styles.verdictButton, busy && styles.disabled]}
                onPress={() =>
                  answer({
                    kind: "verdict",
                    entityId: q.entity.id,
                    value: { level },
                  })
                }
              >
                <Text style={styles.buttonText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {q.kind === "axis" && (
        <>
          <Text style={styles.prompt}>Plutôt...</Text>
          {(["a", "b"] as const).map((side) => (
            <SwipeCard
              key={`${q.pair.id}-${side}`}
              title={String(q.pair.attributes[side] ?? side)}
              disabled={busy}
              onChoose={() =>
                answer({
                  kind: "axis",
                  entityId: q.pair.id,
                  value: { pair_id: q.pair.id, side, strength: 2 },
                })
              }
            />
          ))}
        </>
      )}

      {q.kind === "sort" && (
        <>
          <Text style={styles.prompt}>Classe-les, du préféré au pire</Text>
          <SortRanker
            entities={q.entities}
            disabled={busy}
            onSubmit={(orderedIds) =>
              answer({
                kind: "sort",
                entityId: orderedIds[0]!,
                value: { ordered_ids: orderedIds },
              })
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  session: { flex: 1, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  domainTag: {
    color: "#8a8a99",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  prompt: { color: "#ffffff", fontSize: 24, fontWeight: "700" },
  card: {
    backgroundColor: "#1c1c26",
    borderRadius: 16,
    padding: 24,
    minHeight: 110,
    justifyContent: "center",
  },
  cardImage: {
    width: 72,
    height: 104,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#12121a",
  },
  disabled: { opacity: 0.5 },
  cardTitle: { color: "#ffffff", fontSize: 20, fontWeight: "600" },
  cardSub: { color: "#8a8a99", fontSize: 14, marginTop: 4 },
  verdictGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  verdictButton: {
    backgroundColor: "#1c1c26",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  button: {
    backgroundColor: "#2d2d3d",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  error: { color: "#ff6b6b", fontSize: 17, fontWeight: "600" },
  hint: { color: "#8a8a99", fontSize: 14, textAlign: "center" },
});
