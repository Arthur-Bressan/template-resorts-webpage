"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  type Variants,
} from "motion/react";
import type { SiteSettings } from "@/lib/data";

/* ─── Variant: Stagger Container ─── */
const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.25,
    },
  },
};

/* ─── Variant: Child Fade-Up ─── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ─── Variant: Child Scale-Up (badge) ─── */
const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
  },
};

/* ─── Variant: CTA Spring ─── */
const ctaFade: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ─── Spring config for hover/tap ─── */
const HOVER_SPRING = { type: "spring" as const, stiffness: 400, damping: 17, mass: 0.8 };
const TAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 15 };

/* ─── Mouse horizontal drift config ─── */
const DRIFT_MAX = 12; // max px horizontal translation

interface HeroProps {
  siteSettings: SiteSettings;
}

export function Hero({ siteSettings }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  /* ─── Mouse MotionValues (raw) ─── */
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  /* ─── Spring-damped smoothed values ─── */
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 30, restDelta: 0.001 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 30, restDelta: 0.001 });

  /* ─── Subtle horizontal drift from mouse position ─── */
  const translateX = useTransform(smoothX, [0, 1], [DRIFT_MAX, -DRIFT_MAX]);

  /* ─── Light overlay following mouse (visible glow) ─── */
  const spotlightBg = useTransform(
    [smoothX, smoothY],
    ([x, y]) =>
      `radial-gradient(450px circle at ${x * 100}% ${y * 100}%, rgba(255,248,220,0.12) 0%, rgba(255,255,255,0.06) 30%, transparent 70%)`
  );

  /* ─── Mouse move handler ─── */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    // Reset to center on leave — spring handles the smooth return
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  /* ─── GSAP: Scroll-based zoom on image ─── */
  useEffect(() => {
    if (!sectionRef.current) return;
    const section = sectionRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const wrapper = imageWrapperRef.current;
    if (!wrapper) return;

    let currentZoom = 1.15;

    const ctx = gsap.context(() => {
      // Scroll zoom: image zooms in as user scrolls past hero
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          currentZoom = 1.15 + progress * 0.2;
          // Apply scroll zoom on top of motion transforms
          gsap.set(wrapper, {
            "--scroll-zoom": currentZoom,
          });
        },
      });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const handleReserve = () =>
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  const handleExplore = () =>
    document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });

  const heroSrc = siteSettings.heroImage || "/images/hero.jpg";

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── Background Image with subtle horizontal drift ─── */}
      <div
        ref={imageWrapperRef}
        className="absolute inset-[-5%] will-change-transform"
      >
        <motion.div
          className="w-full h-full"
          style={{
            x: translateX,
          }}
        >
          <Image
            src={heroSrc}
            alt=""
            aria-hidden="true"
            fill
            priority
            quality={90}
            sizes="100vw"
            className="object-cover"
            draggable={false}
          />
        </motion.div>
      </div>

      {/* ─── Dark gradient overlays ─── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none" />

      {/* ─── Light overlay following mouse ─── */}
      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light"
        style={{ background: spotlightBg }}
      />

      {/* ─── Content — Staggered Animation Container ─── */}
      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Badge ─── */}
        <motion.div
          className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8"
          variants={scaleUp}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-sm text-white/90 font-medium">
            Mata Atlântica — Cunha, SP
          </span>
        </motion.div>

        {/* ─── Headline — Each line with individual stagger ─── */}
        <h1 className="text-white font-serif mb-6 leading-[1.1]">
          {["Desconecte-se", "do mundo.", "Reconecte-se", "com a natureza."].map(
            (text, i) => (
              <span key={i} className="text-mask-line">
                <motion.span
                  className="block"
                  variants={fadeUp}
                  style={
                    i === 2
                      ? { color: "var(--color-accent)" }
                      : undefined
                  }
                >
                  {text}
                </motion.span>
              </span>
            )
          )}
        </h1>

        {/* ─── Subtitle ─── */}
        <motion.p
          className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-sans"
          variants={fadeUp}
        >
          {siteSettings.tagline} — suítes com vista para a floresta, spa natural,
          trilhas pela Mata Atlântica e gastronomia que celebra o terroir.
        </motion.p>

        {/* ─── CTA Buttons with Spring Hover + Tap Scale ─── */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          variants={staggerContainer}
        >
          {/* Primary CTA — Reservar */}
          <motion.button
            onClick={handleReserve}
            variants={ctaFade}
            whileHover={{
              scale: 1.06,
              y: -3,
              boxShadow: "0 20px 50px -12px rgba(217, 164, 65, 0.45)",
              transition: HOVER_SPRING,
            }}
            whileTap={{
              scale: 0.94,
              transition: TAP_SPRING,
            }}
            className="cursor-hover-target px-8 py-4 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold text-base shadow-lg min-w-[200px] cursor-pointer select-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Reservar Agora
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </motion.button>

          {/* Secondary CTA — Conhecer */}
          <motion.button
            onClick={handleExplore}
            variants={ctaFade}
            whileHover={{
              scale: 1.06,
              y: -3,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderColor: "rgba(255,255,255,0.4)",
              transition: HOVER_SPRING,
            }}
            whileTap={{
              scale: 0.94,
              transition: TAP_SPRING,
            }}
            className="cursor-hover-target px-8 py-4 rounded-full bg-white/15 backdrop-blur-sm text-white font-medium text-base border border-white/25 min-w-[200px] cursor-pointer select-none"
          >
            Conhecer a Pousada
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ─── Scroll Indicator ─── */}
      <motion.div
        className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2 z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8, ease: "easeOut" }}
      >
        <span className="text-xs text-white/50 tracking-widest uppercase">
          Scroll
        </span>
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent"
          animate={{ scaleY: [1, 0.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
