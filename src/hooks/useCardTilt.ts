"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * 3D perspective tilt + glow spotlight on hover.
 * The ENTIRE card element (border, shadow, content) tilts together.
 *
 * Usage:
 *   const tiltRef = useCardTilt<HTMLElement>();
 *   <article ref={tiltRef} className="group relative ...">
 *     <div data-card-inner>...content...</div>
 *   </article>
 */
export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) return;

    const MAX_ROTATION = 8; // degrees
    const GLOW_INTENSITY = 0.12;

    // Glow overlay — appended inside card, above content via z-index
    const glow = document.createElement("div");
    glow.style.cssText = `
      position: absolute; inset: 0; border-radius: inherit;
      pointer-events: none; opacity: 0; z-index: 10;
      background: radial-gradient(
        350px circle at var(--mx, 50%) var(--my, 50%),
        rgba(255,255,255,${GLOW_INTENSITY}),
        transparent 60%
      );
      transition: opacity 0.4s ease;
    `;

    // Ensure card is positioned (required for glow absolute)
    card.style.position = card.style.position || "relative";

    // Insert glow as the FIRST child so content sits above it naturally
    card.insertBefore(glow, card.firstChild);

    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Rotation proportional to distance from center
      const rotateX = ((y - centerY) / centerY) * -MAX_ROTATION;
      const rotateY = ((x - centerX) / centerX) * MAX_ROTATION;

      // Glow follows cursor
      const px = (x / rect.width) * 100;
      const py = (y / rect.height) * 100;

      // Animate the CARD ITSELF — border, shadow, and content tilt together
      gsap.to(card, {
        rotateX,
        rotateY,
        transformPerspective: 800,
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });

      glow.style.setProperty("--mx", `${px}%`);
      glow.style.setProperty("--my", `${py}%`);
      glow.style.opacity = "1";
    };

    const onLeave = () => {
      // Bouncy elastic return to flat
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        transformPerspective: 800,
        duration: 0.6,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
      glow.style.opacity = "0";
    };

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);

    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
      glow.remove();
    };
  }, []);

  return ref;
}
