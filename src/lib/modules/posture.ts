import type { AnalyzerOutput } from "../pose/analyzer";

export interface PostureResult {
  module: "posture";
  score: number;
  flags: string[];
  angles: {
    neck: number;
    spine: number;
    shoulderBalance: number;
  };
  grade: "excellent" | "good" | "fair" | "poor";
  confidence: number;
}

const IDEAL = {
  neck:             { max: 10 },
  spine:            { max: 8  },
  shoulderBalance:  { max: 3  },
};

function scoreAngle(value: number, max: number): number {
  if (value <= max) return 100;
  return Math.max(0, 100 - (value - max) * 5);
}

export function analyzePosture(output: AnalyzerOutput): PostureResult {
  const { angles, visibilityScore } = output;
  const flags: string[] = [];

  const neckScore     = scoreAngle(angles.neck,             IDEAL.neck.max);
  const spineScore    = scoreAngle(angles.spine,            IDEAL.spine.max);
  const shoulderScore = scoreAngle(angles.shoulderBalance,  IDEAL.shoulderBalance.max);

  const score = Math.round(neckScore * 0.4 + spineScore * 0.4 + shoulderScore * 0.2);

  if (angles.neck > 15)             flags.push("forward head (severe)");
  else if (angles.neck > 10)        flags.push("forward head (mild)");
  if (angles.spine > 12)            flags.push("lateral lean (severe)");
  else if (angles.spine > 8)        flags.push("lateral lean (mild)");
  if (angles.shoulderBalance > 5)   flags.push("shoulder imbalance (significant)");
  else if (angles.shoulderBalance > 3) flags.push("shoulder imbalance (mild)");

  const grade =
    score >= 90 ? "excellent" :
    score >= 75 ? "good" :
    score >= 55 ? "fair" : "poor";

  return {
    module: "posture",
    score,
    flags,
    angles: {
      neck:             Math.round(angles.neck * 10) / 10,
      spine:            Math.round(angles.spine * 10) / 10,
      shoulderBalance:  Math.round(angles.shoulderBalance * 10) / 10,
    },
    grade,
    confidence: Math.round(visibilityScore * 100) / 100,
  };
}
