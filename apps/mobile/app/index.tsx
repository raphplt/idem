import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RatingSession } from "@/components/RatingSession";

export const ONBOARDED_KEY = "idem.onboarded";

export default function RatingScreen() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === "1"));
  }, []);

  if (onboarded === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.screen}>
      <RatingSession />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0d0d12",
    padding: 24,
    paddingTop: 80,
  },
  center: {
    flex: 1,
    backgroundColor: "#0d0d12",
    alignItems: "center",
    justifyContent: "center",
  },
});
