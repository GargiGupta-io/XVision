import type { AnalyzerOutput } from "../pose/analyzer";

export interface PostureResult {
  module: "posture";
  score: number;
  flags: string[];
  angles: {
    neck: number;
    spine: number;
    shoulderBalance: number;
    forwardHeadDepth: number;    // Z depth — how far head is in front of shoulders (+ = forward)
    roundedShoulderDepth: number;// Z depth — how far shoulders are in front of hips (+ = rounded)
    hipTilt: number;             // height difference between left and right hip
  };
  grade: "excellent" | "good" | "fair" | "poor";
  bodyVisibility: number;
}

const IDEAL = {
  neck:                 { max: 10 },
  spine:                { max: 8  },
  shoulderBalance:      { max: 3  },
  forwardHeadDepth:     { max: 0.03 }, // normalized Z units
  roundedShoulderDepth: { max: 0.03 },
  hipTilt:              { max: 3  },
};

function scoreAngle(value: number, max: number): number {
  if (value <= max) return 100;
  // Less aggressive penalty: 3pts per unit over ideal (was 5)
  return Math.max(0, 100 - (value - max) * 3);
}

export function analyzePosture(output: AnalyzerOutput): PostureResult {
  const { angles, landmarks, visibilityScore } = output;
  const flags: string[] = [];

  // --- Z-depth measurements (require good landmark visibility) ---
  const canUseDepth = visibilityScore >= 0.6;

  const lm = landmarks;
  const get = (i: number) => lm[i] ?? { x: 0, y: 0, z: 0, visibility: 0 };

  const leftShoulder  = get(11);
  const rightShoulder = get(12);
  const leftHip       = get(23);
  const rightHip      = get(24);
  const nose          = get(0);

  const midShoulderZ = (leftShoulder.z + rightShoulder.z) / 2;
  const midHipZ      = (leftHip.z + rightHip.z) / 2;

  // Forward head: how much closer to camera the nose is vs shoulders
  // Negative Z = closer to camera in MediaPipe, so (midShoulderZ - nose.z) > 0 means head is forward
  const forwardHeadDepth = canUseDepth
    ? Math.max(0, Math.round((midShoulderZ - nose.z) * 1000) / 1000)
    : 0;

  // Rounded shoulders: how much closer to camera shoulders are vs hips
  const roundedShoulderDepth = canUseDepth
    ? Math.max(0, Math.round((midHipZ - midShoulderZ) * 1000) / 1000)
    : 0;

  // Hip tilt: vertical height difference between left and right hip
  const hipTilt = Math.abs(leftHip.y - rightHip.y) * 100;

  // --- Scoring ---
  const neckScore          = scoreAngle(angles.neck,            IDEAL.neck.max);
  const spineScore         = scoreAngle(angles.spine,           IDEAL.spine.max);
  const shoulderScore      = scoreAngle(angles.shoulderBalance, IDEAL.shoulderBalance.max);
  const forwardHeadScore   = canUseDepth
    ? scoreAngle(forwardHeadDepth * 100, IDEAL.forwardHeadDepth.max * 100)
    : 100;
  const roundedScore       = canUseDepth
    ? scoreAngle(roundedShoulderDepth * 100, IDEAL.roundedShoulderDepth.max * 100)
    : 100;

  const score = Math.round(
    neckScore        * 0.20 +
    spineScore       * 0.20 +
    shoulderScore    * 0.15 +
    forwardHeadScore * 0.25 +
    roundedScore     * 0.20
  );

  // --- Flags ---
  // Neck lateral tilt (renamed from "forward head" — this is what 2D actually measures)
  if (angles.neck > 15)      flags.push("neck lateral tilt (severe)");
  else if (angles.neck > 10) flags.push("neck lateral tilt (mild)");

  // Lateral lean
  if (angles.spine > 12)      flags.push("lateral lean (severe)");
  else if (angles.spine > 8)  flags.push("lateral lean (mild)");

  // Shoulder imbalance
  if (angles.shoulderBalance > 5)       flags.push("shoulder imbalance (significant)");
  else if (angles.shoulderBalance > 3)  flags.push("shoulder imbalance (mild)");

  // Z-depth flags (only when visibility is good enough to trust depth)
  if (canUseDepth) {
    if (forwardHeadDepth > 0.06)       flags.push("forward head (severe)");
    else if (forwardHeadDepth > 0.03)  flags.push("forward head (mild)");

    if (roundedShoulderDepth > 0.06)      flags.push("rounded shoulders (severe)");
    else if (roundedShoulderDepth > 0.03) flags.push("rounded shoulders (mild)");
  }

  // Hip tilt
  if (hipTilt > 5)      flags.push("hip tilt (significant)");
  else if (hipTilt > 3) flags.push("hip tilt (mild)");

  const grade =
    score >= 90 ? "excellent" :
    score >= 75 ? "good" :
    score >= 55 ? "fair" : "poor";

  return {
    module: "posture",
    score,
    flags,
    angles: {
      neck:                 Math.round(angles.neck * 10) / 10,
      spine:                Math.round(angles.spine * 10) / 10,
      shoulderBalance:      Math.round(angles.shoulderBalance * 10) / 10,
      forwardHeadDepth,
      roundedShoulderDepth,
      hipTilt:              Math.round(hipTilt * 10) / 10,
    },
    grade,
    bodyVisibility: Math.round(visibilityScore * 100) / 100,
  };
}
