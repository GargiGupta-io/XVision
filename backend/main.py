from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
import time
import math

app = FastAPI(title="XVision API", version="1.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

start_time = time.time()


# ---------------------------------------------------------------------------
# Shared models
# ---------------------------------------------------------------------------

class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = None


class AnalyzeRequest(BaseModel):
    module: Literal["posture", "movement", "activity", "presence"]
    landmarks: list[Landmark]
    config: dict = {}


def ok(data: dict) -> dict:
    return {"ok": True, "data": data, "timestamp": int(time.time())}


def err(code: str, message: str) -> dict:
    return {"ok": False, "error": code, "message": message}


# ---------------------------------------------------------------------------
# Core math (mirrors pose/analyzer.ts logic in Python)
# ---------------------------------------------------------------------------

def angle_between(ax, ay, bx, by, cx, cy) -> float:
    """Angle at B in the triangle A-B-C, in degrees."""
    ba = (ax - bx, ay - by)
    bc = (cx - bx, cy - by)
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0] ** 2 + ba[1] ** 2)
    mag_bc = math.sqrt(bc[0] ** 2 + bc[1] ** 2)
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cos_a = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_a))


def analyze_landmarks(lms: list[Landmark]) -> dict:
    """Compute angles and visibility from 33 landmarks."""
    def get(i):
        if i < len(lms):
            return lms[i]
        return Landmark(x=0, y=0, z=0, visibility=0)

    # Key landmarks
    ls = get(11)   # left shoulder
    rs = get(12)   # right shoulder
    lh = get(23)   # left hip
    rh = get(24)   # right hip
    nose = get(0)

    mid_sx = (ls.x + rs.x) / 2
    mid_sy = (ls.y + rs.y) / 2
    mid_hx = (lh.x + rh.x) / 2
    mid_hy = (lh.y + rh.y) / 2

    # Neck: angle of head from shoulder vertical
    vert_y = mid_sy - 0.1
    neck = angle_between(mid_sx, vert_y, mid_sx, mid_sy, nose.x, nose.y)

    # Spine: angle of torso from hip vertical
    hip_vert_y = mid_hy - 0.1
    spine = angle_between(mid_hx, hip_vert_y, mid_hx, mid_hy, mid_sx, mid_sy)

    # Shoulder balance: height difference (normalized → approx cm)
    shoulder_balance = abs(ls.y - rs.y) * 100

    # Elbow angles
    left_elbow = angle_between(
        ls.x, ls.y, get(13).x, get(13).y, get(15).x, get(15).y
    )
    right_elbow = angle_between(
        rs.x, rs.y, get(14).x, get(14).y, get(16).x, get(16).y
    )

    # Visibility score
    visibility_score = sum(
        1 for lm in lms if (lm.visibility or 0) > 0.5
    ) / len(lms) if lms else 0

    return {
        "neck": round(neck, 1),
        "spine": round(spine, 1),
        "shoulder_balance": round(shoulder_balance, 1),
        "left_elbow": round(left_elbow, 1),
        "right_elbow": round(right_elbow, 1),
        "visibility_score": round(visibility_score, 2),
    }


# ---------------------------------------------------------------------------
# Module logic
# ---------------------------------------------------------------------------

def run_posture(lms: list[Landmark]) -> dict:
    a = analyze_landmarks(lms)
    neck, spine, sb = a["neck"], a["spine"], a["shoulder_balance"]

    def score_angle(val, max_val):
        if val <= max_val:
            return 100
        return max(0, 100 - (val - max_val) * 5)

    score = round(score_angle(neck, 10) * 0.4 + score_angle(spine, 8) * 0.4 + score_angle(sb, 3) * 0.2)

    flags = []
    if neck > 15:       flags.append("forward_head (severe)")
    elif neck > 10:     flags.append("forward_head (mild)")
    if spine > 12:      flags.append("lateral_lean (severe)")
    elif spine > 8:     flags.append("lateral_lean (mild)")
    if sb > 5:          flags.append("shoulder_imbalance (significant)")
    elif sb > 3:        flags.append("shoulder_imbalance (mild)")

    grade = "excellent" if score >= 90 else "good" if score >= 75 else "fair" if score >= 55 else "poor"

    return {
        "module": "posture",
        "score": score,
        "grade": grade,
        "flags": flags,
        "angles": {"neck": neck, "spine": spine, "shoulder_balance": sb},
        "confidence": a["visibility_score"],
    }


def run_movement(lms: list[Landmark], prev_lms: Optional[list[Landmark]] = None) -> dict:
    a = analyze_landmarks(lms)

    # Region motion (requires previous frame — returns zeros without it)
    def region_motion(indices):
        if not prev_lms:
            return 0.0
        total, count = 0.0, 0
        for i in indices:
            if i < len(lms) and i < len(prev_lms):
                dx = lms[i].x - prev_lms[i].x
                dy = lms[i].y - prev_lms[i].y
                total += math.sqrt(dx ** 2 + dy ** 2)
                count += 1
        return min(1.0, (total / count) * 20) if count > 0 else 0.0

    regions = {
        "head": region_motion(list(range(11))),
        "torso": region_motion([11, 12, 23, 24]),
        "arms": region_motion(list(range(13, 23))),
        "hips": region_motion([23, 24, 25, 26]),
        "legs": region_motion(list(range(25, 33))),
    }
    overall = sum(regions.values()) / 5

    intensity = (
        "still" if overall < 0.02 else
        "low"   if overall < 0.08 else
        "medium" if overall < 0.20 else
        "high"
    )

    max_val = max(regions.values()) if regions else 0
    active_zones = [k for k, v in regions.items() if v > 0.05 and v >= max_val * 0.4]
    dominant = max(regions, key=regions.get) if overall > 0.02 else None

    return {
        "module": "movement",
        "intensity": intensity,
        "active_zones": active_zones,
        "dominant_region": dominant,
        "velocity": round(overall, 3),
        "confidence": a["visibility_score"],
    }


def run_activity(lms: list[Landmark]) -> dict:
    a = analyze_landmarks(lms)
    le, re = a["left_elbow"], a["right_elbow"]
    visibility = a["visibility_score"]

    # Gesture detection
    gesture = None
    # (Without region motion we approximate from elbow angles only)
    if le > 150 or re > 150:
        gesture = "raise_hand"
    elif le > 130 or re > 130:
        gesture = "wave"

    # Behavior (simplified without motion deltas)
    behavior = "idle"
    if gesture:
        behavior = "gesturing"

    return {
        "module": "activity",
        "behavior": behavior,
        "gesture": gesture,
        "repetition_count": 0,  # stateful — requires session tracking
        "confidence": visibility,
    }


def run_presence(lms: list[Landmark]) -> dict:
    a = analyze_landmarks(lms)
    detected = a["visibility_score"] >= 0.3

    # Zone occupancy: upper (y 0-0.33), middle (0.33-0.67), lower (0.67-1.0)
    key_indices = [0, 23, 24, 27, 28]
    key_points = [lms[i] for i in key_indices if i < len(lms) and (lms[i].visibility or 0) > 0.5]

    def in_zone(lm, y_min, y_max):
        return y_min <= lm.y < y_max

    zone_occupancy = {
        "upper":  any(in_zone(lm, 0.0,  0.33) for lm in key_points),
        "middle": any(in_zone(lm, 0.33, 0.67) for lm in key_points),
        "lower":  any(in_zone(lm, 0.67, 1.0)  for lm in key_points),
    }

    return {
        "module": "presence",
        "detected": detected,
        "dwell_seconds": 0,   # stateful — requires session tracking
        "zone_occupancy": zone_occupancy,
        "confidence": a["visibility_score"],
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return ok({"status": "ok", "version": "1.0.0", "uptime_seconds": round(time.time() - start_time)})


@app.post("/api/v1/analyze")
def analyze(req: AnalyzeRequest):
    if len(req.landmarks) < 33:
        raise HTTPException(status_code=422, detail=err(
            "invalid_landmarks",
            f"Expected 33 landmarks, got {len(req.landmarks)}"
        ))

    if req.module == "posture":
        result = run_posture(req.landmarks)
    elif req.module == "movement":
        result = run_movement(req.landmarks)
    elif req.module == "activity":
        result = run_activity(req.landmarks)
    elif req.module == "presence":
        result = run_presence(req.landmarks)
    else:
        raise HTTPException(status_code=400, detail=err(
            "unknown_module", f"Module '{req.module}' not recognized"
        ))

    return ok(result)


@app.get("/api/v1/modules")
def list_modules():
    return ok({
        "modules": [
            {"id": "posture",  "description": "Spinal alignment, head position, shoulder balance"},
            {"id": "movement", "description": "Motion intensity, active zones, dominant region"},
            {"id": "activity", "description": "Behavior classification, gesture detection, rep counting"},
            {"id": "presence", "description": "Person detection, dwell time, zone occupancy"},
        ]
    })


@app.get("/api/stats")
def stats():
    return ok({"uptime_seconds": round(time.time() - start_time), "version": "1.0.0"})
