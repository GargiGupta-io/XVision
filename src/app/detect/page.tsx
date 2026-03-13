"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { analyzePose, type Landmark } from "@/lib/pose/analyzer";
import { analyzePosture, type PostureResult } from "@/lib/modules/posture";
import { analyzeMovement, type MovementResult } from "@/lib/modules/movement";
import { analyzeActivity, type ActivityResult } from "@/lib/modules/activity";
import { analyzePresence, type PresenceResult } from "@/lib/modules/presence";

const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32],
];

interface AllModuleResults {
  posture: PostureResult;
  movement: MovementResult;
  activity: ActivityResult;
  presence: PresenceResult;
}

export default function DetectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const prevLandmarksRef = useRef<Landmark[] | null>(null);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [results, setResults] = useState<AllModuleResults | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    prevLandmarksRef.current = null;
    setStarted(false);
    setResults(null);
    setFps(0);
  }, []);

  const drawSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    w: number, h: number,
    scoreColor: string
  ) => {
    ctx.lineWidth = 2;
    for (const [i, j] of POSE_CONNECTIONS) {
      const a = landmarks[i], b = landmarks[j];
      if (!a || !b) continue;
      if ((a.visibility ?? 0) < 0.3 || (b.visibility ?? 0) < 0.3) continue;
      ctx.strokeStyle = `${scoreColor}80`;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    for (const lm of landmarks) {
      if ((lm.visibility ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
      ctx.fillStyle = scoreColor;
      ctx.fill();
    }
  }, []);

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
          setTimeout(() => reject(new Error("Timeout loading MediaPipe")), 30000);
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PoseLandmarker, FilesetResolver } = (window as any).vision;
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
      setError("Failed to load MediaPipe AI model. Check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
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
      if (now - lastTimeRef.current > 0) {
        try {
          const detection = poseLandmarker.detectForVideo(video, now);
          if (detection.landmarks?.length > 0) {
            const lms = detection.landmarks[0] as Landmark[];
            const analyzerOut = analyzePose(lms, prevLandmarksRef.current);
            prevLandmarksRef.current = lms;

            // Run all 4 modules
            const posture  = analyzePosture(analyzerOut);
            const movement = analyzeMovement(analyzerOut);
            const activity = analyzeActivity(analyzerOut);
            const presence = analyzePresence(analyzerOut);

            // Skeleton color = posture score
            const scoreColor =
              posture.score >= 80 ? "#22c55e" :
              posture.score >= 60 ? "#eab308" : "#ef4444";
            drawSkeleton(ctx, lms, canvas.width, canvas.height, scoreColor);

            setResults({ posture, movement, activity, presence });
          } else {
            prevLandmarksRef.current = null;
            setResults(null);
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
  }, [facingMode, drawSkeleton]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const postureColor =
    !results ? "text-gray-600" :
    results.posture.score >= 80 ? "text-green-400" :
    results.posture.score >= 60 ? "text-yellow-400" : "text-red-400";

  const intensityColor: Record<string, string> = {
    still: "text-gray-500", low: "text-cyan-400",
    medium: "text-yellow-400", high: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-gray-950 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <div className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
            <span>&larr;</span> Back
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </span>
          <div className="w-16" />
        </div>
      </div>

      <div className="pt-14 flex flex-col items-center">
        {/* Status bar */}
        {started && (
          <div className="w-full bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${results ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-gray-400">{results ? "Detecting" : "No pose"}</span>
            </div>
            <div className="text-gray-500">
              FPS: <span className="text-cyan-400 font-mono">{fps}</span>
            </div>
            <div className="text-gray-500">
              Confidence: <span className="text-green-400 font-mono">
                {results ? `${Math.round(results.posture.confidence * 100)}%` : "—"}
              </span>
            </div>
          </div>
        )}

        {/* Camera / Canvas */}
        <div className="relative w-full max-w-2xl aspect-[4/3] bg-gray-900 rounded-b-2xl overflow-hidden">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted style={{ display: "none" }} />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ display: started ? "block" : "none" }} />

          {/* Idle */}
          {!started && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Live Pose Detection</h2>
                <p className="text-gray-500 text-sm max-w-sm">All 4 modules running simultaneously. Your data never leaves this device.</p>
              </div>
              <button onClick={startDetection} className="px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold shadow-lg shadow-violet-600/25">
                Start Camera
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950/80">
              <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading AI model...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button onClick={() => { setError(null); startDetection(); }} className="px-6 py-2 rounded-full border border-gray-700 hover:border-gray-500 transition text-sm">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Module output grid — all 4 at once */}
        {started && (
          <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800 border-x border-b border-gray-800 rounded-b-2xl overflow-hidden mb-6">
            {/* Posture */}
            <div className="bg-gray-950 px-4 py-3">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Posture</div>
              <div className={`text-2xl font-bold font-mono ${postureColor}`}>
                {results ? results.posture.score : "—"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {results ? results.posture.grade : "no pose"}
              </div>
            </div>

            {/* Movement */}
            <div className="bg-gray-950 px-4 py-3">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Movement</div>
              <div className={`text-lg font-bold font-mono uppercase ${results ? intensityColor[results.movement.intensity] : "text-gray-600"}`}>
                {results ? results.movement.intensity : "—"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {results?.movement.dominantRegion ?? "no pose"}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-gray-950 px-4 py-3">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Activity</div>
              <div className="text-lg font-bold font-mono uppercase text-green-400">
                {results ? results.activity.behavior : "—"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {results?.activity.gesture ?? (results ? "no gesture" : "no pose")}
              </div>
            </div>

            {/* Presence */}
            <div className="bg-gray-950 px-4 py-3">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Presence</div>
              <div className={`text-lg font-bold font-mono ${results?.presence.detected ? "text-orange-400" : "text-gray-600"}`}>
                {results ? (results.presence.detected ? "PRESENT" : "EMPTY") : "—"}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {results?.presence.detected ? `${results.presence.dwellSeconds}s dwell` : "no pose"}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {started && (
          <div className="flex gap-4 mb-10">
            <button onClick={switchCamera} className="px-6 py-2.5 rounded-full border border-gray-700 hover:border-violet-500/50 transition text-sm text-gray-300">
              Switch Camera
            </button>
            <button onClick={stopCamera} className="px-6 py-2.5 rounded-full border border-red-800 hover:border-red-600 hover:bg-red-600/10 transition text-sm text-red-400">
              Stop
            </button>
          </div>
        )}

        {/* Info */}
        {!started && (
          <div className="max-w-2xl mx-auto px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">How it works</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              XVision uses Google&apos;s MediaPipe Pose Landmarker to detect 33 body landmarks in real-time.
              All 4 modules run simultaneously — posture score, movement intensity, activity behavior, and presence detection.
              The AI model runs entirely in your browser. No data is sent to any server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
