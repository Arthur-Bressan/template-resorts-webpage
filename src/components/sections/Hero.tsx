"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import { siteConfig } from "@/data/site";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const lines = sectionRef.current?.querySelectorAll<HTMLElement>(
        ".hero-line"
      );
      if (lines?.length) {
        gsap.set(lines, { yPercent: 110 });
        gsap.to(lines, {
          yPercent: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          delay: 0.3,
        });
      }

      const fadeEls =
        sectionRef.current?.querySelectorAll<HTMLElement>(".hero-fade");
      if (fadeEls?.length) {
        gsap.set(fadeEls, { opacity: 0, y: 20 });
        gsap.to(fadeEls, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          delay: 0.8,
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleReserve = () =>
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  const handleExplore = () =>
    document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background skeleton — substitute by your own image */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#3F5A48] via-[#29392F] to-[#2E2A22]" />

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
        {/* Badge */}
        <div className="hero-fade inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-sm text-white/90 font-medium">
            Mata Atlântica — Cunha, SP
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-white font-serif mb-6 leading-[1.1]">
          <span className="text-mask-line">
            <span className="hero-line">Desconecte-se</span>
          </span>{" "}
          <span className="text-mask-line">
            <span className="hero-line">do mundo.</span>
          </span>{" "}
          <span className="text-mask-line">
            <span className="hero-line text-[var(--color-accent)]">Reconecte-se</span>
          </span>{" "}
          <span className="text-mask-line">
            <span className="hero-line">com a natureza.</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-fade text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-sans">
          {siteConfig.tagline} — suítes com vista para a floresta, spa natural,
          trilhas pela Mata Atlântica e gastronomia que celebra o terroir.
        </p>

        {/* CTA */}
        <div className="hero-fade flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleReserve}
            className="px-8 py-4 rounded-full bg-[var(--color-accent)] text-[var(--color-primary-dark)] font-semibold text-base hover:bg-[var(--color-accent)]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-w-[200px]"
          >
            Reservar Agora
          </button>
          <button
            onClick={handleExplore}
            className="px-8 py-4 rounded-full bg-white/15 backdrop-blur-sm text-white font-medium text-base border border-white/25 hover:bg-white/25 transition-all duration-300 min-w-[200px]"
          >
            Conhecer a Pousada
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs text-white/50 tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
