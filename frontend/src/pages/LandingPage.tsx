import { Link } from "react-router-dom";
import { BookOpenCheck, Image as ImageIcon, Languages, GraduationCap } from "lucide-react";
import DocuMindLogo from "../components/DocuMindLogo";

const CAPABILITIES = [
  { icon: BookOpenCheck, title: "PDF Understanding", desc: "Upload any PDF — notes, textbooks, scanned pages — and DocuMind reads every word." },
  { icon: ImageIcon, title: "Image Explanation", desc: "Attach diagrams, charts, or handwritten notes and get a real teacher's explanation." },
  { icon: Languages, title: "Multilingual Support", desc: "Ask in English, Tamil, Hindi, Tanglish, or a dozen other languages." },
  { icon: GraduationCap, title: "Study & Quiz", desc: "Turn any document into notes, exam questions, and interactive practice quizzes." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base-950 text-ink-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="focus-ring rounded-xl">
          <DocuMindLogo variant="full" size="md" showSubtitle={true} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-400 md:flex">
          <a href="#features" className="hover:text-ink-100">Features</a>
          <a href="#how" className="hover:text-ink-100">How it works</a>
          <a href="#" className="hover:text-ink-100">Pricing</a>
          <a href="#" className="hover:text-ink-100">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-ink-300 hover:text-ink-100">Login</Link>
          <Link
            to="/register"
            className="rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 px-4 py-2 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Learn anything <br />
            from <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">your documents</span> <br />
            with AI
          </h1>
          <p className="mt-5 max-w-md text-base text-ink-400">
            Your multilingual AI teacher for PDFs, images and more.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
            >
              Start Learning
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-base-700 bg-base-900 px-6 py-3 text-sm font-semibold text-ink-200 transition-colors hover:bg-base-800"
            >
              Explore Demo
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title }) => (
              <div key={title} className="flex flex-col items-start gap-2 rounded-xl border border-base-700/60 bg-base-900 p-3">
                <Icon size={18} className="text-accent-400" strokeWidth={1.75} />
                <span className="text-xs font-medium text-ink-300">{title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-full bg-accent-600/10 blur-3xl" />
          <div className="rounded-xl2 border border-base-700/60 bg-base-900 p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-xs text-ink-500">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              AI Teacher · Online
            </div>
            <p className="text-sm text-ink-300">
              "Upload anything you are studying. Ask anything. Understand it. Learn it."
            </p>
            <div className="mt-5 space-y-2 text-xs text-ink-500">
              <p className="rounded-lg bg-base-800 px-3 py-2">Upload → Understand → Ask → Explain → Learn</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Everything you need to actually learn</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl2 border border-base-700/60 bg-base-900 p-5 transition-colors hover:border-accent-600/40">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600/10 text-accent-400">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-base-700/60 py-8 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} DocuMind AI — Your Multilingual AI Teacher
      </footer>
    </div>
  );
}
