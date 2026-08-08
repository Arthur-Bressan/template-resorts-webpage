"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type CursorType = "default" | "link" | "card" | "input";

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

    // ── Cursor Type Transitions ──
    const setType = (type: CursorType, labelText?: string) => {
      if (
        cursorType === type &&
        (!labelText || !label || label.textContent === labelText)
      )
        return;

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
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;

        case "card":
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
          if (label)
            gsap.to(label, {
              opacity: 1,
              scale: 0.45,
              duration: 0.25,
              delay: 0.08,
              ease: "back.out(1.7)",
              overwrite: "auto",
            });
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
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
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
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15, overwrite: "auto" });
          break;
      }
    };

    // ── Mouse Move ──
    const onMouseMove = (e: MouseEvent) => {
      if (!isActive) show();
      gsap.set(dot, { x: e.clientX, y: e.clientY });

      if (!hasMoved) {
        gsap.set(halo, { x: e.clientX, y: e.clientY });
        hasMoved = true;
      } else {
        haloX(e.clientX);
        haloY(e.clientY);
      }
    };

    // ── Detect cursor type from hovered element ──
    const getTypeForElement = (target: HTMLElement): {
      type: CursorType;
      labelText?: string;
    } => {
      // 1. Explicit data-cursor on the target itself
      if (target.dataset.cursor) {
        return {
          type: (target.dataset.cursor as CursorType) || "default",
          labelText: target.dataset.cursorLabel || undefined,
        };
      }

      const tag = target.tagName.toLowerCase();

      // 2. Text inputs
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      ) {
        return { type: "input" };
      }

      // 3. Links/buttons without explicit data-cursor
      if (
        tag === "a" ||
        tag === "button" ||
        target.closest("a") ||
        target.closest("button")
      ) {
        return { type: "link" };
      }

      // 4. Inherit from parent data-cursor container
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
      const { type, labelText } = getTypeForElement(
        e.target as HTMLElement
      );
      setType(type, labelText);
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
      mqFine.removeEventListener("change", onFineChange);
      mqReduced.removeEventListener("change", onReducedChange);
      document.documentElement.classList.remove("custom-cursor-active");
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
      {/* Outer halo — follows with organic lag */}
      <div
        ref={haloRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
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
