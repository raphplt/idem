import { useWindowDimensions, StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

/**
 * Carte de duel gestuelle — Phase 1 (SPECS.md §8) : swipe horizontal pour
 * choisir, retour haptique, tap accepté aussi. 60 fps est une contrainte
 * (SPECS.md §9.14) : tout le mouvement vit sur le thread UI (worklets),
 * seul le choix final repasse en JS.
 */

const SWIPE_RATIO = 0.3; // fraction de la largeur d'écran pour valider

type Props = {
  title: string;
  subtitle?: string | null;
  disabled?: boolean;
  onChoose: () => void;
};

export function SwipeCard({ title, subtitle, disabled, onChoose }: Props) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const pressed = useSharedValue(false);

  const choose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChoose();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      pressed.value = true;
    })
    .onChange((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > width * SWIPE_RATIO) {
        translateX.value = withTiming(Math.sign(e.translationX) * width, {
          duration: 160,
        });
        runOnJS(choose)();
      } else {
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      pressed.value = false;
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(choose)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${translateX.value / 30}deg` },
      { scale: withSpring(pressed.value ? 0.97 : 1) },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <Animated.View
        style={[styles.card, disabled && styles.cardDisabled, animatedStyle]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1c1c26",
    borderRadius: 16,
    padding: 24,
    minHeight: 110,
    justifyContent: "center",
  },
  cardDisabled: { opacity: 0.5 },
  cardTitle: { color: "#ffffff", fontSize: 20, fontWeight: "600" },
  cardSub: { color: "#8a8a99", fontSize: 14, marginTop: 4 },
});
