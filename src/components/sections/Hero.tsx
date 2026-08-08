"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import { siteConfig } from "@/data/site";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!sectionRef.current || prefersReduced) return;

    const ctx = gsap.context(() => {
      // Parallax image zoom on scroll
      if (imageRef.current) {
        gsap.to(imageRef.current, {
          scale: 1.2,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      }

      // Hero text reveal - line by line
      const lines = headlineRef.current?.querySelectorAll(".text-mask-line > span");
      if (lines && lines.length > 0) {
        gsap.fromTo(
          lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.2,
            stagger: 0.15,
            ease: "power3.out",
            delay: 0.5,
          }
        );
      }

      // Subtitle fade
      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 1 }
        );
      }

      // CTA fade
      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 1.2 }
        );
      }

      // Parallax on decorative blobs
      gsap.utils.toArray<HTMLElement>(".hero-blob").forEach((blob, i) => {
        gsap.to(blob, {
          y: (i % 2 === 0 ? -60 : 60),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.5,
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleReserve = () => {
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleExplore = () => {
    document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image with parallax zoom */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={imageRef}
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{
            backgroundImage: "url('/images/hero.jpg')",
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
      </div>

      {/* Decorative blobs */}
      <div className="hero-blob blob w-96 h-96 bg-[var(--color-primary-light)] top-1/4 -left-48" style={{ opacity: 0.15 }} />
      <div className="hero-blob blob w-72 h-72 bg-[var(--color-accent)] bottom-1/4 -right-36" style={{ opacity: 0.12 }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <span className="text-sm text-white/90 font-medium">
            Mata Atlântica — Cunha, SP
          </span>
        </div>

        {/* Headline - line by line reveal */}
        <h1 ref={headlineRef} className="text-white font-serif mb-6 leading-[1.1]">
          <span className="text-mask-line">
            <span>Desconecte-se</span>
          </span>
          <span className="text-mask-line">
            <span>do mundo.</span>
          </span>
          <span className="text-mask-line">
            <span className="text-[var(--color-accent)]">Reconecte-se</span>
          </span>
          <span className="text-mask-line">
            <span>com a natureza.</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-sans"
          style={{ opacity: 0 }}
        >
          {siteConfig.tagline} — suítes com vista para a floresta, spa natural,
          trilhas pela Mata Atlântica e gastronomia que celebra o terroir.
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ opacity: 0 }}>
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
