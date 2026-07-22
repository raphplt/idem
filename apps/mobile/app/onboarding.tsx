import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RatingSession } from "@/components/RatingSession";
import { ONBOARDED_KEY } from "./index";

/**
 * Onboarding — SPEC.md §6 : 60 à 90 secondes, axes d'abord puis duels
 * multi-domaines très connus, jauge visible, AUCUNE inscription demandée.
 * La sortie mène au passeport : la récompense, c'est de se voir.
 */

const TARGET = 20;

export default function OnboardingScreen() {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDED_KEY, "1");
    router.replace("/passport");
  }

  if (!started) {
    return (
      <View style={styles.intro}>
        <Text style={styles.title}>idem</Text>
        <Text style={styles.pitch}>
          Réponds à quelques questions — ce que tu préfères, ce que tu adores,
          ce que tu détestes. Ton passeport de goût se construit tout seul.
        </Text>
        <Pressable style={styles.cta} onPress={() => setStarted(true)}>
          <Text style={styles.ctaText}>Commencer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          {Math.min(count, TARGET)}/{TARGET}
        </Text>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>
      <RatingSession onboarding onAnswered={setCount} />
      {count >= TARGET && (
        <Pressable style={styles.cta} onPress={finish}>
          <Text style={styles.ctaText}>Voir mon passeport</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0d0d12",
    padding: 24,
    paddingTop: 64,
    gap: 12,
  },
  intro: {
    flex: 1,
    backgroundColor: "#0d0d12",
    padding: 32,
    justifyContent: "center",
    gap: 24,
  },
  title: { color: "#ffffff", fontSize: 44, fontWeight: "800" },
  pitch: { color: "#b9b9c7", fontSize: 17, lineHeight: 26 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progress: { color: "#8a8a99", fontSize: 14, fontWeight: "600" },
  skip: { color: "#666675", fontSize: 14 },
  cta: {
    backgroundColor: "#7dd87d",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: "#0d0d12", fontSize: 16, fontWeight: "700" },
});
