import type { AnalyzerOutput } from "../pose/analyzer";

export interface ActivityResult {
  module: "activity";
  behavior: "idle" | "walking" | "exercising" | "reaching" | "gesturing";
  gesture: string | null;
  repCount: number;
  repCalibrating: boolean;
  bodyVisibility: number;
}

// Thresholds for classifying behavior from motion intensity
const BEHAVIOR_THRESHOLDS = {
  idle:       0.03,
  walking:    0.10,
  exercising: 0.25,
};

// Gesture detection: simple rule-based from arm motion + joint angles
function detectGesture(output: AnalyzerOutput): string | null {
  const { angles, regions } = output;

  // Wave: high arm motion, elbow fairly extended
  if (
    regions.arms > 0.25 &&
    (angles.leftElbow > 130 || angles.rightElbow > 130)
  ) {
    return "wave";
  }

  // Raise hand: very high arm motion, at least one elbow extended
  if (
    regions.arms > 0.35 &&
    (angles.leftElbow > 150 || angles.rightElbow > 150)
  ) {
    return "raise hand";
  }

  // Reach: moderate arm motion, elbow near full extension
  if (
    regions.arms > 0.15 &&
    (angles.leftElbow > 160 || angles.rightElbow > 160)
  ) {
    return "reach";
  }

  return null;
}

// Classify behavior from overall motion and region distribution
function classifyBehavior(output: AnalyzerOutput): ActivityResult["behavior"] {
  const { overallMotion, regions } = output;

  if (overallMotion < BEHAVIOR_THRESHOLDS.idle) return "idle";

  // Exercising: high overall motion with significant leg involvement
  if (overallMotion >= BEHAVIOR_THRESHOLDS.exercising && regions.legs > 0.15) {
    return "exercising";
  }

  // Walking: moderate motion spread across torso + legs
  if (
    overallMotion >= BEHAVIOR_THRESHOLDS.walking &&
    regions.legs > 0.08 &&
    regions.torso > 0.03
  ) {
    return "walking";
  }

  // Reaching / gesturing: arm-dominant motion
  if (regions.arms > 0.12 && regions.arms > regions.legs * 1.5) {
    const gesture = detectGesture(output);
    return gesture ? "gesturing" : "reaching";
  }

  return "idle";
}

// Stateful rep counter — exported so the demo page can maintain it across frames
let _repHistory: number[] = [];
let _lastPeak = false;

export function resetRepCount(): void {
  _repHistory = [];
  _lastPeak = false;
}

function updateRepCount(output: AnalyzerOutput): number {
  const { overallMotion } = output;
  _repHistory.push(overallMotion);
  if (_repHistory.length > 900) _repHistory.shift(); // ~30 seconds at 30fps

  // Peak detection: current value is a local max above threshold
  const recent = _repHistory.slice(-5);
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const isPeak = overallMotion > 0.15 && overallMotion >= avg * 1.2;

  if (isPeak && !_lastPeak) {
    _lastPeak = true;
    return 1; // increment
  }
  if (!isPeak) _lastPeak = false;
  return 0;
}

let _totalReps = 0;

export function analyzeActivity(output: AnalyzerOutput): ActivityResult {
  const behavior = classifyBehavior(output);
  const gesture = detectGesture(output);

  if (behavior === "exercising") {
    _totalReps += updateRepCount(output);
  } else {
    // Reset when not exercising
    _totalReps = 0;
    _repHistory = [];
    _lastPeak = false;
  }

  return {
    module: "activity",
    behavior,
    gesture,
    repCount: _totalReps,
    repCalibrating: false,
    bodyVisibility: Math.round(output.visibilityScore * 100) / 100,
  };
}
