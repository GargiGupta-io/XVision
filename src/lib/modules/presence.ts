import type { AnalyzerOutput } from "../pose/analyzer";

export interface ZoneConfig {
  name: string;
  // Normalized 0-1 bounding box — describes a region of the video frame
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PresenceResult {
  module: "presence";
  detected: boolean;
  dwellSeconds: number;
  zoneOccupancy: Record<string, boolean>;
  confidence: number;
}

// Default zones: divide the frame into 3 horizontal bands
const DEFAULT_ZONES: ZoneConfig[] = [
  { name: "upper",  x: 0,   y: 0,    width: 1, height: 0.33 },
  { name: "middle", x: 0,   y: 0.33, width: 1, height: 0.34 },
  { name: "lower",  x: 0,   y: 0.67, width: 1, height: 0.33 },
];

// Stateful dwell tracker — tracks when a person was first detected
let _firstDetectedAt: number | null = null;

export function resetDwell(): void {
  _firstDetectedAt = null;
}

// Check if a point (x, y) is inside a zone bounding box
function inZone(x: number, y: number, zone: ZoneConfig): boolean {
  return (
    x >= zone.x &&
    x <= zone.x + zone.width &&
    y >= zone.y &&
    y <= zone.y + zone.height
  );
}

export function analyzePresence(
  output: AnalyzerOutput,
  zones: ZoneConfig[] = DEFAULT_ZONES
): PresenceResult {
  const { landmarks, visibilityScore, timestamp } = output;

  // Consider a person detected if ≥30% of landmarks are visible
  const detected = visibilityScore >= 0.3;

  // Dwell time tracking
  if (detected && _firstDetectedAt === null) {
    _firstDetectedAt = timestamp;
  } else if (!detected) {
    _firstDetectedAt = null;
  }
  const dwellSeconds = detected && _firstDetectedAt !== null
    ? Math.round((timestamp - _firstDetectedAt) / 1000)
    : 0;

  // Zone occupancy — use key body landmarks (nose, hips, ankles) to determine zones
  const keyIndices = [0, 23, 24, 27, 28]; // nose, hips, ankles
  const keyPoints = keyIndices
    .map((i) => landmarks[i])
    .filter((lm) => lm && (lm.visibility ?? 0) > 0.5);

  const zoneOccupancy: Record<string, boolean> = {};
  for (const zone of zones) {
    zoneOccupancy[zone.name] = keyPoints.some((lm) =>
      inZone(lm.x, lm.y, zone)
    );
  }

  return {
    module: "presence",
    detected,
    dwellSeconds,
    zoneOccupancy,
    confidence: Math.round(visibilityScore * 100) / 100,
  };
}
