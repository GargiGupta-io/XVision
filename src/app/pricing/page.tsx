"use client";

import { useState } from "react";
import Link from "next/link";

const TIERS = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    desc: "For developers exploring and prototyping.",
    cta: "Start Free",
    ctaHref: "/demo",
    highlight: false,
    features: {
      "API calls / month": "1,000",
      "Modules": "All 4",
      "Browser SDK": true,
      "Session analytics": false,
      "Custom zones": false,
      "Webhook events": false,
      "SLA": false,
      "Support": "Community",
    },
  },
  {
    name: "Pro",
    monthly: 49,
    annual: 39,
    desc: "For teams building production applications.",
    cta: "Start Pro",
    ctaHref: "/demo",
    highlight: true,
    features: {
      "API calls / month": "100,000",
      "Modules": "All 4",
      "Browser SDK": true,
      "Session analytics": true,
      "Custom zones": true,
      "Webhook events": false,
      "SLA": false,
      "Support": "Email",
    },
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    desc: "For large-scale or regulated deployments.",
    cta: "Contact Sales",
    ctaHref: "mailto:hello@xvision.dev",
    highlight: false,
    features: {
      "API calls / month": "Unlimited",
      "Modules": "All 4",
      "Browser SDK": true,
      "Session analytics": true,
      "Custom zones": true,
      "Webhook events": true,
      "SLA": true,
      "Support": "Dedicated",
    },
  },
];

const FEATURE_ROWS = [
  "API calls / month",
  "Modules",
  "Browser SDK",
  "Session analytics",
  "Custom zones",
  "Webhook events",
  "SLA",
  "Support",
];

const FAQ = [
  {
    q: "What counts as an API call?",
    a: "Each POST to /api/v1/analyze is one API call. Browser-only usage (the SDK running detection client-side) does not count against your quota — only server-side API calls do.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the end of your billing period.",
  },
  {
    q: "What happens when I hit my limit?",
    a: "API calls over the limit return a 429 response with an upgrade prompt. Browser SDK detection is unaffected — it runs locally and has no quota.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "The Free plan is essentially a permanent trial. You can build, test, and integrate without a time limit — just with a lower monthly quota.",
  },
  {
    q: "Do you store any video or landmark data?",
    a: "No. When using the browser SDK, all processing happens on-device — nothing is transmitted. Server-side API calls receive landmarks (coordinate numbers), not video, and we don't persist them.",
  },
];

function Check() {
  return (
    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Cross() {
  return <span className="text-gray-700 text-lg leading-none">—</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/demo" className="text-sm text-gray-400 hover:text-white transition">Demo</Link>
            <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition">Docs</Link>
          </div>
          <Link href="/demo" className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition font-medium">
            Try Demo →
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-32 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-gray-400 max-w-md mx-auto">
              Start free. No credit card required. Scale when your usage does.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={`text-sm ${!annual ? "text-white" : "text-gray-500"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${annual ? "bg-violet-600" : "bg-gray-700"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${annual ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm ${annual ? "text-white" : "text-gray-500"}`}>
              Annual
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400 font-medium">
                Save 20%
              </span>
            </span>
          </div>

          {/* Tier cards */}
          <div className="grid sm:grid-cols-3 gap-5 mb-16">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className={`rounded-2xl p-7 border flex flex-col gap-5 ${
                  tier.highlight
                    ? "bg-gradient-to-b from-violet-950/70 to-gray-900 border-violet-500/40 shadow-lg shadow-violet-900/20"
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
                  {tier.monthly === null ? (
                    <div className="text-3xl font-bold mb-1">Custom</div>
                  ) : (
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold">
                        ${annual ? tier.annual : tier.monthly}
                      </span>
                      {tier.monthly > 0 && (
                        <span className="text-gray-500 text-sm">/month</span>
                      )}
                    </div>
                  )}
                  {annual && tier.monthly !== null && tier.monthly > 0 && (
                    <div className="text-xs text-gray-600">billed annually</div>
                  )}
                  <p className="text-gray-500 text-sm mt-2">{tier.desc}</p>
                </div>

                <ul className="space-y-2 flex-1">
                  {Object.entries(tier.features).map(([key, val]) => (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      {val === true
                        ? <><Check /><span className="text-gray-300">{key}</span></>
                        : val === false
                        ? <><Cross /><span className="text-gray-600">{key}</span></>
                        : <><Check /><span className="text-gray-300">{key}: <span className="text-white font-medium">{val}</span></span></>
                      }
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.ctaHref}
                  className={`block w-full py-2.5 rounded-full text-sm font-semibold text-center transition ${
                    tier.highlight
                      ? "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
                      : "border border-gray-700 hover:border-gray-500 text-gray-300"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Feature comparison table */}
          <div className="mb-20">
            <h2 className="text-xl font-bold mb-6 text-center">Full Comparison</h2>
            <div className="border border-gray-800 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 bg-gray-900 border-b border-gray-800">
                <div className="px-5 py-3 text-xs text-gray-600 uppercase tracking-wider">Feature</div>
                {TIERS.map(t => (
                  <div key={t.name} className={`px-5 py-3 text-sm font-semibold text-center ${t.highlight ? "text-violet-300" : "text-gray-300"}`}>
                    {t.name}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {FEATURE_ROWS.map((row, i) => (
                <div key={row} className={`grid grid-cols-4 border-b border-gray-800 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-900/30"}`}>
                  <div className="px-5 py-3 text-sm text-gray-400">{row}</div>
                  {TIERS.map(t => {
                    const val = t.features[row as keyof typeof t.features];
                    return (
                      <div key={t.name} className="px-5 py-3 flex items-center justify-center">
                        {val === true
                          ? <Check />
                          : val === false
                          ? <Cross />
                          : <span className="text-sm text-gray-300 font-medium">{val}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-20 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-8 text-center">Common Questions</h2>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-900/50 transition"
                  >
                    <span className="text-sm font-medium text-gray-200">{item.q}</span>
                    <span className={`text-gray-500 text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Not sure which plan?</h2>
            <p className="text-gray-500 text-sm mb-6">Try the live demo first — no account needed.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/demo" className="px-7 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-medium text-sm">
                Open Live Demo
              </Link>
              <Link href="/docs" className="px-7 py-2.5 rounded-full border border-gray-700 hover:border-gray-500 transition text-gray-300 text-sm">
                Read the Docs
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">XVision</span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/demo" className="hover:text-white transition">Demo</Link>
            <Link href="/docs" className="hover:text-white transition">Docs</Link>
            <a href="https://github.com/GargiGupta-io/XVision" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
