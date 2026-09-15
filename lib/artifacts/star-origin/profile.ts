import type {
  LineageProximityRow,
  StarOriginResult,
} from "./contract.ts";

export type ResonanceProfileRole =
  | "primary_line"
  | "co_primary_line"
  | "supporting_resonance";

export interface ResonanceProfileEntry {
  rank: 1 | 2 | 3;
  role: ResonanceProfileRole;
  row: LineageProximityRow;
}

export function resonanceRoleLabel(role: ResonanceProfileRole): string {
  if (role === "primary_line") return "Primary line";
  if (role === "co_primary_line") return "Co-primary line";
  return "Supporting resonance";
}

export function topThreeResonances(
  result: StarOriginResult,
  map: readonly LineageProximityRow[],
): readonly ResonanceProfileEntry[] {
  if (result.kind === "spread") {
    return map.slice(0, 3).map((row, index) => ({
      rank: (index + 1) as 1 | 2 | 3,
      role: "supporting_resonance" as const,
      row,
    }));
  }

  const namedIds =
    result.kind === "single"
      ? [result.primary.lineageId]
      : [result.primary.lineageId, result.secondary.lineageId];
  const rowsById = new Map(map.map((row) => [row.lineageId, row]));
  const orderedIds = [
    ...namedIds,
    ...map.map((row) => row.lineageId).filter((id) => !namedIds.includes(id)),
  ].slice(0, 3);

  return orderedIds.flatMap((lineageId, index) => {
    const row = rowsById.get(lineageId);
    if (!row) return [];
    const role: ResonanceProfileRole =
      result.kind === "paired" && index < 2
        ? "co_primary_line"
        : index === 0
          ? "primary_line"
          : "supporting_resonance";
    return [{ rank: (index + 1) as 1 | 2 | 3, role, row }];
  });
}
