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
  bodyVisibility: number;
}

// 3×3 grid — exported so the demo canvas overlay can draw the same zones
export const DEFAULT_ZONES: ZoneConfig[] = [
  { name: "top-left",      x: 0,    y: 0,    width: 0.33, height: 0.33 },
  { name: "top-center",    x: 0.33, y: 0,    width: 0.34, height: 0.33 },
  { name: "top-right",     x: 0.67, y: 0,    width: 0.33, height: 0.33 },
  { name: "center-left",   x: 0,    y: 0.33, width: 0.33, height: 0.34 },
  { name: "center",        x: 0.33, y: 0.33, width: 0.34, height: 0.34 },
  { name: "center-right",  x: 0.67, y: 0.33, width: 0.33, height: 0.34 },
  { name: "bottom-left",   x: 0,    y: 0.67, width: 0.33, height: 0.33 },
  { name: "bottom-center", x: 0.33, y: 0.67, width: 0.34, height: 0.33 },
  { name: "bottom-right",  x: 0.67, y: 0.67, width: 0.33, height: 0.33 },
];

// How many consecutive missed frames before dwell resets
// Prevents a single dropped frame from zeroing out the dwell timer
const DWELL_MISS_TOLERANCE = 3;

let _firstDetectedAt: number | null = null;
let _missedFrames = 0;

export function resetDwell(): void {
  _firstDetectedAt = null;
  _missedFrames    = 0;
}

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

  const detected = visibilityScore >= 0.3;

  // Dwell time with miss tolerance — a brief disappearance doesn't reset the clock
  if (detected) {
    _missedFrames = 0;
    if (_firstDetectedAt === null) {
      _firstDetectedAt = timestamp;
    }
  } else {
    _missedFrames++;
    if (_missedFrames > DWELL_MISS_TOLERANCE) {
      _firstDetectedAt = null;
    }
  }

  const dwellSeconds = _firstDetectedAt !== null
    ? Math.round((timestamp - _firstDetectedAt) / 1000)
    : 0;

  // Zone occupancy — nose, hips, ankles as key body points
  const keyIndices = [0, 23, 24, 27, 28];
  const keyPoints  = keyIndices
    .map((i) => landmarks[i])
    .filter((lm) => lm && (lm.visibility ?? 0) > 0.5);

  const zoneOccupancy: Record<string, boolean> = {};
  for (const zone of zones) {
    zoneOccupancy[zone.name] = keyPoints.some((lm) => inZone(lm.x, lm.y, zone));
  }

  return {
    module: "presence",
    detected,
    dwellSeconds,
    zoneOccupancy,
    bodyVisibility: Math.round(visibilityScore * 100) / 100,
  };
}
