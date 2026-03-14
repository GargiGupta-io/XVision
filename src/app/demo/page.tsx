"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { analyzePose, type Landmark } from "@/lib/pose/analyzer";
import { analyzePosture, type PostureResult } from "@/lib/modules/posture";
import { analyzeMovement, type MovementResult } from "@/lib/modules/movement";
import { analyzeActivity, type ActivityResult } from "@/lib/modules/activity";
import { analyzePresence, DEFAULT_ZONES, type PresenceResult } from "@/lib/modules/presence";

const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32],
];

type ModuleId = "posture" | "movement" | "activity" | "presence";
type ModuleResult = PostureResult | MovementResult | ActivityResult | PresenceResult;

const MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: "posture",  label: "Posture",  description: "Spinal alignment & head position" },
  { id: "movement", label: "Movement", description: "Motion intensity & active zones" },
  { id: "activity", label: "Activity", description: "Gesture & behavior detection" },
  { id: "presence", label: "Presence", description: "Detection & zone occupancy" },
];

const TAB_ACTIVE: Record<ModuleId, string> = {
  posture:  "border-violet-500 text-violet-400 bg-violet-500/10",
  movement: "border-cyan-500 text-cyan-400 bg-cyan-500/10",
  activity: "border-green-500 text-green-400 bg-green-500/10",
  presence: "border-orange-500 text-orange-400 bg-orange-500/10",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-semibold">{value}</span>
    </div>
  );
}

export default function DemoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const prevLandmarksRef = useRef<Landmark[] | null>(null);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const activeModuleRef = useRef<ModuleId>("posture");
  const frozenRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>("posture");
  const [fps, setFps] = useState(0);
  const [result, setResult] = useState<ModuleResult | null>(null);

  // Keep refs in sync so the detection loop always reads the latest values
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);
  useEffect(() => { frozenRef.current = frozen; }, [frozen]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    prevLandmarksRef.current = null;
    setStarted(false);
    setResult(null);
    setFps(0);
  }, []);

  const drawSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    w: number, h: number,
    lineColor: string,
    dotColor: string
  ) => {
    ctx.lineWidth = 2;
    for (const [i, j] of POSE_CONNECTIONS) {
      const a = landmarks[i], b = landmarks[j];
      if (!a || !b) continue;
      if ((a.visibility ?? 0) < 0.3 || (b.visibility ?? 0) < 0.3) continue;
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    for (const lm of landmarks) {
      if ((lm.visibility ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }
  }, []);

  const drawOverlay = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    w: number, h: number,
    module: ModuleId,
    res: ModuleResult
  ) => {
    switch (module) {
      case "posture": {
        const r = res as PostureResult;
        const c = r.score >= 80 ? "#22c55e" : r.score >= 60 ? "#eab308" : "#ef4444";
        drawSkeleton(ctx, landmarks, w, h, `${c}99`, c);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(12, 12, 118, 46);
        ctx.font = "bold 26px monospace";
        ctx.fillStyle = c;
        ctx.fillText(`${r.score}`, 22, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(`/ 100  ${r.grade.toUpperCase()}`, 62, 45);
        break;
      }
      case "movement": {
        const r = res as MovementResult;
        const intensityColors: Record<string, string> = {
          still: "#6b7280", low: "#06b6d4", medium: "#f59e0b", high: "#ef4444",
        };
        const c = intensityColors[r.intensity] ?? "#06b6d4";
        drawSkeleton(ctx, landmarks, w, h, `${c}80`, c);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(12, 12, 130, 38);
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = c;
        ctx.fillText(r.intensity.toUpperCase(), 22, 36);
        break;
      }
      case "activity": {
        const r = res as ActivityResult;
        drawSkeleton(ctx, landmarks, w, h, "rgba(34,197,94,0.5)", "#22c55e");
        const label = r.gesture ? `${r.behavior} · ${r.gesture}` : r.behavior;
        ctx.font = "bold 13px monospace";
        const tw = ctx.measureText(label.toUpperCase()).width;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(12, 12, tw + 20, 38);
        ctx.fillStyle = "#22c55e";
        ctx.fillText(label.toUpperCase(), 22, 36);
        break;
      }
      case "presence": {
        const r = res as PresenceResult;
        drawSkeleton(ctx, landmarks, w, h, "rgba(249,115,22,0.5)", "#f97316");
        // 3×3 grid — green if occupied, red if not
        for (const zone of DEFAULT_ZONES) {
          const occupied = r.zoneOccupancy[zone.name];
          ctx.strokeStyle = occupied ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(zone.x * w, zone.y * h, zone.width * w, zone.height * h);
          if (occupied) {
            ctx.fillStyle = "rgba(34,197,94,0.08)";
            ctx.fillRect(zone.x * w, zone.y * h, zone.width * w, zone.height * h);
          }
        }
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(12, 12, 160, 38);
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = r.detected ? "#f97316" : "#6b7280";
        ctx.fillText(r.detected ? `PRESENT  ${r.dwellSeconds}s` : "UNDETECTED", 22, 36);
        break;
      }
    }
  }, [drawSkeleton]);

  const startDetection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (!w.vision) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector("script[data-mediapipe]")) {
            const check = setInterval(() => {
              if (w.vision) { clearInterval(check); resolve(); }
            }, 100);
            return;
          }
          const moduleScript = document.createElement("script");
          moduleScript.type = "module";
          moduleScript.dataset.mediapipe = "true";
          moduleScript.textContent = `
            import { PoseLandmarker, FilesetResolver }
              from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
            window.vision = { PoseLandmarker, FilesetResolver };
            window.dispatchEvent(new Event("mediapipe-ready"));
          `;
          document.head.appendChild(moduleScript);
          window.addEventListener("mediapipe-ready", () => resolve(), { once: true });
          setTimeout(() => reject(new Error("Timeout")), 30000);
        });
      }

      const { PoseLandmarker, FilesetResolver } = (window as any).vision; // eslint-disable-line @typescript-eslint/no-explicit-any
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } catch {
      setError("Failed to load MediaPipe. Check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera access denied. Please allow camera access and try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStarted(true);
    frameCountRef.current = 0;
    fpsIntervalRef.current = setInterval(() => {
      setFps(frameCountRef.current * 2);
      frameCountRef.current = 0;
    }, 500);

    const detectFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;
      if (!video || !canvas || !poseLandmarker || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);

      const now = performance.now();
      if (now - lastTimeRef.current > 0 && !frozenRef.current) {
        try {
          const detection = poseLandmarker.detectForVideo(video, now);
          if (detection.landmarks?.length > 0) {
            const lms = detection.landmarks[0] as Landmark[];
            const analyzerOut = analyzePose(lms, prevLandmarksRef.current);
            prevLandmarksRef.current = lms;

            const mod = activeModuleRef.current;
            let moduleResult: ModuleResult;
            if (mod === "posture")       moduleResult = analyzePosture(analyzerOut);
            else if (mod === "movement") moduleResult = analyzeMovement(analyzerOut);
            else if (mod === "activity") moduleResult = analyzeActivity(analyzerOut);
            else                         moduleResult = analyzePresence(analyzerOut);

            drawOverlay(ctx, lms, canvas.width, canvas.height, mod, moduleResult);
            setResult(moduleResult);
          } else {
            prevLandmarksRef.current = null;
            setResult(null);
          }
        } catch {
          // skip frame on error
        }
        lastTimeRef.current = now;
        frameCountRef.current++;
      }
      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);
  }, [drawOverlay]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const renderStats = () => {
    // Presence panel always renders — shows Undetected state when no result
    if (!result && activeModule !== "presence") {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
          <p className="text-gray-600 text-sm">
            {started ? "No person detected" : "Start camera to see live data"}
          </p>
        </div>
      );
    }

    switch (activeModule) {
      case "posture": {
        const r = result as PostureResult;
        const gradeColor =
          r.grade === "excellent" ? "text-green-400" :
          r.grade === "good"      ? "text-cyan-400"  :
          r.grade === "fair"      ? "text-yellow-400" : "text-red-400";
        return (
          <div className="p-5 space-y-4 font-mono text-sm">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-violet-400">{r.score}</span>
              <div className="mb-1">
                <div className="text-gray-600 text-xs">/ 100</div>
                <div className={`font-semibold uppercase text-sm ${gradeColor}`}>{r.grade}</div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-4 space-y-1">
              <Row label="Neck angle"      value={`${r.angles.neck}°`} />
              <Row label="Spine angle"     value={`${r.angles.spine}°`} />
              <Row label="Shoulder Δ"      value={`${r.angles.shoulderBalance} cm`} />
              <Row label="Forward head"    value={`${r.angles.forwardHeadDepth}`} />
              <Row label="Rounded shldrs"  value={`${r.angles.roundedShoulderDepth}`} />
              <Row label="Hip tilt"        value={`${r.angles.hipTilt}°`} />
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-2">Flags</div>
              {r.flags.length === 0
                ? <span className="text-green-400 text-xs">None</span>
                : r.flags.map(f => <div key={f} className="text-yellow-400 text-xs">• {f}</div>)
              }
            </div>
            <div className="border-t border-gray-800 pt-3">
              <Row label="Visibility" value={`${Math.round(r.bodyVisibility * 100)}%`} />
            </div>
          </div>
        );
      }
      case "movement": {
        const r = result as MovementResult;
        const ic: Record<string, string> = {
          still: "text-gray-400", low: "text-cyan-400",
          medium: "text-yellow-400", high: "text-red-400", "very high": "text-orange-400",
        };
        return (
          <div className="p-5 space-y-4 font-mono text-sm">
            <div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Intensity</div>
              <span className={`text-3xl font-bold uppercase ${ic[r.intensity] ?? "text-cyan-400"}`}>{r.intensity}</span>
            </div>
            <div className="border-t border-gray-800 pt-4 space-y-1">
              <Row label="Velocity"  value={`${r.velocityMs} m/s`} />
              <Row label="Direction" value={r.direction ?? "—"} />
              <Row label="Dominant"  value={r.dominantRegion ?? "none"} />
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-2">Active Zones</div>
              {r.activeZones.length === 0
                ? <span className="text-gray-600 text-xs">None</span>
                : r.activeZones.map(z => <div key={z} className="text-cyan-400 text-xs">• {z}</div>)
              }
            </div>
            {r.flags.length > 0 && (
              <div className="border-t border-gray-800 pt-3">
                <div className="text-gray-600 text-xs uppercase tracking-wider mb-2">Flags</div>
                {r.flags.map(f => <div key={f} className="text-cyan-300 text-xs">• {f}</div>)}
              </div>
            )}
            <div className="border-t border-gray-800 pt-3">
              <Row label="Visibility" value={`${Math.round(r.bodyVisibility * 100)}%`} />
            </div>
          </div>
        );
      }
      case "activity": {
        const r = result as ActivityResult;
        return (
          <div className="p-5 space-y-4 font-mono text-sm">
            <div>
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-1">Behavior</div>
              <span className="text-3xl font-bold uppercase text-green-400">{r.behavior}</span>
            </div>
            <div className="border-t border-gray-800 pt-4 space-y-1">
              <Row label="Gesture" value={r.gesture ?? "none"} />
              <Row
                label="Reps"
                value={r.repCalibrating ? "Calibrating…" : String(r.repCount)}
              />
            </div>
            <div className="border-t border-gray-800 pt-3">
              <Row label="Visibility" value={`${Math.round(r.bodyVisibility * 100)}%`} />
            </div>
          </div>
        );
      }
      case "presence": {
        const r = (result as PresenceResult | null) ?? {
          detected: false, dwellSeconds: 0, zoneOccupancy: {}, bodyVisibility: 0,
        };
        return (
          <div className="p-5 space-y-4 font-mono text-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${r.detected ? "bg-orange-400 animate-pulse" : "bg-gray-700"}`} />
              <span className={`text-2xl font-bold uppercase ${r.detected ? "text-orange-400" : "text-gray-500"}`}>
                {r.detected ? "Detected" : "Undetected"}
              </span>
            </div>
            <div className="border-t border-gray-800 pt-4 space-y-1">
              <Row label="Dwell time" value={`${r.dwellSeconds}s`} />
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="text-gray-600 text-xs uppercase tracking-wider mb-2">Zone Occupancy</div>
              {Object.entries(r.zoneOccupancy).map(([zone, occupied]) => (
                <div key={zone} className="flex items-center gap-2 text-xs py-0.5">
                  <div className={`w-2 h-2 rounded-full ${occupied ? "bg-orange-400" : "bg-gray-700"}`} />
                  <span className={occupied ? "text-orange-300" : "text-gray-600"}>{zone}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-3">
              <Row label="Visibility" value={`${Math.round(r.bodyVisibility * 100)}%`} />
            </div>
          </div>
        );
      }
    }
  };

  const activeConfig = MODULES.find(m => m.id === activeModule)!;

  return (
    <div className="min-h-screen bg-gray-950 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <div className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
            <span>&larr;</span> Back
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision Demo
          </span>
          <div className="w-16" />
        </div>
      </div>

      <div className="pt-14 flex flex-col">
        {/* Module Tabs */}
        <div className="border-b border-gray-800 bg-gray-900/40">
          <div className="max-w-6xl mx-auto px-4 flex gap-1 pt-3">
            {MODULES.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`px-5 py-2.5 rounded-t-lg text-sm font-medium border-b-2 transition-all ${
                  activeModule === m.id
                    ? TAB_ACTIVE[m.id]
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-6xl mx-auto w-full px-4 py-6 flex flex-col lg:flex-row gap-6">
          {/* Camera panel */}
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-gray-500 text-sm">{activeConfig.description}</p>

            <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                style={{ display: "none" }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: started ? "block" : "none" }}
              />

              {/* Idle */}
              {!started && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 flex items-center justify-center">
                    <svg className="w-9 h-9 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-semibold mb-1">Start Camera</h2>
                    <p className="text-gray-500 text-sm max-w-xs">Runs entirely in your browser. No data leaves this device.</p>
                  </div>
                  <button
                    onClick={startDetection}
                    className="px-7 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold text-sm shadow-lg shadow-violet-600/20"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/80">
                  <div className="w-9 h-9 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Loading AI model...</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                  <button
                    onClick={() => { setError(null); startDetection(); }}
                    className="px-5 py-2 rounded-full border border-gray-700 hover:border-gray-500 transition text-sm"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* FPS badge */}
              {started && (
                <div className="absolute bottom-3 right-3 bg-black/60 rounded-full px-3 py-1 text-xs font-mono text-gray-500">
                  {fps} fps
                </div>
              )}
            </div>

            {started && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFrozen(f => !f)}
                  className={`px-5 py-2 rounded-full border transition text-sm ${
                    frozen
                      ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                      : "border-gray-700 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {frozen ? "Unfreeze" : "Capture"}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-5 py-2 rounded-full border border-red-900 hover:border-red-600 hover:bg-red-600/10 transition text-sm text-red-400"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>

          {/* Stats panel */}
          <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-600 uppercase tracking-wider">
                  MODULE: {activeModule}
                </span>
                {result && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
              </div>
              {/* Panel body */}
              <div className="min-h-[280px]">
                {renderStats()}
              </div>
            </div>

            {/* API shape hint */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs font-mono text-gray-700 mb-2">{"// API response"}</div>
              <pre className="text-xs font-mono text-gray-500 leading-relaxed whitespace-pre-wrap">
{`POST /api/v1/analyze
{
  module: "${activeModule}",
  landmarks: [...]
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
