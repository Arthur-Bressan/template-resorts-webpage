"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";

export function useReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggersRef = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || !containerRef.current) return;

    const container = containerRef.current;

    // Kill old triggers from previous renders
    triggersRef.current.forEach((t) => t.kill());
    triggersRef.current = [];

    // Reveal elements
    const revealEls = container.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale"
    );
    revealEls.forEach((el) => {
      const fromVars = el.classList.contains("reveal-left")
        ? { opacity: 0, x: -40 }
        : el.classList.contains("reveal-right")
        ? { opacity: 0, x: 40 }
        : el.classList.contains("reveal-scale")
        ? { opacity: 0, scale: 0.95 }
        : { opacity: 0, y: 30 };

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(el, {
            ...fromVars,
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        },
      });
      triggersRef.current.push(st);
    });

    // Text mask line reveals
    const maskLines = container.querySelectorAll<HTMLElement>(".text-mask-line");
    maskLines.forEach((line) => {
      const inner = line.querySelector<HTMLElement>("span");
      if (!inner) return;
      const st = ScrollTrigger.create({
        trigger: line,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            inner,
            { yPercent: 100 },
            { yPercent: 0, duration: 1, ease: "power3.out" }
          );
        },
      });
      triggersRef.current.push(st);
    });

    // Stagger containers
    const staggerContainers =
      container.querySelectorAll<HTMLElement>("[data-stagger]");
    staggerContainers.forEach((staggerContainer) => {
      const children = staggerContainer.querySelectorAll<HTMLElement>(
        "[data-stagger-child]"
      );
      if (children.length === 0) return;
      const st = ScrollTrigger.create({
        trigger: staggerContainer,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            children,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.12,
              ease: "power2.out",
            }
          );
        },
      });
      triggersRef.current.push(st);
    });

    return () => {
      triggersRef.current.forEach((t) => t.kill());
      triggersRef.current = [];
    };
  }, []);

  return containerRef;
}
