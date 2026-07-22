import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { QuestionEntity } from "@idem/contracts";

/**
 * Tri par tap-to-rank : on tape les entités dans l'ordre de préférence,
 * chaque tap attribue le rang suivant, re-taper une entité classée la
 * déclasse. Version v0 — le drag-and-drop viendra si le tap ne suffit pas.
 */

type Props = {
  entities: QuestionEntity[];
  disabled?: boolean;
  onSubmit: (orderedIds: string[]) => void;
};

export function SortRanker({ entities, disabled, onSubmit }: Props) {
  const [ranked, setRanked] = useState<string[]>([]);

  function toggle(id: string) {
    Haptics.selectionAsync();
    setRanked((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  const complete = ranked.length === entities.length;

  return (
    <View style={styles.wrapper}>
      {entities.map((e) => {
        const rank = ranked.indexOf(e.id);
        return (
          <Pressable
            key={e.id}
            style={[
              styles.item,
              rank >= 0 && styles.itemRanked,
              disabled && styles.itemDisabled,
            ]}
            disabled={disabled}
            onPress={() => toggle(e.id)}
          >
            <View style={[styles.badge, rank >= 0 && styles.badgeActive]}>
              <Text style={styles.badgeText}>{rank >= 0 ? rank + 1 : "·"}</Text>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>
              {e.name}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.actions}>
        <Pressable
          style={styles.secondary}
          disabled={disabled || ranked.length === 0}
          onPress={() => setRanked([])}
        >
          <Text style={styles.secondaryText}>Recommencer</Text>
        </Pressable>
        <Pressable
          style={[styles.submit, (!complete || disabled) && styles.itemDisabled]}
          disabled={!complete || disabled}
          onPress={() => onSubmit(ranked)}
        >
          <Text style={styles.submitText}>Valider</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1c1c26",
    borderRadius: 12,
    padding: 16,
  },
  itemRanked: { backgroundColor: "#242433" },
  itemDisabled: { opacity: 0.5 },
  itemName: { color: "#ffffff", fontSize: 16, fontWeight: "600", flexShrink: 1 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2d2d3d",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: { backgroundColor: "#7dd87d" },
  badgeText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  secondary: {
    flex: 1,
    backgroundColor: "#1c1c26",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#8a8a99", fontSize: 15, fontWeight: "600" },
  submit: {
    flex: 2,
    backgroundColor: "#7dd87d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#0d0d12", fontSize: 15, fontWeight: "700" },
});
