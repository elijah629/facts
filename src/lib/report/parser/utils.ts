/// Last, First -> First Last
export function formatName(name: string) {
  const [last, first] = name.split(", ");
  return first.trim() + " " + last.trim();
}

export function normalizeWeights(weights: number[]): number[] {
  if (weights.some(x => isNaN(x))) {
    return weights.fill(1 / weights.length);
  }
  
  const total = weights.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return weights.fill(0);
  }

  return weights.map((x) => x / total);
}
