"use client";

import { useState } from "react";
import Link from "next/link";

const STATS = [
  { value: "33", label: "body landmarks" },
  { value: "<100ms", label: "latency" },
  { value: "browser-native", label: "no server needed" },
  { value: "no data stored", label: "privacy-first" },
];

const USE_CASES = [
  {
    id: "healthcare",
    label: "Healthcare",
    headline: "Posture screening at scale",
    body: "Detect forward head posture, spinal misalignment, and shoulder imbalance in real time. Works from any webcam — no wearables, no clinic equipment.",
    module: "Posture Module",
    output: `{
  score: 74,
  grade: "fair",
  flags: ["forward_head (mild)"],
  angles: { neck: 14.2, spine: 6.1 }
}`,
    accent: "violet",
  },
  {
    id: "retail",
    label: "Retail",
    headline: "Understand how people move through your space",
    body: "Track dwell time per zone, detect when customers enter or leave areas, and measure engagement — all from a single overhead or shelf-mounted camera.",
    module: "Presence Module",
    output: `{
  detected: true,
  dwellSeconds: 47,
  zoneOccupancy: {
    upper: false,
    middle: true,
    lower: true
  }
}`,
    accent: "orange",
  },
  {
    id: "workplace",
    label: "Workplace",
    headline: "Ergonomics and safety monitoring",
    body: "Flag poor posture before it becomes injury. Monitor repetitive motion patterns. Detect unsafe body positions in real time on the factory floor or at the desk.",
    module: "Movement Module",
    output: `{
  intensity: "medium",
  dominantRegion: "arms",
  activeZones: ["arms", "torso"],
  velocity: 0.124
}`,
    accent: "cyan",
  },
  {
    id: "education",
    label: "Education",
    headline: "Measure physical engagement",
    body: "Detect when students are active vs passive. Count exercise repetitions, identify gestures, and track behavior patterns across a session.",
    module: "Activity Module",
    output: `{
  behavior: "exercising",
  gesture: "raise hand",
  repetitionCount: 12,
  confidence: 0.91
}`,
    accent: "green",
  },
];

const ACCENT_CLASSES: Record<string, { tab: string; badge: string; dot: string }> = {
  violet: {
    tab: "border-violet-500 text-violet-300 bg-violet-500/10",
    badge: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    dot: "bg-violet-400",
  },
  orange: {
    tab: "border-orange-500 text-orange-300 bg-orange-500/10",
    badge: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    dot: "bg-orange-400",
  },
  cyan: {
    tab: "border-cyan-500 text-cyan-300 bg-cyan-500/10",
    badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    dot: "bg-cyan-400",
  },
  green: {
    tab: "border-green-500 text-green-300 bg-green-500/10",
    badge: "bg-green-500/10 text-green-300 border-green-500/20",
    dot: "bg-green-400",
  },
};

const SDK_SNIPPET = `import XVision from '@xvision/sdk'

const xv = new XVision({ apiKey: 'xv_live_...' })

await xv.start({
  module: 'posture',
  camera: 'user',
  onResult: (data) => {
    console.log(data.score)     // 84
    console.log(data.grade)     // "good"
    console.log(data.flags)     // ["forward_head"]
  }
})`;

export default function Home() {
  const [activeCase, setActiveCase] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SDK_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active = USE_CASES[activeCase];
  const ac = ACCENT_CLASSES[active.accent];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-[family-name:var(--font-geist-sans)]">

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </span>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#use-cases" className="text-sm text-gray-400 hover:text-white transition">Features</a>
            <Link href="/demo" className="text-sm text-gray-400 hover:text-white transition">Demo</Link>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</a>
          </div>
          <Link
            href="/demo"
            className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition font-medium"
          >
            Try Demo →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/8 rounded-full blur-[140px]" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium">
            AI Vision Infrastructure
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-transparent">
              AI Vision Infrastructure
            </span>
            <br />
            <span className="text-white">for Any Industry</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            One SDK. Any camera. Detect posture, movement, activity and presence —
            structured data your business can act on.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              href="/demo"
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold shadow-lg shadow-violet-600/25"
            >
              See Live Demo
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-3.5 rounded-full border border-gray-700 hover:border-gray-500 transition text-gray-300 font-medium"
            >
              View API Docs
            </a>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-px bg-gray-800 rounded-2xl overflow-hidden border border-gray-800">
            {STATS.map((s) => (
              <div key={s.label} className="flex-1 min-w-[140px] bg-gray-950 px-6 py-4 text-center">
                <div className="text-white font-bold font-mono">{s.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for Every Industry</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              The same detection engine, adapted to what each business actually needs.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {USE_CASES.map((uc, i) => (
              <button
                key={uc.id}
                onClick={() => setActiveCase(i)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  activeCase === i
                    ? ac.tab
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {uc.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono border ${ac.badge}`}>
                {active.module}
              </span>
              <h3 className="text-2xl font-bold">{active.headline}</h3>
              <p className="text-gray-400 leading-relaxed">{active.body}</p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mt-2"
              >
                Try it live →
              </Link>
            </div>

            {/* Output panel */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${ac.dot}`} />
                <span className="text-xs font-mono text-gray-500">live output</span>
              </div>
              <pre className="p-5 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto">
                <code>{active.output}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Integrate in Minutes</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Three steps from zero to structured vision data in your product.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Embed one script tag",
                desc: "Drop the XVision SDK into your page. Works with any frontend — React, Vue, vanilla JS.",
              },
              {
                step: "02",
                title: "Configure your module",
                desc: "Choose posture, movement, activity, or presence. Pass your API key and camera source.",
              },
              {
                step: "03",
                title: "Receive structured events",
                desc: "Get typed JSON on every frame. Score, flags, zones, behaviors — ready to use in your app.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-bold font-mono text-gray-800 mb-4">{s.step}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Code Block */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">10 Lines to Production</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Structured vision data in your app with less code than a form validation.
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
              </div>
              <span className="text-xs font-mono text-gray-600">JavaScript</span>
              <button
                onClick={handleCopy}
                className="text-xs text-gray-500 hover:text-white transition px-3 py-1 rounded border border-gray-800 hover:border-gray-600"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
              <code>
                <span className="text-violet-400">import</span>
                <span className="text-gray-300"> XVision </span>
                <span className="text-violet-400">from</span>
                <span className="text-green-300"> &apos;@xvision/sdk&apos;</span>
                {"\n\n"}
                <span className="text-gray-500">{"// Initialize with your API key"}</span>
                {"\n"}
                <span className="text-cyan-400">const</span>
                <span className="text-gray-300"> xv = </span>
                <span className="text-cyan-400">new</span>
                <span className="text-yellow-300"> XVision</span>
                <span className="text-gray-300">{"({ apiKey: "}</span>
                <span className="text-green-300">&apos;xv_live_...&apos;</span>
                <span className="text-gray-300">{" })"}</span>
                {"\n\n"}
                <span className="text-violet-400">await</span>
                <span className="text-gray-300"> xv.</span>
                <span className="text-yellow-300">start</span>
                <span className="text-gray-300">{"({"}</span>
                {"\n"}
                <span className="text-gray-300">{"  module: "}</span>
                <span className="text-green-300">&apos;posture&apos;</span>
                <span className="text-gray-300">{","}</span>
                {"\n"}
                <span className="text-gray-300">{"  camera: "}</span>
                <span className="text-green-300">&apos;user&apos;</span>
                <span className="text-gray-300">{","}</span>
                {"\n"}
                <span className="text-gray-300">{"  onResult: (data) => {"}</span>
                {"\n"}
                <span className="text-gray-500">{"    // structured data every frame"}</span>
                {"\n"}
                <span className="text-gray-300">{"    console.log(data.score)   "}</span>
                <span className="text-gray-600">{"// 84"}</span>
                {"\n"}
                <span className="text-gray-300">{"    console.log(data.grade)   "}</span>
                <span className="text-gray-600">{"// \"good\""}</span>
                {"\n"}
                <span className="text-gray-300">{"    console.log(data.flags)   "}</span>
                <span className="text-gray-600">{"// [\"forward_head\"]"}</span>
                {"\n"}
                <span className="text-gray-300">{"  }"}</span>
                {"\n"}
                <span className="text-gray-300">{"})"}</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-gray-500 max-w-md mx-auto">Start free. Scale when you need to.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "For developers exploring the API.",
                features: ["1,000 API calls/month", "All 4 modules", "Browser SDK", "Community support"],
                cta: "Start Free",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$49",
                period: "/month",
                desc: "For teams building production apps.",
                features: ["100,000 API calls/month", "All 4 modules", "Session analytics", "Email support"],
                cta: "Start Pro",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For large-scale deployments.",
                features: ["Unlimited API calls", "On-premise option", "SLA guarantee", "Dedicated support"],
                cta: "Contact Us",
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-7 border flex flex-col gap-5 ${
                  tier.highlight
                    ? "bg-gradient-to-b from-violet-950/60 to-gray-900 border-violet-500/40"
                    : "bg-gray-900 border-gray-800"
                }`}
              >
                {tier.highlight && (
                  <div className="text-xs font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 self-start">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold mb-1">{tier.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-gray-500 text-sm">{tier.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">{tier.desc}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-violet-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition ${
                    tier.highlight
                      ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
                      : "border border-gray-700 hover:border-gray-500 text-gray-300"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            See it working in 30 seconds
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Open the demo, point your camera, and watch the structured data flow. No account needed.
          </p>
          <Link
            href="/demo"
            className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold text-lg shadow-lg shadow-violet-600/25"
          >
            Open Live Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/demo" className="hover:text-white transition">Demo</Link>
            <a href="#how-it-works" className="hover:text-white transition">Docs</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="https://github.com/GargiGupta-io/XVision" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
          </div>
          <span className="text-sm text-gray-600">
            Built by{" "}
            <a href="https://github.com/GargiGupta-io" className="text-gray-500 hover:text-white transition" target="_blank" rel="noopener noreferrer">
              Gargi Gupta
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
