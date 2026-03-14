import type { AnalyzerOutput } from "../pose/analyzer";

export interface MovementResult {
  module: "movement";
  intensity: "still" | "low" | "medium" | "high";
  activeZones: string[];
  dominantRegion: string | null;
  velocity: number;
  bodyVisibility: number;
}

const THRESHOLDS = {
  still:  0.02,
  low:    0.08,
  medium: 0.20,
};

type RegionKey = keyof AnalyzerOutput["regions"];

const REGION_LABELS: Array<[RegionKey, string]> = [
  ["head",  "head / neck"],
  ["torso", "torso"],
  ["arms",  "arms"],
  ["hips",  "hips"],
  ["legs",  "legs"],
];

export function analyzeMovement(output: AnalyzerOutput): MovementResult {
  const { regions, overallMotion, visibilityScore } = output;

  const intensity: MovementResult["intensity"] =
    overallMotion < THRESHOLDS.still  ? "still"  :
    overallMotion < THRESHOLDS.low    ? "low"    :
    overallMotion < THRESHOLDS.medium ? "medium" : "high";

  const regionValues = REGION_LABELS.map(([key, label]) => ({
    label,
    value: regions[key],
  }));

  const maxValue = Math.max(...regionValues.map((r) => r.value));

  // Zones that are meaningfully active (≥40% of the highest-moving zone)
  const activeZones = regionValues
    .filter((r) => r.value > 0.05 && r.value >= maxValue * 0.4)
    .map((r) => r.label);

  // Dominant region — whichever has the most motion
  const top = regionValues.reduce(
    (best, r) => (r.value > best.value ? r : best),
    { label: "", value: -1 }
  );
  const dominantRegion = top.value > THRESHOLDS.still ? top.label : null;

  return {
    module: "movement",
    intensity,
    activeZones,
    dominantRegion,
    velocity: Math.round(overallMotion * 1000) / 1000,
    bodyVisibility: Math.round(visibilityScore * 100) / 100,
  };
}
