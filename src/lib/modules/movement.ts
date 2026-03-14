import { RollingAverage, type AnalyzerOutput } from "../pose/analyzer";

export interface MovementResult {
  module: "movement";
  intensity: "still" | "low" | "medium" | "high" | "very high";
  flags: string[];
  activeZones: string[];
  dominantRegion: string | null;
  velocityMs: number;  // real-world velocity in m/s
  direction: string | null; // dominant movement direction this frame
  bodyVisibility: number;
}

// Thresholds are calibrated for the ×20 amplification in regionMotion().
// Camera noise alone produces overallMotion ~0.02-0.04 even when perfectly still.
const THRESHOLDS = {
  still:  0.05,  // was 0.02 — raised to clear camera noise floor
  low:    0.14,  // was 0.08 — subtle motion (breathing, weight shift)
  medium:    0.30,  // was 0.20 — deliberate movement
  high:      0.55,  // fast / vigorous
  // very high = anything above 0.55 — running, jumping, intense exercise
};

// Smooth overallMotion over 10 frames so intensity label doesn't thrash on noise spikes
const _motionSmoothing = new RollingAverage(10);

// Longer baseline (30 frames ~1s) used to detect sudden bursts vs steady-state motion
const _motionBaseline = new RollingAverage(30);

// Track last frame timestamp to compute real frame delta for velocity
let _lastTimestamp = 0;

// Track hip centroid across frames for direction detection
let _lastHipCentroid: { x: number; y: number; z: number } | null = null;

type RegionKey = keyof AnalyzerOutput["regions"];

const REGION_LABELS: Array<[RegionKey, string]> = [
  ["head",  "head / neck"],
  ["torso", "torso"],
  ["arms",  "arms"],
  ["hips",  "hips"],
  ["legs",  "legs"],
];

export function analyzeMovement(output: AnalyzerOutput): MovementResult {
  const { regions, overallMotion, visibilityScore, bodyScale, timestamp, landmarks } = output;

  // Real m/s: overallMotion ÷ 20 removes the amplification, × bodyScale converts
  // normalized units to meters, ÷ frameDelta converts per-frame to per-second
  const frameDelta = _lastTimestamp > 0 ? (timestamp - _lastTimestamp) / 1000 : 0.033;
  _lastTimestamp = timestamp;
  const rawDisplacement = overallMotion / 20;
  const velocityMs = frameDelta > 0
    ? Math.round((rawDisplacement * bodyScale) / frameDelta * 100) / 100
    : 0;

  const smoothedMotion = _motionSmoothing.push(overallMotion);
  const baselineMotion = _motionBaseline.push(overallMotion);
  const intensity: MovementResult["intensity"] =
    smoothedMotion < THRESHOLDS.still  ? "still"     :
    smoothedMotion < THRESHOLDS.low    ? "low"       :
    smoothedMotion < THRESHOLDS.medium ? "medium"    :
    smoothedMotion < THRESHOLDS.high   ? "high"      : "very high";

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

  // Direction — track hip centroid displacement between frames
  const lh = landmarks[23] ?? { x: 0, y: 0, z: 0 };
  const rh = landmarks[24] ?? { x: 0, y: 0, z: 0 };
  const hipCentroid = {
    x: (lh.x + rh.x) / 2,
    y: (lh.y + rh.y) / 2,
    z: (lh.z + rh.z) / 2,
  };

  let direction: string | null = null;
  if (_lastHipCentroid && intensity !== "still") {
    const dx = hipCentroid.x - _lastHipCentroid.x;
    const dy = hipCentroid.y - _lastHipCentroid.y;
    const dz = hipCentroid.z - _lastHipCentroid.z;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const absZ = Math.abs(dz);
    const MIN_MOVE = 0.004; // ignore sub-threshold noise
    if (Math.max(absX, absY, absZ) > MIN_MOVE) {
      if (absX >= absY && absX >= absZ) {
        direction = dx > 0 ? "moving right" : "moving left";
      } else if (absY >= absX && absY >= absZ) {
        direction = dy > 0 ? "moving down" : "moving up";
      } else {
        direction = dz > 0 ? "moving away" : "moving closer";
      }
    }
  }
  _lastHipCentroid = hipCentroid;

  // --- Flags ---
  const flags: string[] = [];

  if (intensity === "still")                          flags.push("not moving");
  if (intensity === "low")                            flags.push("moving slow");
  if (intensity === "high" || intensity === "very high") flags.push("moving fast");

  // Region-dominant flags
  if (regions.arms > 0.12 && regions.legs < 0.06)   flags.push("arms only");
  if (regions.legs > 0.12 && regions.arms < 0.06)   flags.push("legs only");
  if (regions.arms > 0.10 && regions.legs > 0.10)   flags.push("full body");

  // Sudden burst: short-term spike significantly above recent baseline
  if (
    _motionBaseline.ready &&
    smoothedMotion > baselineMotion * 1.8 &&
    smoothedMotion > THRESHOLDS.low
  ) {
    flags.push("sudden burst");
  }

  return {
    module: "movement",
    intensity,
    flags,
    activeZones,
    dominantRegion,
    velocityMs,
    direction,
    bodyVisibility: Math.round(visibilityScore * 100) / 100,
  };
}
