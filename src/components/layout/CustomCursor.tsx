"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type CursorType = "default" | "link" | "card" | "input";

const HALO_SIZE = 40;
const HALO_HALF = HALO_SIZE / 2;
const MORPH_PAD = 2; // px padding around element border

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mqFine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // On touch / reduced-motion: bail out — elements stay invisible, native cursor works
    if (!mqFine.matches || mqReduced.matches) return;

    const dot = dotRef.current;
    const halo = haloRef.current;
    const label = labelRef.current;
    if (!dot || !halo) return;

    // ── Initial state: off-screen, invisible via GSAP (not CSS) ──
    gsap.set(dot, { x: -100, y: -100, opacity: 0, scale: 1, force3D: true });
    gsap.set(halo, { x: -100, y: -100, opacity: 0, scale: 1, force3D: true });

    // ── gsap.quickTo for halo organic lag ──
    const haloX = gsap.quickTo(halo, "x", {
      duration: 0.35,
      ease: "power3.out",
    });
    const haloY = gsap.quickTo(halo, "y", {
      duration: 0.35,
      ease: "power3.out",
    });

    // ── State ──
    let cursorType: CursorType = "default";
    let isActive = false;
    let hasMoved = false;
    let mouseX = 0;
    let mouseY = 0;
    let morphTarget: HTMLElement | null = null;
    let tickerActive = false;

    // ── Show / Hide (controls native cursor hiding too) ──
    const show = () => {
      if (isActive) return;
      isActive = true;
      gsap.to([dot, halo], {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
      });
      document.documentElement.classList.add("custom-cursor-active");
    };

    const hide = () => {
      if (!isActive) return;
      isActive = false;
      gsap.to([dot, halo], {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      });
      document.documentElement.classList.remove("custom-cursor-active");
    };

    // ── Sync halo to element (used by ticker and scroll/resize) ──
    const syncHaloToElement = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const hasTilt = el.hasAttribute("data-tilt-x");

      // For 3D-tilted elements: use layout dimensions (offsetWidth) so the halo's
      // own perspective transform produces the same visual projection.
      // For non-tilt elements (buttons with scale): use projected bounding rect.
      const w = (hasTilt ? el.offsetWidth : rect.width) + MORPH_PAD * 2;
      const h = (hasTilt ? el.offsetHeight : rect.height) + MORPH_PAD * 2;

      if (w <= 0 || h <= 0) return;

      const setProps: gsap.TweenVars = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
      };

      // Copy 3D tilt from element to halo for perfect visual alignment
      if (hasTilt) {
        setProps.rotateX = parseFloat(el.dataset.tiltX || "0");
        setProps.rotateY = parseFloat(el.dataset.tiltY || "0");
        setProps.transformPerspective = 800;
      }

      gsap.set(halo, setProps);
    };

    // ── Continuous tracking: runs every frame while morphTarget is active ──
    const startTracking = () => {
      if (tickerActive) return;
      tickerActive = true;
      gsap.ticker.add(tickerFn);
    };

    const stopTracking = () => {
      if (!tickerActive) return;
      tickerActive = false;
      gsap.ticker.remove(tickerFn);
    };

    const tickerFn = () => {
      if (!morphTarget) return;
      syncHaloToElement(morphTarget);
    };

    // ── Morph: ring → element border (entry transition with easing) ──
    const enterMorph = (target: HTMLElement) => {
      // Stop any previous tracking (switching between morph targets)
      stopTracking();

      morphTarget = target;
      const rect = target.getBoundingClientRect();
      const br = getComputedStyle(target).borderRadius;
      const hasTilt = target.hasAttribute("data-tilt-x");
      const w = (hasTilt ? target.offsetWidth : rect.width) + MORPH_PAD * 2;
      const h = (hasTilt ? target.offsetHeight : rect.height) + MORPH_PAD * 2;

      const toProps: gsap.TweenVars = {
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        borderRadius: br,
        borderWidth: 2,
        scale: 1,
        scaleY: 1,
        scaleX: 1,
        duration: 0.4,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => {
          // Only start continuous tracking if still morphed to THIS element
          if (morphTarget === target) startTracking();
        },
      };

      // Include 3D tilt in entry animation for smooth transition from circle
      if (hasTilt) {
        toProps.rotateX = parseFloat(target.dataset.tiltX || "0");
        toProps.rotateY = parseFloat(target.dataset.tiltY || "0");
        toProps.transformPerspective = 800;
      }

      gsap.to(halo, toProps);
    };

    // ── Morph: element border → ring (exit transition with easing) ──
    const leaveMorph = () => {
      morphTarget = null;
      // Stop continuous tracking — no more per-frame syncing
      stopTracking();

      gsap.to(halo, {
        width: HALO_SIZE,
        height: HALO_SIZE,
        marginLeft: -HALO_HALF,
        marginTop: -HALO_HALF,
        borderRadius: "50%",
        borderWidth: 1.5,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });

      // Kick halo back toward mouse immediately (don't wait for next mousemove)
      haloX(mouseX);
      haloY(mouseY);
    };

    // ── Update morph position on scroll/resize (backup for ticker gaps) ──
    const updateMorphPosition = () => {
      if (!morphTarget) return;
      syncHaloToElement(morphTarget);
    };

    // ── Cursor Type Transitions ──
    const setType = (
      type: CursorType,
      labelText?: string,
      morphElement?: HTMLElement
    ) => {
      if (
        cursorType === type &&
        (!labelText || !label || label.textContent === labelText) &&
        (type !== "card" || morphElement === morphTarget)
      )
        return;

      // Leaving morph: restore halo shape
      if (cursorType === "card" && type !== "card" && morphTarget) {
        leaveMorph();
      }

      cursorType = type;
      if (label && labelText) {
        label.textContent = labelText;
      }

      // NOTE: Do NOT use gsap.killTweensOf here — it would kill the
      // halo x/y tweens created by gsap.quickTo(), freezing position.
      // Instead, each gsap.to() uses overwrite: "auto" to handle conflicts.

      switch (type) {
        case "link":
          gsap.to(dot, {
            scale: 0.4,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
          gsap.to(halo, {
            scale: 1.5,
            scaleY: 1,
            borderRadius: "50%",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
          if (label)
            gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;

        case "card":
          // Dot: hidden for legacy (no morph), visible when morphing
          if (morphElement) {
            gsap.to(dot, {
              scale: 1,
              opacity: 1,
              duration: 0.2,
              overwrite: "auto",
            });
            enterMorph(morphElement);
          } else {
            // Legacy: no .cursor-hover-target, just scale halo
            gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2, overwrite: "auto" });
            gsap.to(halo, {
              scale: 2.2,
              scaleY: 1,
              borderRadius: "50%",
              borderWidth: 1,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
          // Label: show if text provided
          if (label && labelText)
            gsap.to(label, {
              opacity: 1,
              scale: 0.45,
              duration: 0.25,
              delay: 0.08,
              ease: "back.out(1.7)",
              overwrite: "auto",
            });
          else if (label)
            gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;

        case "input":
          gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2, overwrite: "auto" });
          gsap.to(halo, {
            scale: 0.8,
            scaleY: 0.3,
            scaleX: 1.1,
            borderRadius: "2px",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
          if (label)
            gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;

        default:
          gsap.to(dot, {
            scale: 1,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
          gsap.to(halo, {
            scale: 1,
            scaleY: 1,
            scaleX: 1,
            borderRadius: "50%",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            overwrite: "auto",
          });
          if (label)
            gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;
      }
    };

    // ── Mouse Move ──
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isActive) show();
      // Dot always follows mouse instantly
      gsap.set(dot, { x: mouseX, y: mouseY });

      // Halo follows mouse only when NOT morphed to an element
      if (!hasMoved) {
        gsap.set(halo, { x: mouseX, y: mouseY });
        hasMoved = true;
      } else if (!morphTarget) {
        haloX(mouseX);
        haloY(mouseY);
      }
    };

    // ── Detect cursor type from hovered element ──
    const getTypeForElement = (target: HTMLElement): {
      type: CursorType;
      labelText?: string;
      morphElement?: HTMLElement;
    } => {
      // 1. .cursor-hover-target — morph ring to element border (highest priority)
      const morphEl = target.closest<HTMLElement>(".cursor-hover-target");
      if (morphEl) {
        return {
          type: "card",
          labelText: morphEl.dataset.cursorLabel || undefined,
          morphElement: morphEl,
        };
      }

      // 2. Explicit data-cursor on the target itself
      if (target.dataset.cursor) {
        return {
          type: (target.dataset.cursor as CursorType) || "default",
          labelText: target.dataset.cursorLabel || undefined,
        };
      }

      const tag = target.tagName.toLowerCase();

      // 3. Text inputs
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      ) {
        return { type: "input" };
      }

      // 4. Links/buttons without explicit data-cursor
      if (
        tag === "a" ||
        tag === "button" ||
        target.closest("a") ||
        target.closest("button")
      ) {
        return { type: "link" };
      }

      // 5. Inherit from parent data-cursor container
      const cursorEl = target.closest<HTMLElement>("[data-cursor]");
      if (cursorEl) {
        return {
          type: (cursorEl.dataset.cursor as CursorType) || "default",
          labelText: cursorEl.dataset.cursorLabel || undefined,
        };
      }

      return { type: "default" };
    };

    // ── Mouseover: check element type ──
    const onMouseOver = (e: MouseEvent) => {
      const { type, labelText, morphElement } = getTypeForElement(
        e.target as HTMLElement
      );
      setType(type, labelText, morphElement);
    };

    // ── Viewport leave ──
    const onMouseLeaveViewport = () => hide();

    // ── Keyboard: hide during keyboard navigation ──
    const onKeyDown = () => hide();

    // ── Register events ──
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseleave", onMouseLeaveViewport);
    document.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("scroll", updateMorphPosition, { passive: true });
    window.addEventListener("resize", updateMorphPosition, { passive: true });

    // ── Media query change listeners ──
    const onFineChange = (e: MediaQueryListEvent) => {
      if (!e.matches) hide();
    };
    const onReducedChange = (e: MediaQueryListEvent) => {
      if (e.matches) hide();
    };
    mqFine.addEventListener("change", onFineChange);
    mqReduced.addEventListener("change", onReducedChange);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseleave", onMouseLeaveViewport);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updateMorphPosition);
      window.removeEventListener("resize", updateMorphPosition);
      mqFine.removeEventListener("change", onFineChange);
      mqReduced.removeEventListener("change", onReducedChange);
      document.documentElement.classList.remove("custom-cursor-active");
      stopTracking();
      gsap.killTweensOf([dot, halo, label]);
    };
  }, []);

  return (
    <>
      {/* Central dot — follows mouse instantly */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          marginLeft: -3,
          marginTop: -3,
          borderRadius: "50%",
          backgroundColor: "white",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
          mixBlendMode: "difference",
          opacity: 0,
          transform: "translate(-100px, -100px)",
        }}
      />
      {/* Outer halo — follows with organic lag; morphs to element border on .cursor-hover-target */}
      <div
        ref={haloRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: HALO_SIZE,
          height: HALO_SIZE,
          marginLeft: -HALO_HALF,
          marginTop: -HALO_HALF,
          borderRadius: "50%",
          border: "1.5px solid white",
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "transform",
          mixBlendMode: "difference",
          opacity: 0,
          transform: "translate(-100px, -100px)",
        }}
      >
        <span
          ref={labelRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "white",
            whiteSpace: "nowrap",
            opacity: 0,
            transform: "scale(0.8)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          Ver mais
        </span>
      </div>
      {/* Inject cursor:none style for native cursor hiding */}
      <CursorStyleOverride />
    </>
  );
}

/**
 * Injects a <style> tag that hides the native cursor ONLY when
 * the JS-driven class `custom-cursor-active` is present on <html>.
 * Placed outside @layer so Tailwind CSS 4 won't strip it.
 */
function CursorStyleOverride() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      html.custom-cursor-active,
      html.custom-cursor-active *,
      html.custom-cursor-active *::before,
      html.custom-cursor-active *::after {
        cursor: none !important;
      }
    ` }} />
  );
}
