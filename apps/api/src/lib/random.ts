/** Petits utilitaires d'échantillonnage pour la sélection active. */

export function weightedPick<K extends string>(weights: Record<K, number>): K {
  const entries = (Object.entries(weights) as [K, number][]).filter(
    ([, w]) => w > 0,
  );
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

export function sample<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function sampleTwo<T>(items: T[]): [T, T] {
  const i = Math.floor(Math.random() * items.length);
  let j = Math.floor(Math.random() * (items.length - 1));
  if (j >= i) j += 1;
  return [items[i]!, items[j]!];
}

export function countOccurrences<T>(items: readonly T[], value: T): number {
  return items.reduce((acc, it) => (it === value ? acc + 1 : acc), 0);
}
