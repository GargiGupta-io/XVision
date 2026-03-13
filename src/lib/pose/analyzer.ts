// Core pose analysis — turns raw MediaPipe landmarks into structured measurements.
// All modules depend on this. It does the math so modules don't have to.

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface JointAngles {
  neck: number;           // degrees — head tilt from vertical
  spine: number;          // degrees — torso lean from vertical
  shoulderBalance: number;// cm difference — left vs right shoulder height
  leftElbow: number;      // degrees — upper arm to forearm
  rightElbow: number;
  leftKnee: number;       // degrees — thigh to shin
  rightKnee: number;
  leftHip: number;        // degrees — torso to thigh
  rightHip: number;
}

export interface BodyRegionActivity {
  head: number;     // motion energy 0-1
  torso: number;
  arms: number;
  hips: number;
  legs: number;
}

export interface AnalyzerOutput {
  landmarks: Landmark[];
  angles: JointAngles;
  regions: BodyRegionActivity;
  overallMotion: number;       // 0-1 aggregate movement
  visibilityScore: number;     // 0-1 how many landmarks are visible
  timestamp: number;
}

// MediaPipe landmark indices
const LM = {
  NOSE: 0,
  LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT: 31, RIGHT_FOOT: 32,
} as const;

// Compute angle at joint B given three points A-B-C (degrees)
function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (magBA === 0 || magBC === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * (180 / Math.PI);
}

// Midpoint of two landmarks
function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

// Euclidean distance between two landmarks (normalized 0-1 space)
function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Motion energy of a set of landmarks compared to previous frame
function regionMotion(
  current: Landmark[],
  previous: Landmark[] | null,
  indices: number[]
): number {
  if (!previous) return 0;
  let total = 0;
  let count = 0;
  for (const i of indices) {
    const c = current[i];
    const p = previous[i];
    if (!c || !p) continue;
    total += distance(c, p);
    count++;
  }
  return count > 0 ? Math.min(1, (total / count) * 20) : 0;
}

export function analyzePose(
  landmarks: Landmark[],
  previous: Landmark[] | null = null
): AnalyzerOutput {
  const lm = landmarks;
  const get = (i: number) => lm[i] ?? { x: 0, y: 0, z: 0, visibility: 0 };

  // --- Joint angles ---
  const leftShoulder = get(LM.LEFT_SHOULDER);
  const rightShoulder = get(LM.RIGHT_SHOULDER);
  const leftHip = get(LM.LEFT_HIP);
  const rightHip = get(LM.RIGHT_HIP);
  const nose = get(LM.NOSE);

  const midShoulder = midpoint(leftShoulder, rightShoulder);
  const midHip = midpoint(leftHip, rightHip);

  // Neck angle: deviation of head from shoulder midpoint vertical
  const vertical: Landmark = { x: midShoulder.x, y: midShoulder.y - 0.1, z: 0 };
  const neck = angleBetween(vertical, midShoulder, nose);

  // Spine angle: deviation of shoulder midpoint from hip midpoint vertical
  const hipVertical: Landmark = { x: midHip.x, y: midHip.y - 0.1, z: 0 };
  const spine = angleBetween(hipVertical, midHip, midShoulder);

  // Shoulder balance: height difference in normalized units → approximate cm
  const shoulderBalance = Math.abs(leftShoulder.y - rightShoulder.y) * 100;

  // Limb angles
  const leftElbow = angleBetween(
    get(LM.LEFT_SHOULDER), get(LM.LEFT_ELBOW), get(LM.LEFT_WRIST)
  );
  const rightElbow = angleBetween(
    get(LM.RIGHT_SHOULDER), get(LM.RIGHT_ELBOW), get(LM.RIGHT_WRIST)
  );
  const leftKnee = angleBetween(
    get(LM.LEFT_HIP), get(LM.LEFT_KNEE), get(LM.LEFT_ANKLE)
  );
  const rightKnee = angleBetween(
    get(LM.RIGHT_HIP), get(LM.RIGHT_KNEE), get(LM.RIGHT_ANKLE)
  );
  const leftHipAngle = angleBetween(
    get(LM.LEFT_SHOULDER), get(LM.LEFT_HIP), get(LM.LEFT_KNEE)
  );
  const rightHipAngle = angleBetween(
    get(LM.RIGHT_SHOULDER), get(LM.RIGHT_HIP), get(LM.RIGHT_KNEE)
  );

  const angles: JointAngles = {
    neck, spine, shoulderBalance,
    leftElbow, rightElbow,
    leftKnee, rightKnee,
    leftHip: leftHipAngle, rightHip: rightHipAngle,
  };

  // --- Region motion ---
  const prev = previous;
  const regions: BodyRegionActivity = {
    head:  regionMotion(lm, prev, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    torso: regionMotion(lm, prev, [11, 12, 23, 24]),
    arms:  regionMotion(lm, prev, [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]),
    hips:  regionMotion(lm, prev, [23, 24, 25, 26]),
    legs:  regionMotion(lm, prev, [25, 26, 27, 28, 29, 30, 31, 32]),
  };

  const overallMotion = Object.values(regions).reduce((s, v) => s + v, 0) / 5;

  // Visibility score — fraction of landmarks with visibility > 0.5
  const visibilityScore =
    lm.filter((l) => (l.visibility ?? 0) > 0.5).length / lm.length;

  return {
    landmarks,
    angles,
    regions,
    overallMotion,
    visibilityScore,
    timestamp: Date.now(),
  };
}
