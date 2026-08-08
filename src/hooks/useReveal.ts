"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/components/layout/SmoothScrollProvider";

export function useReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return; // elements stay visible, no animation

    const ctx = gsap.context(() => {
      // Fade-up reveals
      gsap.utils
        .toArray<HTMLElement>(".reveal", containerRef.current)
        .forEach((el) => {
          gsap.set(el, { opacity: 0, y: 30 });
          ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () =>
              gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }),
          });
        });

      gsap.utils
        .toArray<HTMLElement>(".reveal-left", containerRef.current)
        .forEach((el) => {
          gsap.set(el, { opacity: 0, x: -30 });
          ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () =>
              gsap.to(el, { opacity: 1, x: 0, duration: 0.7, ease: "power2.out" }),
          });
        });

      gsap.utils
        .toArray<HTMLElement>(".reveal-right", containerRef.current)
        .forEach((el) => {
          gsap.set(el, { opacity: 0, x: 30 });
          ScrollTrigger.create({
            trigger: el,
            start: "top 90%",
            once: true,
            onEnter: () =>
              gsap.to(el, { opacity: 1, x: 0, duration: 0.7, ease: "power2.out" }),
          });
        });

      // Text mask lines
      gsap.utils
        .toArray<HTMLElement>(".text-mask-line", containerRef.current)
        .forEach((line) => {
          const inner = line.querySelector<HTMLElement>("span");
          if (!inner) return;
          gsap.set(inner, { yPercent: 100 });
          ScrollTrigger.create({
            trigger: line,
            start: "top 90%",
            once: true,
            onEnter: () =>
              gsap.to(inner, {
                yPercent: 0,
                duration: 0.9,
                ease: "power3.out",
              }),
          });
        });

      // Stagger groups
      gsap.utils
        .toArray<HTMLElement>("[data-stagger]", containerRef.current)
        .forEach((container) => {
          const children = container.querySelectorAll<HTMLElement>(
            "[data-stagger-child]"
          );
          if (!children.length) return;

          gsap.set(children, { opacity: 0, y: 25 });
          ScrollTrigger.create({
            trigger: container,
            start: "top 88%",
            once: true,
            onEnter: () =>
              gsap.to(children, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out",
              }),
          });
        });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return containerRef;
}
