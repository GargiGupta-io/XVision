"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "curl" | "js" | "python";

const NAV = [
  { id: "intro",     label: "Introduction" },
  { id: "auth",      label: "Authentication" },
  { id: "analyze",   label: "POST /analyze" },
  { id: "posture",   label: "↳ Posture" },
  { id: "movement",  label: "↳ Movement" },
  { id: "activity",  label: "↳ Activity" },
  { id: "presence",  label: "↳ Presence" },
  { id: "modules",   label: "GET /modules" },
  { id: "health",    label: "GET /health" },
  { id: "errors",    label: "Errors" },
];

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto">
        <code>{children}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 text-xs text-gray-600 hover:text-gray-300 transition px-2 py-1 rounded border border-gray-800 bg-gray-950 opacity-0 group-hover:opacity-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Schema({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden text-sm">
      <div className="grid grid-cols-3 bg-gray-900 px-4 py-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
        <div>Field</div><div>Type</div><div>Description</div>
      </div>
      {rows.map(([field, type, desc]) => (
        <div key={field} className="grid grid-cols-3 px-4 py-2.5 border-t border-gray-800 text-gray-400 hover:bg-gray-900/40 transition">
          <code className="text-violet-400 text-xs">{field}</code>
          <code className="text-cyan-400 text-xs">{type}</code>
          <span className="text-gray-500 text-xs">{desc}</span>
        </div>
      ))}
    </div>
  );
}

const EXAMPLES: Record<string, Record<Lang, string>> = {
  analyze_posture: {
    curl: `curl -X POST https://api.xvision.dev/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: xv_live_..." \\
  -d '{
    "module": "posture",
    "landmarks": [
      {"x": 0.52, "y": 0.18, "z": -0.08, "visibility": 0.97},
      ... // 33 total
    ]
  }'`,
    js: `const res = await fetch('https://api.xvision.dev/api/v1/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'xv_live_...'
  },
  body: JSON.stringify({
    module: 'posture',
    landmarks: results.landmarks[0]  // from MediaPipe
  })
})

const { ok, data } = await res.json()
console.log(data.score)   // 84
console.log(data.grade)   // "good"
console.log(data.flags)   // ["forward_head (mild)"]`,
    python: `import httpx

res = httpx.post(
    "https://api.xvision.dev/api/v1/analyze",
    headers={"X-API-Key": "xv_live_..."},
    json={
        "module": "posture",
        "landmarks": landmarks  # list of 33 dicts
    }
)

data = res.json()["data"]
print(data["score"])   # 84
print(data["grade"])   # "good"
print(data["flags"])   # ["forward_head (mild)"]`,
  },

  response_posture: {
    curl: `{
  "ok": true,
  "data": {
    "module": "posture",
    "score": 84,
    "grade": "good",
    "flags": ["forward_head (mild)"],
    "angles": {
      "neck": 12.4,
      "spine": 3.1,
      "shoulder_balance": 1.2
    },
    "confidence": 0.91
  },
  "timestamp": 1710374400
}`,
    js: `{
  "ok": true,
  "data": {
    "module": "posture",
    "score": 84,
    "grade": "good",
    "flags": ["forward_head (mild)"],
    "angles": {
      "neck": 12.4,
      "spine": 3.1,
      "shoulder_balance": 1.2
    },
    "confidence": 0.91
  },
  "timestamp": 1710374400
}`,
    python: `{
  "ok": True,
  "data": {
    "module": "posture",
    "score": 84,
    "grade": "good",
    "flags": ["forward_head (mild)"],
    "angles": {
      "neck": 12.4,
      "spine": 3.1,
      "shoulder_balance": 1.2
    },
    "confidence": 0.91
  },
  "timestamp": 1710374400
}`,
  },

  analyze_movement: {
    curl: `curl -X POST https://api.xvision.dev/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: xv_live_..." \\
  -d '{"module": "movement", "landmarks": [...]}'`,
    js: `const { data } = await xv.analyze({
  module: 'movement',
  landmarks: results.landmarks[0]
})
console.log(data.intensity)      // "medium"
console.log(data.active_zones)   // ["arms", "torso"]`,
    python: `data = client.analyze("movement", landmarks)
print(data["intensity"])      # "medium"
print(data["active_zones"])   # ["arms", "torso"]`,
  },

  analyze_activity: {
    curl: `curl -X POST https://api.xvision.dev/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: xv_live_..." \\
  -d '{"module": "activity", "landmarks": [...]}'`,
    js: `const { data } = await xv.analyze({
  module: 'activity',
  landmarks: results.landmarks[0]
})
console.log(data.behavior)   // "gesturing"
console.log(data.gesture)    // "wave"`,
    python: `data = client.analyze("activity", landmarks)
print(data["behavior"])   # "gesturing"
print(data["gesture"])    # "wave"`,
  },

  analyze_presence: {
    curl: `curl -X POST https://api.xvision.dev/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: xv_live_..." \\
  -d '{"module": "presence", "landmarks": [...]}'`,
    js: `const { data } = await xv.analyze({
  module: 'presence',
  landmarks: results.landmarks[0]
})
console.log(data.detected)         // true
console.log(data.dwell_seconds)    // 47
console.log(data.zone_occupancy)   // { upper: false, middle: true, lower: true }`,
    python: `data = client.analyze("presence", landmarks)
print(data["detected"])         # True
print(data["dwell_seconds"])    # 47
print(data["zone_occupancy"])   # {"upper": False, "middle": True, "lower": True}`,
  },

  modules_list: {
    curl: `curl https://api.xvision.dev/api/v1/modules \\
  -H "X-API-Key: xv_live_..."`,
    js: `const res = await fetch('https://api.xvision.dev/api/v1/modules', {
  headers: { 'X-API-Key': 'xv_live_...' }
})
const { data } = await res.json()`,
    python: `res = httpx.get(
    "https://api.xvision.dev/api/v1/modules",
    headers={"X-API-Key": "xv_live_..."}
)`,
  },

  error: {
    curl: `{
  "ok": false,
  "error": "invalid_landmarks",
  "message": "Expected 33 landmarks, got 12"
}`,
    js: `{
  "ok": false,
  "error": "invalid_landmarks",
  "message": "Expected 33 landmarks, got 12"
}`,
    python: `{
  "ok": False,
  "error": "invalid_landmarks",
  "message": "Expected 33 landmarks, got 12"
}`,
  },
};

export default function DocsPage() {
  const [lang, setLang] = useState<Lang>("js");

  const ex = (key: string) => EXAMPLES[key]?.[lang] ?? "";

  return (
    <div className="min-h-screen bg-gray-950 text-white font-[family-name:var(--font-geist-sans)] flex flex-col">
      {/* Header */}
      <div className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              XVision
            </Link>
            <span className="text-gray-700">|</span>
            <span className="text-sm text-gray-400">API Reference</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="text-sm text-gray-400 hover:text-white transition">Live Demo</Link>
            <a
              href="https://github.com/GargiGupta-io/XVision"
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="flex pt-14 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-800 py-8 pr-4">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-3 px-3">Endpoints</div>
          {NAV.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block px-3 py-1.5 text-sm rounded transition hover:text-white hover:bg-gray-800/50 ${
                item.label.startsWith("↳")
                  ? "text-gray-600 pl-6 text-xs"
                  : "text-gray-400"
              }`}
            >
              {item.label}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-8 py-8">
          {/* Language tabs — sticky */}
          <div className="sticky top-14 z-40 bg-gray-950/95 backdrop-blur-sm pb-4 mb-2">
            <div className="flex gap-1 w-fit">
              {(["curl", "js", "python"] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono transition ${
                    lang === l
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}
                >
                  {l === "js" ? "JavaScript" : l === "python" ? "Python" : "curl"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Introduction ── */}
          <section id="intro" className="mb-16 scroll-mt-28">
            <h1 className="text-3xl font-bold mb-4">API Reference</h1>
            <p className="text-gray-400 leading-relaxed mb-4">
              The XVision API takes raw MediaPipe body landmarks and returns structured detection
              data from any of the 4 modules. All requests are HTTPS. All responses are JSON.
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 font-mono text-sm">
              <div className="text-gray-500 text-xs mb-2">Base URL</div>
              <code className="text-cyan-400">https://api.xvision.dev</code>
            </div>
          </section>

          {/* ── Authentication ── */}
          <section id="auth" className="mb-16 scroll-mt-28">
            <h2 className="text-xl font-bold mb-3">Authentication</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Pass your API key in the <code className="text-violet-400 bg-gray-900 px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header on every request.
              Get your key from the dashboard after signing up.
            </p>
            <Schema rows={[
              ["X-API-Key", "string", "Your API key. Required on all endpoints."],
            ]} />
          </section>

          {/* ── POST /analyze ── */}
          <section id="analyze" className="mb-10 scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs font-mono font-bold">POST</span>
              <code className="text-gray-200 font-mono">/api/v1/analyze</code>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Run a detection module on a set of 33 MediaPipe pose landmarks.
              Returns structured data shaped for your industry use case.
            </p>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Request body</h3>
            <Schema rows={[
              ["module", '"posture" | "movement" | "activity" | "presence"', "Which detection module to run"],
              ["landmarks", "Landmark[33]", "Array of exactly 33 MediaPipe pose landmarks"],
              ["config", "object", "Optional module-specific config (default: {})"],
            ]} />
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Landmark object</h3>
              <Schema rows={[
                ["x", "float", "Normalized horizontal position (0–1)"],
                ["y", "float", "Normalized vertical position (0–1)"],
                ["z", "float", "Depth relative to hips"],
                ["visibility", "float?", "Confidence score 0–1 (optional)"],
              ]} />
            </div>
          </section>

          {/* ── Posture ── */}
          <section id="posture" className="mb-14 scroll-mt-28 pl-4 border-l border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <h3 className="font-semibold">Posture module</h3>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Spinal alignment score, posture grade, and specific flags for head, spine, and shoulder issues.
            </p>
            <div className="grid lg:grid-cols-2 gap-4 mb-5">
              <div>
                <div className="text-xs text-gray-600 font-mono mb-2">Request</div>
                <Code>{ex("analyze_posture")}</Code>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-mono mb-2">Response</div>
                <Code>{ex("response_posture")}</Code>
              </div>
            </div>
            <Schema rows={[
              ["score", "integer 0–100", "Overall posture alignment score"],
              ["grade", '"excellent" | "good" | "fair" | "poor"', "Human-readable grade"],
              ["flags", "string[]", "Active posture issues (forward_head, lateral_lean, shoulder_imbalance)"],
              ["angles.neck", "float", "Head tilt from vertical in degrees (ideal ≤ 10°)"],
              ["angles.spine", "float", "Torso lean from vertical in degrees (ideal ≤ 8°)"],
              ["angles.shoulder_balance", "float", "Left/right shoulder height difference"],
              ["confidence", "float 0–1", "Fraction of landmarks with visibility > 0.5"],
            ]} />
          </section>

          {/* ── Movement ── */}
          <section id="movement" className="mb-14 scroll-mt-28 pl-4 border-l border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h3 className="font-semibold">Movement module</h3>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Motion intensity, which body regions are active, and the dominant moving region.
            </p>
            <Code>{ex("analyze_movement")}</Code>
            <div className="mt-4">
              <Schema rows={[
                ["intensity", '"still" | "low" | "medium" | "high"', "Overall motion level"],
                ["active_zones", "string[]", "Body regions with meaningful motion (head, torso, arms, hips, legs)"],
                ["dominant_region", "string | null", "The single most-active body region"],
                ["velocity", "float", "Raw aggregate motion score (0–1)"],
                ["confidence", "float 0–1", "Landmark visibility score"],
              ]} />
            </div>
          </section>

          {/* ── Activity ── */}
          <section id="activity" className="mb-14 scroll-mt-28 pl-4 border-l border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <h3 className="font-semibold">Activity module</h3>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              High-level behavior classification, gesture recognition, and repetition counting.
            </p>
            <Code>{ex("analyze_activity")}</Code>
            <div className="mt-4">
              <Schema rows={[
                ["behavior", '"idle" | "walking" | "exercising" | "reaching" | "gesturing"', "Classified activity"],
                ["gesture", '"wave" | "raise_hand" | "reach" | null', "Detected gesture, or null"],
                ["repetition_count", "integer", "Cumulative reps (requires session tracking)"],
                ["confidence", "float 0–1", "Landmark visibility score"],
              ]} />
            </div>
          </section>

          {/* ── Presence ── */}
          <section id="presence" className="mb-14 scroll-mt-28 pl-4 border-l border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <h3 className="font-semibold">Presence module</h3>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Person detection, dwell time tracking, and configurable zone occupancy.
            </p>
            <Code>{ex("analyze_presence")}</Code>
            <div className="mt-4">
              <Schema rows={[
                ["detected", "boolean", "True if a person is present in frame"],
                ["dwell_seconds", "integer", "Seconds person has been continuously detected (requires session)"],
                ["zone_occupancy", "Record<string, boolean>", "Whether key landmarks are in each zone"],
                ["confidence", "float 0–1", "Landmark visibility score"],
              ]} />
            </div>
          </section>

          {/* ── GET /modules ── */}
          <section id="modules" className="mb-14 scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-mono font-bold">GET</span>
              <code className="text-gray-200 font-mono">/api/v1/modules</code>
            </div>
            <p className="text-gray-400 text-sm mb-5">List all available detection modules with descriptions.</p>
            <Code>{ex("modules_list")}</Code>
          </section>

          {/* ── GET /health ── */}
          <section id="health" className="mb-14 scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-mono font-bold">GET</span>
              <code className="text-gray-200 font-mono">/api/health</code>
            </div>
            <p className="text-gray-400 text-sm mb-5">Returns server status and uptime. No auth required.</p>
            <Code>{`{ "ok": true, "data": { "status": "ok", "version": "1.0.0", "uptime_seconds": 3842 }, "timestamp": 1710374400 }`}</Code>
          </section>

          {/* ── Errors ── */}
          <section id="errors" className="mb-16 scroll-mt-28">
            <h2 className="text-xl font-bold mb-3">Errors</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              All errors return <code className="text-violet-400 bg-gray-900 px-1 rounded text-xs">ok: false</code> with
              a machine-readable <code className="text-violet-400 bg-gray-900 px-1 rounded text-xs">error</code> code
              and a human-readable <code className="text-violet-400 bg-gray-900 px-1 rounded text-xs">message</code>.
            </p>
            <Code>{ex("error")}</Code>
            <div className="mt-5">
              <Schema rows={[
                ["invalid_landmarks", "422", "Fewer than 33 landmarks provided"],
                ["unknown_module", "400", "Module name not recognized"],
                ["unauthorized", "401", "Missing or invalid API key"],
                ["rate_limited", "429", "Too many requests — upgrade your plan"],
              ]} />
            </div>
          </section>

          {/* Footer CTA */}
          <div className="border-t border-gray-800 pt-10 pb-16 text-center">
            <p className="text-gray-500 text-sm mb-4">Ready to integrate?</p>
            <Link
              href="/demo"
              className="inline-block px-7 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-medium text-sm"
            >
              Try the live demo first →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
