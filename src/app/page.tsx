"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Mic,
  Users,
  FileText,
  Clock,
  BarChart3,
  Mail,
  ArrowRight,
  Play,
  ChevronRight,
} from "lucide-react";
import { motion, useInView } from "motion/react";

/* ─── Brand Tokens ─── */
const C = {
  bg: "#08080C",
  bgSurface: "#101018",
  bgElevated: "#181824",
  gold: "#C9A87C",
  goldLight: "#E2D0B5",
  goldDark: "#A8884F",
  cream: "#F0ECE2",
  creamMuted: "#9E9A90",
  border: "#1E1E2E",
  borderLight: "#2A2A3C",
} as const;

/* ─── Reveal wrapper ─── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Waveform Visual ─── */
function Waveform() {
  const barCount = 48;
  return (
    <div className="flex items-center justify-center gap-[3px] h-32 md:h-48">
      {Array.from({ length: barCount }).map((_, i) => {
        const center = barCount / 2;
        const dist = Math.abs(i - center) / center;
        const maxH = 1 - dist * 0.7;
        return (
          <motion.div
            key={i}
            className="w-[3px] md:w-[4px] rounded-full origin-center"
            style={{
              background: `linear-gradient(to top, ${C.goldDark}, ${C.gold})`,
              height: "100%",
            }}
            animate={{
              scaleY: [maxH * 0.25, maxH, maxH * 0.25],
            }}
            transition={{
              duration: 1.2 + Math.random() * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.04,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Stat Counter ─── */
function StatNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="prelude-grain"
      style={{ background: C.bg, color: C.cream, fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ━━ NAV ━━ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? `${C.bg}ee` : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}30` }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: C.gold }}
              />
            </div>
            <span
              className="text-xl tracking-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Prelude
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: C.creamMuted }}
            >
              How it works
            </a>
            <a
              href="#features"
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: C.creamMuted }}
            >
              Features
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ color: C.creamMuted }}
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium transition-all hover:brightness-110 whitespace-nowrap"
              style={{ background: C.gold, color: C.bg }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━ HERO ━━ */}
      <section className="prelude-section min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-10 relative overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`,
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center max-w-4xl relative"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase mb-8"
            style={{
              background: `${C.gold}10`,
              border: `1px solid ${C.gold}25`,
              color: C.gold,
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: C.gold }}
            />
            AI-Powered Voice Screening
          </motion.div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-8 pb-1"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Every great hire
            <br />
            starts with a{" "}
            <span
              className="italic inline-block"
              style={{
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                paddingRight: "0.15em",
                paddingBottom: "0.05em",
              }}
            >
              Prelude
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: C.creamMuted }}
          >
            Screen hundreds of candidates with AI voice interviews.
            <br className="hidden md:block" />
            Focus your time on the people who truly stand out.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: C.gold, color: C.bg }}
            >
              Start screening
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-all hover:brightness-125"
              style={{
                background: "transparent",
                border: `1px solid ${C.borderLight}`,
                color: C.cream,
              }}
            >
              <Play className="w-4 h-4" style={{ color: C.gold }} />
              Watch demo
            </button>
          </motion.div>
        </motion.div>

        {/* Waveform */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1 }}
          className="mt-16 md:mt-20 w-full max-w-2xl"
        >
          <Waveform />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronRight className="w-5 h-5 rotate-90" style={{ color: C.creamMuted }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ━━ STATS BAR ━━ */}
      <section className="prelude-section py-16 md:py-20" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0 md:divide-x" style={{ borderColor: C.border }}>
            {[
              { value: 10, suffix: "x", label: "Faster candidate screening" },
              { value: 85, suffix: "%", label: "Recruiter time saved" },
              { value: 500, suffix: "+", label: "Interviews conducted daily" },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 0.15} className="text-center px-8">
                <div
                  className="text-5xl md:text-6xl font-light tracking-tight mb-2"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    color: C.gold,
                  }}
                >
                  <StatNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm" style={{ color: C.creamMuted }}>
                  {stat.label}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ HOW IT WORKS ━━ */}
      <section id="how-it-works" className="prelude-section py-24 md:py-32 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="text-center mb-16 md:mb-20">
              <p
                className="text-xs tracking-widest uppercase mb-4"
                style={{
                  color: C.gold,
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                How it works
              </p>
              <h2
                className="text-3xl md:text-5xl tracking-tight"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Three steps to better hiring
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                step: "01",
                icon: <FileText className="w-5 h-5" />,
                title: "Create a campaign",
                desc: "Define the role, write your screening questions, and set interview parameters. Your AI interviewer is ready in minutes.",
              },
              {
                step: "02",
                icon: <Mail className="w-5 h-5" />,
                title: "Invite candidates",
                desc: "Upload a CSV of candidates or add them manually. Prelude sends personalized email invitations with secure interview links.",
              },
              {
                step: "03",
                icon: <BarChart3 className="w-5 h-5" />,
                title: "Review & decide",
                desc: "Listen to recordings, read auto-generated transcripts, and make informed decisions — all from your dashboard.",
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div
                  className="group relative p-8 md:p-10 rounded-2xl transition-all duration-500 hover:translate-y-[-4px] h-full"
                  style={{
                    background: C.bgSurface,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {/* Step number */}
                  <span
                    className="text-xs tracking-widest block mb-6"
                    style={{
                      color: C.gold,
                      fontFamily: "var(--font-geist-mono)",
                    }}
                  >
                    {item.step}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
                    style={{
                      background: `${C.gold}12`,
                      border: `1px solid ${C.gold}20`,
                      color: C.gold,
                    }}
                  >
                    {item.icon}
                  </div>

                  <h3
                    className="text-xl mb-3 tracking-tight"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.creamMuted }}>
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ FEATURES ━━ */}
      <section id="features" className="prelude-section py-24 md:py-32 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="text-center mb-16 md:mb-20">
              <p
                className="text-xs tracking-widest uppercase mb-4"
                style={{
                  color: C.gold,
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                Features
              </p>
              <h2
                className="text-3xl md:text-5xl tracking-tight"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Built for modern recruiters
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Mic className="w-5 h-5" />,
                title: "AI Voice Interviews",
                desc: "Natural, conversational AI that asks your questions, follows up intelligently, and adapts to each candidate.",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Bulk Outreach",
                desc: "Upload hundreds of candidates via CSV. Personalized invitations go out automatically with one click.",
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Auto Transcription",
                desc: "Every interview is recorded and transcribed in real-time. Search, highlight, and share key moments.",
              },
              {
                icon: <Clock className="w-5 h-5" />,
                title: "Smart Scheduling",
                desc: "48-hour expiring links create urgency. Candidates who miss out can request a reschedule with one tap.",
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                title: "Campaign Dashboard",
                desc: "Track completion rates, review responses, and manage your entire pipeline from a single view.",
              },
              {
                icon: <Mail className="w-5 h-5" />,
                title: "Email Campaigns",
                desc: "Beautiful, branded invitation emails that land in inboxes — not spam folders. Track opens and clicks.",
              },
            ].map((feature, i) => (
              <Reveal key={i} delay={(i % 3) * 0.1}>
                <div
                  className="group p-7 rounded-2xl transition-all duration-500 hover:translate-y-[-2px] h-full"
                  style={{
                    background: C.bgSurface,
                    border: `1px solid ${C.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${C.gold}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: `${C.gold}10`,
                      color: C.gold,
                    }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-medium mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.creamMuted }}>
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ TESTIMONIAL ━━ */}
      <section className="prelude-section py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <Reveal>
            <div
              className="relative p-10 md:p-16 rounded-3xl text-center"
              style={{
                background: `linear-gradient(135deg, ${C.bgSurface}, ${C.bgElevated})`,
                border: `1px solid ${C.border}`,
              }}
            >
              {/* Decorative quote mark */}
              <div
                className="text-8xl md:text-9xl leading-none absolute top-4 left-8 md:left-12 opacity-10 select-none"
                style={{
                  fontFamily: "var(--font-instrument-serif)",
                  color: C.gold,
                }}
              >
                &ldquo;
              </div>

              <blockquote
                className="text-xl md:text-2xl lg:text-3xl leading-snug tracking-tight relative z-10"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Prelude cut our screening time from two weeks to two days. We interviewed 200 candidates for a senior role
                and found our top three — without a single phone call.
              </blockquote>

              <div className="mt-8 flex items-center justify-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ background: `${C.gold}20`, color: C.gold }}
                >
                  SK
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Sarah Kim</div>
                  <div className="text-xs" style={{ color: C.creamMuted }}>
                    Head of Talent, Series B Startup
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━ FINAL CTA ━━ */}
      <section className="prelude-section py-24 md:py-32 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${C.gold}30 0%, transparent 70%)`,
          }}
        />

        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center relative z-10">
          <Reveal>
            <p
              className="text-xs tracking-widest uppercase mb-6"
              style={{
                color: C.gold,
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              Get started today
            </p>
            <h2
              className="text-4xl md:text-6xl tracking-tight mb-6"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Ready to transform
              <br />
              your hiring?
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: C.creamMuted }}>
              Join forward-thinking teams who use Prelude to find
              exceptional talent — faster, fairer, and at scale.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-medium transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: C.gold, color: C.bg }}
            >
              Start for free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ━━ FOOTER ━━ */}
      <footer
        className="prelude-section py-10"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: `${C.gold}15` }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: C.gold }}
              />
            </div>
            <span
              className="text-sm"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Prelude
            </span>
          </div>

          <p className="text-xs" style={{ color: C.creamMuted }}>
            &copy; {new Date().getFullYear()} Prelude. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
