"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

/**
 * 3D perspective tilt + glow spotlight on hover.
 * Attaches mousemove/mouseleave to the card and animates
 * inner children marked with data-card-inner.
 *
 * Usage:
 *   const tiltRef = useCardTilt<HTMLDivElement>();
 *   <article ref={tiltRef} className="group ...">
 *     <div data-card-inner className="...">
 *       ...card content...
 *     </div>
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

    const inner = card.querySelector<HTMLElement>("[data-card-inner]");
    if (!inner) return;

    const MAX_ROTATION = 8; // degrees
    const GLOW_INTENSITY = 0.12;

    // Perspective on the card container
    gsap.set(card, {
      perspective: 800,
      transformStyle: "preserve-3d",
    });
    gsap.set(inner, {
      transformStyle: "preserve-3d",
    });

    // Glow overlay
    const glow = document.createElement("div");
    glow.setAttribute("data-card-glow", "true");
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
    card.style.position = card.style.position || "relative";
    card.appendChild(glow);

    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Rotation proportional to distance from center (max = MAX_ROTATION)
      const rotateX = ((y - centerY) / centerY) * -MAX_ROTATION;
      const rotateY = ((x - centerX) / centerX) * MAX_ROTATION;

      // Glow position (%)
      const px = (x / rect.width) * 100;
      const py = (y / rect.height) * 100;

      gsap.to(inner, {
        rotateX,
        rotateY,
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto",
      });

      glow.style.setProperty("--mx", `${px}%`);
      glow.style.setProperty("--my", `${py}%`);
      glow.style.opacity = "1";
    };

    const onLeave = () => {
      gsap.to(inner, {
        rotateX: 0,
        rotateY: 0,
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
