"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type CursorType = "default" | "link" | "card" | "input";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const halo = haloRef.current;
    const label = labelRef.current;
    if (!dot || !halo) return;

    // ── Guard: only activate on fine pointer, non-reduced motion ──
    const mqFine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!mqFine.matches || mqReduced.matches) return;

    // ── Initial state: off-screen, invisible ──
    gsap.set([dot, halo], { x: -100, y: -100, opacity: 0 });

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

    // ── Show / Hide ──
    const show = () => {
      if (isActive) return;
      isActive = true;
      gsap.to([dot, halo], {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });
      document.documentElement.classList.add("custom-cursor-active");
    };

    const hide = () => {
      if (!isActive) return;
      isActive = false;
      gsap.to([dot, halo], {
        opacity: 0,
        duration: 0.25,
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

      gsap.killTweensOf([dot, halo, label]);

      switch (type) {
        case "link":
          gsap.to(dot, {
            scale: 0.4,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
          });
          gsap.to(halo, {
            scale: 1.5,
            scaleY: 1,
            borderRadius: "50%",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            boxShadow: "0 0 24px rgba(217, 164, 65, 0.2)",
          });
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15 });
          break;

        case "card":
          gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2 });
          gsap.to(halo, {
            scale: 2,
            scaleY: 1,
            borderRadius: "50%",
            borderWidth: 1,
            duration: 0.35,
            ease: "power2.out",
            boxShadow: "0 0 20px rgba(107, 143, 115, 0.15)",
          });
          // Counter-scale label so it stays at natural visual size
          if (label)
            gsap.to(label, {
              opacity: 1,
              scale: 0.5,
              duration: 0.25,
              delay: 0.08,
              ease: "back.out(1.7)",
            });
          break;

        case "input":
          gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2 });
          gsap.to(halo, {
            scale: 0.8,
            scaleY: 0.3,
            scaleX: 1.1,
            borderRadius: "1px",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            boxShadow: "0 0 0px transparent",
          });
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15 });
          break;

        default:
          gsap.to(dot, {
            scale: 1,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
          });
          gsap.to(halo, {
            scale: 1,
            scaleY: 1,
            scaleX: 1,
            borderRadius: "50%",
            borderWidth: 1.5,
            duration: 0.3,
            ease: "power2.out",
            boxShadow: "0 0 12px rgba(63, 90, 72, 0.08)",
          });
          if (label) gsap.to(label, { opacity: 0, scale: 0.8, duration: 0.15 });
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
    // Priority: target data-cursor > inputs > links/buttons > ancestor data-cursor > default
    const getTypeForElement = (target: HTMLElement): {
      type: CursorType;
      labelText?: string;
    } => {
      // 1. Explicit data-cursor on the target itself (wins over tag detection)
      if (target.dataset.cursor) {
        return {
          type: (target.dataset.cursor as CursorType) || "default",
          labelText: target.dataset.cursorLabel || undefined,
        };
      }

      const tag = target.tagName.toLowerCase();

      // 2. Auto-detect: text inputs
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      ) {
        return { type: "input" };
      }

      // 3. Auto-detect: links/buttons without explicit data-cursor
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

    // ── Viewport enter/leave ──
    const onMouseEnterViewport = () => show();
    const onMouseLeaveViewport = () => hide();

    // ── Keyboard: hide cursor during keyboard navigation ──
    const onKeyDown = () => hide();

    // ── Register events ──
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, true); // capture phase
    document.addEventListener("mouseenter", onMouseEnterViewport);
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

    // ── Cleanup ──
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseenter", onMouseEnterViewport);
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
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      {/* Outer halo — follows with organic lag */}
      <div ref={haloRef} className="cursor-halo" aria-hidden="true">
        <span ref={labelRef} className="cursor-label">
          Ver mais
        </span>
      </div>
    </>
  );
}
