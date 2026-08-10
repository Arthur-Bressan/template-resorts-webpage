"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";
import type { SiteSettings } from "@/lib/data";

interface HeroProps {
  siteSettings: SiteSettings;
}

export function Hero({ siteSettings }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !imageRef.current) return;
    const section = sectionRef.current;
    const image = imageRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Mouse tracking state
    const mouse = { x: 0.5, y: 0.5 };
    const pos = { x: 0, y: 0 };
    let rafId = 0;
    let currentZoom = 1.15;

    // Smooth interpolation loop for mouse pan
    function animatePan() {
      const targetX = (mouse.x - 0.5) * 30;
      const targetY = (mouse.y - 0.5) * 20;

      pos.x += (targetX - pos.x) * 0.05;
      pos.y += (targetY - pos.y) * 0.05;

      image.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${currentZoom})`;
      rafId = requestAnimationFrame(animatePan);
    }

    function onMouseMove(e: MouseEvent) {
      const rect = section.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top) / rect.height;
    }

    const ctx = gsap.context(() => {
      // Text reveal animations
      const lines = section.querySelectorAll<HTMLElement>(".hero-line");
      if (lines.length) {
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
        section.querySelectorAll<HTMLElement>(".hero-fade");
      if (fadeEls.length) {
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

      if (reducedMotion) return;

      // Scroll-based zoom: zoom in when scrolling down, zoom out when back up
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          // Scale from 1.15 to 1.35 as user scrolls down
          currentZoom = 1.15 + progress * 0.2;
        },
      });

      // Start mouse parallax loop
      section.addEventListener("mousemove", onMouseMove);
      rafId = requestAnimationFrame(animatePan);
    }, sectionRef);

    return () => {
      ctx.revert();
      cancelAnimationFrame(rafId);
      section.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const handleReserve = () =>
    document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
  const handleExplore = () =>
    document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden cursor-crosshair"
    >
      {/* Background Image with parallax + zoom */}
      <div className="absolute inset-[-5%]">
        <div
          ref={imageRef}
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{
            backgroundImage: `url('${siteSettings.heroImage || '/images/hero.jpg'}')`,
            transform: "translate(0px, 0px) scale(1.15)",
          }}
        />
      </div>

      {/* Dark gradient overlays for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />

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
          {siteSettings.tagline} — suítes com vista para a floresta, spa natural,
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
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <span className="text-xs text-white/50 tracking-widest uppercase">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
