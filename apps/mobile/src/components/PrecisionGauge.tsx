import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/**
 * Jauge de précision du profil (VISION.md §6.5). Elle doit bouger après
 * CHAQUE réponse — c'est la conséquence visible de l'action.
 */
export function PrecisionGauge({ value }: { value: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, { duration: 600 });
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.label}>{Math.round(value * 100)} %</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", gap: 10 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22222e",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#7dd87d",
  },
  label: { color: "#8a8a99", fontSize: 12, width: 40, textAlign: "right" },
});
