import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            XVision
          </span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition">
              How It Works
            </a>
            <Link
              href="/detect"
              className="text-sm px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 transition font-medium"
            >
              Try It Live
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium">
            AI-Powered Pose Detection
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
              XVision
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-400 mb-4 leading-relaxed">
            See the world through AI. Real-time human pose detection using just your camera.
          </p>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto">
            No special hardware. No data sent to servers. Everything runs in your browser, powered by MediaPipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/detect"
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold text-lg shadow-lg shadow-violet-600/25"
            >
              Start Detection
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-3.5 rounded-full border border-gray-700 hover:border-gray-500 transition text-gray-300 font-medium text-lg"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Why{" "}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              XVision
            </span>
          </h2>
          <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
            Real-time pose detection that works everywhere, respects your privacy, and needs zero setup.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "⚡",
                title: "Real-Time Detection",
                desc: "33 body landmarks tracked at 30+ FPS. Instant skeleton overlay on your camera feed.",
              },
              {
                icon: "📱",
                title: "Any Device",
                desc: "Works on your phone, laptop, or tablet. Front and back camera support on mobile.",
              },
              {
                icon: "🔒",
                title: "Privacy First",
                desc: "All AI processing runs locally in your browser. Zero data sent to any server. Ever.",
              },
              {
                icon: "🧠",
                title: "MediaPipe AI",
                desc: "Powered by Google's MediaPipe — the same AI used in Google Meet and Pixel phones.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-violet-500/30 transition group"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-violet-300 transition">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Open Camera",
                desc: "Click 'Start Detection' and grant camera access. Works with any webcam or phone camera.",
              },
              {
                step: "02",
                title: "AI Detects Your Body",
                desc: "MediaPipe Pose Landmarker analyzes each frame in real-time, identifying 33 body landmarks.",
              },
              {
                step: "03",
                title: "See the Skeleton",
                desc: "A live skeleton overlay appears on your camera feed showing pose, movement, and confidence.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-2xl font-bold">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-14">Built With</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Next.js",
              "TypeScript",
              "Tailwind CSS",
              "MediaPipe",
              "Python",
              "FastAPI",
            ].map((tech) => (
              <span
                key={tech}
                className="px-5 py-2.5 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to try it?
          </h2>
          <p className="text-gray-500 mb-8">
            No signup. No download. Just open your camera and go.
          </p>
          <Link
            href="/detect"
            className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition text-white font-semibold text-lg shadow-lg shadow-violet-600/25"
          >
            Launch XVision
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            Built by{" "}
            <a
              href="https://github.com/GargiGupta-io"
              className="text-violet-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gargi Gupta
            </a>
          </span>
          <a
            href="https://github.com/GargiGupta-io/XVision"
            className="text-sm text-gray-500 hover:text-white transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
