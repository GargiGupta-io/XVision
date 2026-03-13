"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";

// MediaPipe pose connections (pairs of landmark indices to draw lines between)
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32],
];

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export default function DetectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStarted(false);
    setLandmarkCount(0);
    setConfidence(0);
    setFps(0);
  }, []);

  const drawLandmarks = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: Landmark[], w: number, h: number) => {
      // Draw connections
      ctx.strokeStyle = "rgba(167, 139, 250, 0.6)";
      ctx.lineWidth = 2;
      for (const [i, j] of POSE_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b) continue;
        if ((a.visibility ?? 0) < 0.3 || (b.visibility ?? 0) < 0.3) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
      }
      // Draw landmarks
      for (const lm of landmarks) {
        if ((lm.visibility ?? 0) < 0.3) continue;
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "rgb(34, 211, 238)";
        ctx.fill();
        ctx.strokeStyle = "rgb(17, 94, 107)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    []
  );

  const startDetection = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load MediaPipe via script tag (webpack can't handle CDN imports)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (!w.vision) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector('script[data-mediapipe]')) {
            const check = setInterval(() => {
              if (w.vision) { clearInterval(check); resolve(); }
            }, 100);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
          script.type = "module";
          script.dataset.mediapipe = "true";
          // Use module import approach
          const moduleScript = document.createElement("script");
          moduleScript.type = "module";
          moduleScript.textContent = `
            import { PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
            window.vision = { PoseLandmarker, FilesetResolver };
            window.dispatchEvent(new Event("mediapipe-ready"));
          `;
          document.head.appendChild(moduleScript);
          window.addEventListener("mediapipe-ready", () => resolve(), { once: true });
          setTimeout(() => reject(new Error("Timeout loading MediaPipe")), 30000);
        });
      }

      const { PoseLandmarker, FilesetResolver } = w.vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        }
      );
    } catch {
      setError("Failed to load MediaPipe AI model. Check your internet connection.");
      setLoading(false);
      return;
    }

    // Start camera
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

    // FPS counter
    frameCountRef.current = 0;
    fpsIntervalRef.current = setInterval(() => {
      setFps(frameCountRef.current * 2);
      frameCountRef.current = 0;
    }, 500);

    // Detection loop
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

      // Draw video frame
      ctx.drawImage(video, 0, 0);

      // Run detection
      const now = performance.now();
      if (now - lastTimeRef.current > 0) {
        try {
          const results = poseLandmarker.detectForVideo(video, now);
          if (results.landmarks && results.landmarks.length > 0) {
            const lms = results.landmarks[0] as Landmark[];
            setLandmarkCount(lms.length);
            const avgVis =
              lms.reduce((s, l) => s + (l.visibility ?? 0), 0) / lms.length;
            setConfidence(Math.round(avgVis * 100));
            drawLandmarks(ctx, lms, canvas.width, canvas.height);
          } else {
            setLandmarkCount(0);
            setConfidence(0);
          }
        } catch {
          // Skip frame on error
        }
        lastTimeRef.current = now;
        frameCountRef.current++;
      }

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);
  }, [facingMode, drawLandmarks]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  // Restart when facingMode changes (after switch)
  useEffect(() => {
    if (!started && facingMode) {
      // Don't auto-start on mount
    }
  }, [facingMode, started]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gray-950 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <div className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
          >
            <span>&larr;</span> Back
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </span>
          <div className="w-16" />
        </div>
      </div>

      <div className="pt-14 flex flex-col items-center">
        {/* Stats Bar */}
        {started && (
          <div className="w-full bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  landmarkCount > 0 ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-gray-400">
                {landmarkCount > 0 ? "Detecting" : "No pose"}
              </span>
            </div>
            <div className="text-gray-500">
              FPS: <span className="text-cyan-400 font-mono">{fps}</span>
            </div>
            <div className="text-gray-500">
              Landmarks:{" "}
              <span className="text-violet-400 font-mono">{landmarkCount}</span>
            </div>
            <div className="text-gray-500">
              Confidence:{" "}
              <span className="text-green-400 font-mono">{confidence}%</span>
            </div>
          </div>
        )}

        {/* Camera / Canvas Area */}
        <div className="relative w-full max-w-2xl aspect-[4/3] bg-gray-900 rounded-b-2xl overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            style={{ display: started ? "none" : "none" }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ display: started ? "block" : "none" }}
          />

          {/* Idle State */}
          {!started && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/30 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Live Pose Detection</h2>
                <p className="text-gray-500 text-sm max-w-sm">
                  Allow camera access to start real-time AI pose detection. Your data never leaves this device.
                </p>
              </div>
              <button
                onClick={startDetection}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold shadow-lg shadow-violet-600/25"
              >
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
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl">
                !
              </div>
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  startDetection();
                }}
                className="px-6 py-2 rounded-full border border-gray-700 hover:border-gray-500 transition text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        {started && (
          <div className="flex gap-4 mt-6 mb-10">
            <button
              onClick={switchCamera}
              className="px-6 py-2.5 rounded-full border border-gray-700 hover:border-violet-500/50 transition text-sm text-gray-300"
            >
              Switch Camera
            </button>
            <button
              onClick={stopCamera}
              className="px-6 py-2.5 rounded-full border border-red-800 hover:border-red-600 hover:bg-red-600/10 transition text-sm text-red-400"
            >
              Stop
            </button>
          </div>
        )}

        {/* Info */}
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            How it works
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            XVision uses Google&apos;s MediaPipe Pose Landmarker to detect 33 body landmarks
            in real-time. The AI model runs entirely in your browser using WebAssembly and
            GPU acceleration. No data is sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
