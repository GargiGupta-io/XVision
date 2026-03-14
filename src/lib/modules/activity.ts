import type { AnalyzerOutput } from "../pose/analyzer";

export interface ActivityResult {
  module: "activity";
  behavior: "idle" | "walking" | "exercising" | "reaching" | "gesturing" | "sitting" | "jumping" | "stretching";
  gesture: string | null;
  repCount: number;
  repCalibrating: boolean;
  bodyVisibility: number;
}

// How long to observe motion before rep counting becomes reliable
const CALIBRATION_SECONDS = 30;

// --- Gesture detection (priority ordered — most specific first) ---
function detectGesture(output: AnalyzerOutput): string | null {
  const { angles, regions, landmarks } = output;
  const get = (i: number) => landmarks[i] ?? { x: 0, y: 0, z: 0, visibility: 0 };

  const leftShoulder  = get(11);
  const rightShoulder = get(12);
  const leftWrist     = get(15);
  const rightWrist    = get(16);
  const leftAnkle     = get(27);
  const rightAnkle    = get(28);
  const midX = (leftShoulder.x + rightShoulder.x) / 2;

  // Lower body gestures first (need full body context)

  // Squat: both knees deeply bent
  if (angles.leftKnee < 120 && angles.rightKnee < 120) return "squat";

  // Lunge: one knee deeply bent, opposite leg extended
  if (
    (angles.leftKnee < 100 && angles.rightKnee > 140) ||
    (angles.rightKnee < 100 && angles.leftKnee > 140)
  ) return "lunge";

  // Jump: high leg activity, ankles at similar height (both feet off ground together)
  if (regions.legs > 0.35 && Math.abs(leftAnkle.y - rightAnkle.y) < 0.08) return "jump";

  // Kick: one leg extended with significant leg motion
  if (regions.legs > 0.25 && (angles.leftKnee > 155 || angles.rightKnee > 155)) return "kick";

  // Upper body gestures

  // Cross arms: left wrist past center-right, right wrist past center-left
  if (leftWrist.x > midX + 0.05 && rightWrist.x < midX - 0.05) return "cross arms";

  // Clap: both wrists very close together with arm activity
  const wristDist = Math.sqrt(
    (leftWrist.x - rightWrist.x) ** 2 + (leftWrist.y - rightWrist.y) ** 2
  );
  if (wristDist < 0.08 && regions.arms > 0.10) return "clap";

  // Hands up: both wrists above shoulder line
  if (
    leftWrist.y  < leftShoulder.y  - 0.05 &&
    rightWrist.y < rightShoulder.y - 0.05
  ) return "hands up";

  // Point: one arm fully extended, other relaxed
  if (
    (angles.leftElbow > 155 && angles.rightElbow < 100) ||
    (angles.rightElbow > 155 && angles.leftElbow < 100)
  ) return "point";

  // Raise hand: high arm motion, at least one wrist above shoulder
  if (
    regions.arms > 0.35 &&
    (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y)
  ) return "raise hand";

  // Wave: high arm motion, elbow fairly extended
  if (regions.arms > 0.25 && (angles.leftElbow > 130 || angles.rightElbow > 130)) return "wave";

  // Reach: moderate arm motion, elbow near full extension
  if (regions.arms > 0.15 && (angles.leftElbow > 160 || angles.rightElbow > 160)) return "reach";

  return null;
}

// --- Behavior classification ---
function classifyBehavior(output: AnalyzerOutput): ActivityResult["behavior"] {
  const { overallMotion, regions, angles } = output;

  // Sitting: both hip angles acute (torso folded toward thighs)
  if (angles.leftHip < 110 && angles.rightHip < 110) return "sitting";

  if (overallMotion < 0.03) return "idle";

  // Jumping: high leg motion with legs fairly extended
  if (regions.legs > 0.35 && angles.leftKnee > 140 && angles.rightKnee > 140) return "jumping";

  // Exercising: high overall motion with significant leg involvement
  if (overallMotion >= 0.25 && regions.legs > 0.15) return "exercising";

  // Stretching: slow deliberate arm/torso motion, limbs extended, legs mostly still
  if (
    overallMotion < 0.15 &&
    (regions.arms > 0.12 || regions.torso > 0.08) &&
    (angles.leftElbow > 150 || angles.rightElbow > 150) &&
    regions.legs < 0.08
  ) return "stretching";

  // Walking: moderate motion spread across torso + legs
  if (overallMotion >= 0.10 && regions.legs > 0.08 && regions.torso > 0.03) return "walking";

  // Arm-dominant motion
  if (regions.arms > 0.12 && regions.arms > regions.legs * 1.5) {
    return detectGesture(output) ? "gesturing" : "reaching";
  }

  return "idle";
}

// --- Rep counter state ---
let _repHistory: number[] = [];
let _lastPeak    = false;
let _totalReps   = 0;
let _calibrationStart: number | null = null;
let _isCalibrated = false;
let _lastBehavior: ActivityResult["behavior"] = "idle";
let _lastGesture: string | null = null;

export function resetRepCount(): void {
  _repHistory       = [];
  _lastPeak         = false;
  _totalReps        = 0;
  _calibrationStart = null;
  _isCalibrated     = false;
}

function updateRepCount(motion: number, timestamp: number): number {
  // Start calibration window on first call
  if (_calibrationStart === null) {
    _calibrationStart = timestamp;
    return 0;
  }

  // Still in calibration window — collect baseline, don't count
  if (!_isCalibrated) {
    if ((timestamp - _calibrationStart) / 1000 < CALIBRATION_SECONDS) {
      _repHistory.push(motion);
      return 0;
    }
    _isCalibrated = true;
  }

  // Counting phase — peak detection on motion signal
  _repHistory.push(motion);
  if (_repHistory.length > 900) _repHistory.shift();

  const recent = _repHistory.slice(-5);
  const avg    = recent.reduce((s, v) => s + v, 0) / recent.length;
  const isPeak = motion > 0.15 && motion >= avg * 1.2;

  if (isPeak && !_lastPeak) { _lastPeak = true;  return 1; }
  if (!isPeak)               { _lastPeak = false; }
  return 0;
}

export function analyzeActivity(output: AnalyzerOutput): ActivityResult {
  const behavior = classifyBehavior(output);
  const gesture  = detectGesture(output);

  // Reset and recalibrate whenever behavior or gesture changes
  if (behavior !== _lastBehavior || gesture !== _lastGesture) {
    resetRepCount();
    _lastBehavior = behavior;
    _lastGesture  = gesture;
  }

  if (behavior === "exercising" || behavior === "jumping") {
    _totalReps += updateRepCount(output.overallMotion, output.timestamp);
  }

  return {
    module: "activity",
    behavior,
    gesture,
    repCount: _totalReps,
    repCalibrating: _calibrationStart !== null && !_isCalibrated,
    bodyVisibility: Math.round(output.visibilityScore * 100) / 100,
  };
}
