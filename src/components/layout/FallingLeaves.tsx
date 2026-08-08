"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getLenis } from "@/lib/lenis-store";

/* ─── SVG Leaf Paths (viewBox 0 0 40 40) ─── */
const LEAF_PATHS = [
  // Oval leaf with center vein
  "M20 2C12 2 2 10 2 22C2 34 12 38 20 38C28 38 38 34 38 22C38 10 28 2 20 2Z M20 2C20 2 18 20 20 38",
  // Maple-ish leaf (3 lobes)
  "M20 2L24 14L36 10L28 22L38 34L24 28L20 38L16 28L2 34L12 22L4 10L16 14Z",
  // Elongated willow leaf
  "M20 2C14 2 4 16 6 28C8 38 14 40 20 40C26 40 32 38 34 28C36 16 26 2 20 2Z M20 2L20 40",
  // Heart-shaped leaf
  "M20 38C14 32 2 24 2 16C2 8 8 2 14 4C16 4 18 6 20 10C22 6 24 4 26 4C32 2 38 8 38 16C38 24 26 32 20 38Z",
];

/* ─── Color Palette (Mata Atlântica) ─── */
const LEAF_COLORS = [
  { fill: "#6B8F73", stroke: "#3F5A48", opacity: 0.7 },
  { fill: "#3F5A48", stroke: "#29392F", opacity: 0.6 },
  { fill: "#8BA68E", stroke: "#6B8F73", opacity: 0.55 },
  { fill: "#C08552", stroke: "#A06A3A", opacity: 0.5 },
  { fill: "#D9A876", stroke: "#C08552", opacity: 0.45 },
];

/* ─── Constants ─── */
const POOL_SIZE_DESKTOP = 10;
const POOL_SIZE_MOBILE = 4;
const SPAWN_INTERVAL_MS = 200;
const FALL_DISTANCE_VH = 110;
const MAX_FALL_DURATION = 5.5;
const MIN_FALL_DURATION = 3;
const MIN_SCROLL_VELOCITY = 0.4;

/* ─── Pool entry ─── */
interface PoolLeaf {
  el: SVGSVGElement;
  active: boolean;
  tl: gsap.core.Timeline | null;
}

/* ─── Helpers ─── */
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * FallingLeaves — decorative scroll-triggered leaf particles.
 *
 * - Spawns ONLY on scroll-down, frequency ∝ velocity.
 * - Each leaf: sinusoidal sway + continuous rotation + organic fall.
 * - Fade-out + blur-out near viewport bottom.
 * - Object-pooled SVGs (zero DOM churn).
 * - Respects prefers-reduced-motion; reduced count on mobile.
 */
export function FallingLeaves() {
  const containerRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<PoolLeaf[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Accessibility gate ──
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    // ── Determine pool size ──
    const isMobile = window.innerWidth < 768;
    const POOL_SIZE = isMobile ? POOL_SIZE_MOBILE : POOL_SIZE_DESKTOP;

    // ── Create SVG pool ──
    const leaves: PoolLeaf[] = [];

    for (let i = 0; i < POOL_SIZE; i++) {
      const pathIdx = i % LEAF_PATHS.length;
      const colorIdx = i % LEAF_COLORS.length;
      const pathD = LEAF_PATHS[pathIdx];
      const { fill, stroke, opacity: baseOpacity } = LEAF_COLORS[colorIdx];

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 40 40");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = `
        position: absolute; top: 0; left: 0;
        pointer-events: none; will-change: transform, opacity, filter;
        opacity: 0; overflow: visible;
      `;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", "0.6");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", String(baseOpacity));
      svg.appendChild(path);

      container.appendChild(svg);
      leaves.push({ el: svg, active: false, tl: null });
    }

    poolRef.current = leaves;

    // ── Scroll velocity from Lenis ──
    const scrollData = { velocity: 0, direction: 0 };
    const lenis = getLenis();

    const onScroll = ({ velocity, direction }: { velocity: number; direction: number }) => {
      scrollData.velocity = velocity;
      scrollData.direction = direction;
    };

    if (lenis) {
      lenis.on("scroll", onScroll);
    } else {
      // Fallback: approximate velocity from wheel events
      let accDelta = 0;
      let lastTime = 0;
      const onWheel = (e: WheelEvent) => {
        const now = performance.now();
        accDelta += Math.abs(e.deltaY);
        if (now - lastTime > 80) {
          scrollData.velocity = accDelta;
          scrollData.direction = e.deltaY > 0 ? 1 : -1;
          accDelta = 0;
          lastTime = now;
        }
      };
      window.addEventListener("wheel", onWheel, { passive: true });
    }

    // ── Spawn ──
    let lastSpawn = 0;

    const spawnLeaf = () => {
      const leaf = leaves.find((l) => !l.active);
      if (!leaf) return;

      leaf.active = true;
      const el = leaf.el;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const startX = rand(vw * 0.05, vw * 0.95);
      const startY = -rand(50, 80);

      // Random visual params
      const size = rand(18, 34);
      const rotAmount = rand(-200, 200);
      const swayAmp = rand(25, 70);
      const swayFreq = rand(2, 4);

      // Duration inversely proportional to velocity
      const vel = Math.min(Math.max(scrollData.velocity, 0.5), 12);
      const normVel = vel / 12; // 0..1
      const baseDur = MAX_FALL_DURATION - normVel * (MAX_FALL_DURATION - MIN_FALL_DURATION);
      const dur = rand(baseDur * 0.85, baseDur * 1.15);

      // Random base opacity variation
      const opVar = rand(0.7, 1);

      // Kill old tween
      if (leaf.tl) {
        leaf.tl.kill();
        leaf.tl = null;
      }

      gsap.set(el, {
        attr: { width: size, height: size },
        x: startX,
        y: startY,
        opacity: 0,
        rotation: rand(-40, 40),
        filter: "blur(0px)",
        scale: rand(0.8, 1.15),
      });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(el, { opacity: 0, x: 0, y: 0, attr: { width: 0, height: 0 } });
          leaf.active = false;
          leaf.tl = null;
        },
      });

      // Phase 1: fade in
      tl.to(el, { opacity: opVar, duration: 0.6, ease: "power2.out" }, 0);

      // Phase 2: continuous rotation
      tl.to(el, { rotation: `+=${rotAmount}`, duration: dur, ease: "none" }, 0);

      // Phase 3: sinusoidal sway (x oscillation)
      const swayDur = dur / swayFreq;
      tl.to(
        el,
        { x: startX + swayAmp, duration: swayDur / 2, ease: "sine.inOut", yoyo: true, repeat: swayFreq - 1 },
        0,
      );

      // Phase 4: vertical fall
      const fallY = startY + vh * (FALL_DISTANCE_VH / 100);
      tl.to(el, { y: fallY, duration: dur, ease: "power1.in" }, 0);

      // Phase 5: fade + blur near bottom (last ~20%)
      const fadeStart = dur * 0.78;
      tl.to(el, { opacity: 0, filter: "blur(5px)", duration: dur * 0.22, ease: "power2.in" }, fadeStart);

      leaf.tl = tl;
    };

    // ── Ticker-poll spawn attempt ──
    const tickerCb = () => {
      const now = performance.now();
      if (now - lastSpawn < SPAWN_INTERVAL_MS) return;
      if (scrollData.direction < 0 || scrollData.velocity < MIN_SCROLL_VELOCITY) return;

      lastSpawn = now;
      spawnLeaf();
    };

    const id = gsap.ticker.add(tickerCb);

    // ── Cleanup ──
    const cleanup = () => {
      gsap.ticker.remove(tickerCb);
      if (lenis) {
        lenis.off("scroll", onScroll);
      } else {
        window.removeEventListener("wheel", onWheel as EventListener);
      }
      leaves.forEach((l) => {
        if (l.tl) l.tl.kill();
        l.el.remove();
      });
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    />
  );
}
