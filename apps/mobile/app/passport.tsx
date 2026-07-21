import { useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Domain } from "@idem/shared";
import { ensureUser, trpc } from "@/lib/api";

/**
 * Passeport v0 : top / flop par domaine — brut, la version « belle »
 * (carte de goût, rareté, export image) arrive en Phase 3.
 */

const DOMAIN_LABELS: Record<Domain, string> = {
  cinema: "Cinéma",
  musique: "Musique",
  bouffe: "Bouffe",
  lieu: "Lieux",
  livre: "Livres",
  jeu: "Jeux",
  objet: "Objets",
  sport: "Sport",
  abstrait: "Abstrait",
};

export default function PassportScreen() {
  const passport = useQuery({
    queryKey: ["passport"],
    queryFn: async () => {
      await ensureUser();
      return trpc.passport.summary.query();
    },
  });

  useFocusEffect(
    useCallback(() => {
      passport.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (passport.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (passport.error || !passport.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Passeport indisponible — API joignable ?</Text>
      </View>
    );
  }

  const { totalJudgments, domains } = passport.data;
  const filled = domains.filter((d) => d.judgmentCount > 0);
  const empty = domains.filter((d) => d.judgmentCount === 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ton passeport</Text>
      <Text style={styles.subtitle}>{totalJudgments} jugements</Text>

      {filled.length === 0 && (
        <Text style={styles.hint}>
          Rien encore — va noter quelques duels, ton passeport se construit tout
          seul.
        </Text>
      )}

      {filled.map((d) => (
        <View key={d.domain} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {DOMAIN_LABELS[d.domain]}{" "}
            <Text style={styles.sectionCount}>· {d.judgmentCount}</Text>
          </Text>
          {d.top.map((t) => (
            <View key={t.entity.id} style={styles.row}>
              <Text style={styles.rowBadgeTop}>♥</Text>
              <Text style={styles.rowName} numberOfLines={1}>
                {t.entity.name}
              </Text>
            </View>
          ))}
          {d.flop.map((f) => (
            <View key={f.entity.id} style={styles.row}>
              <Text style={styles.rowBadgeFlop}>✕</Text>
              <Text style={styles.rowName} numberOfLines={1}>
                {f.entity.name}
              </Text>
            </View>
          ))}
          {d.top.length === 0 && d.flop.length === 0 && (
            <Text style={styles.hint}>
              Pas encore assez de données dans ce domaine.
            </Text>
          )}
        </View>
      ))}

      {empty.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zones vierges</Text>
          <Text style={styles.hint}>
            {empty.map((d) => DOMAIN_LABELS[d.domain]).join(" · ")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d0d12" },
  content: { padding: 24, paddingTop: 80, gap: 20 },
  center: {
    flex: 1,
    backgroundColor: "#0d0d12",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#ffffff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#8a8a99", fontSize: 15, marginTop: -12 },
  section: {
    backgroundColor: "#15151d",
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  sectionTitle: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  sectionCount: { color: "#8a8a99", fontWeight: "400" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBadgeTop: { color: "#7dd87d", fontSize: 14, width: 18 },
  rowBadgeFlop: { color: "#ff6b6b", fontSize: 14, width: 18 },
  rowName: { color: "#d5d5e0", fontSize: 15, flexShrink: 1 },
  hint: { color: "#8a8a99", fontSize: 14 },
});
