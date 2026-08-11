"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

type CursorType = "default" | "link" | "card" | "input";

const HALO_SIZE = 40;
const HALO_HALF = HALO_SIZE / 2;
const MORPH_PAD = 2; // px padding around element border
const LERP_SPEED = 10; // frame-rate-independent smoothing
const CURSOR_Z = 2147483647; // max 32-bit int — above any stacking context

export function CustomCursor() {
  useEffect(() => {
    const mqFine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // On touch / reduced-motion: bail out — native cursor works
    if (!mqFine.matches || mqReduced.matches) return;

    // ── Create cursor elements directly on document.body ──
    // This guarantees the cursor is outside any stacking context (overflow:hidden,
    // z-index, transform, etc.) and always visible above everything.

    const dot = document.createElement("div");
    dot.setAttribute("aria-hidden", "true");
    Object.assign(dot.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "6px",
      height: "6px",
      marginLeft: "-3px",
      marginTop: "-3px",
      borderRadius: "50%",
      backgroundColor: "white",
      pointerEvents: "none",
      zIndex: String(CURSOR_Z),
      willChange: "transform",
      mixBlendMode: "difference",
      opacity: "0",
    });
    document.body.appendChild(dot);

    const halo = document.createElement("div");
    halo.setAttribute("aria-hidden", "true");
    Object.assign(halo.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: `${HALO_SIZE}px`,
      height: `${HALO_SIZE}px`,
      marginLeft: `-${HALO_HALF}px`,
      marginTop: `-${HALO_HALF}px`,
      borderRadius: "50%",
      border: "1.5px solid white",
      pointerEvents: "none",
      zIndex: String(CURSOR_Z),
      willChange: "transform",
      mixBlendMode: "difference",
      opacity: "0",
    });
    document.body.appendChild(halo);

    const label = document.createElement("span");
    Object.assign(label.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "0.02em",
      color: "white",
      whiteSpace: "nowrap",
      opacity: "0",
      transform: "scale(0.8)",
      userSelect: "none",
      pointerEvents: "none",
    });
    label.textContent = "Ver mais";
    halo.appendChild(label);

    // ── GSAP initial state: off-screen, invisible ──
    gsap.set(dot, { x: -100, y: -100, opacity: 0, scale: 1, force3D: true });
    gsap.set(halo, { x: -100, y: -100, opacity: 0, scale: 1, force3D: true });

    // ── State ──
    let cursorType: CursorType = "default";
    let isActive = false;
    let mouseX = 0;
    let mouseY = 0;
    let haloX = -100;
    let haloY = -100;
    let morphTarget: HTMLElement | null = null;
    let morphing = false; // true during gsap.to enter/exit transitions

    // ── Show / Hide ──
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

    // ── Morph: ring → element border (entry transition with easing) ──
    // Uses only 2D bounding rect — NO 3D rotation on the halo.
    // This avoids shear/parallelogram artifacts from perspective mismatch.
    const enterMorph = (target: HTMLElement) => {
      morphTarget = target;
      morphing = true;

      const rect = target.getBoundingClientRect();
      const br = getComputedStyle(target).borderRadius;
      const w = rect.width + MORPH_PAD * 2;
      const h = rect.height + MORPH_PAD * 2;

      gsap.to(halo, {
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        borderRadius: br,
        borderWidth: 2,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 0.4,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => {
          // Only start continuous tracking if still morphed to THIS element
          if (morphTarget === target) morphing = false;
        },
      });
    };

    // ── Morph: element border → ring (exit transition with easing) ──
    const leaveMorph = () => {
      morphTarget = null;
      morphing = true;

      gsap.to(halo, {
        width: HALO_SIZE,
        height: HALO_SIZE,
        marginLeft: -HALO_HALF,
        marginTop: -HALO_HALF,
        x: mouseX,
        y: mouseY,
        borderRadius: "50%",
        borderWidth: 1.5,
        scale: 1,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          morphing = false;
          // Sync lerp position so it resumes smoothly from the mouse
          haloX = mouseX;
          haloY = mouseY;
        },
      });
    };

    // ── Single master ticker loop — always runs, never add/remove ──
    // Eliminates dual-loop conflicts. Uses morphing flag to decide behavior:
    //   morphing=true  → gsap.to is handling the halo (entry/exit) — don't interfere
    //   morphTarget     → track element 2D bounding box via gsap.set
    //   otherwise      → lerp halo toward mouse (frame-rate-independent)
    const tickerFn = (_time: number, deltaTime: number) => {
      if (!isActive || morphing) return;

      if (morphTarget) {
        // ── Tracking mode: sync to element's 2D projected bounding box ──
        const rect = morphTarget.getBoundingClientRect();
        const w = rect.width + MORPH_PAD * 2;
        const h = rect.height + MORPH_PAD * 2;
        if (w > 0 && h > 0) {
          gsap.set(halo, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: w,
            height: h,
            marginLeft: -w / 2,
            marginTop: -h / 2,
          });
        }
      } else {
        // ── Normal mode: frame-rate-independent lerp toward mouse ──
        const dt = deltaTime / 1000;
        const factor = 1 - Math.exp(-LERP_SPEED * dt);
        haloX += (mouseX - haloX) * factor;
        haloY += (mouseY - haloY) * factor;
        gsap.set(halo, { x: haloX, y: haloY });
      }
    };
    gsap.ticker.add(tickerFn);

    // ── Cursor Type Transitions ──
    const setType = (
      type: CursorType,
      labelText?: string,
      morphElement?: HTMLElement
    ) => {
      if (
        cursorType === type &&
        (!labelText || label.textContent === labelText) &&
        (type !== "card" || morphElement === morphTarget)
      )
        return;

      // Leaving morph: restore halo shape
      if (cursorType === "card" && type !== "card" && morphTarget) {
        leaveMorph();
      }

      cursorType = type;
      if (labelText) label.textContent = labelText;

      // NOTE: Do NOT use gsap.killTweensOf here — it would kill the
      // halo x/y tweens, freezing position. Each gsap.to uses overwrite:"auto".

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
          gsap.to(label, {
            opacity: 0,
            scale: 0.8,
            duration: 0.15,
            overwrite: "auto",
          });
          break;

        case "card":
          if (morphElement) {
            // Morph mode: dot visible, ring becomes border
            gsap.to(dot, {
              scale: 1,
              opacity: 1,
              duration: 0.2,
              overwrite: "auto",
            });
            enterMorph(morphElement);
            // Hide label during morph — border IS the element
            gsap.to(label, {
              opacity: 0,
              scale: 0.8,
              duration: 0.15,
              overwrite: "auto",
            });
          } else {
            // Legacy: no .cursor-hover-target, just scale halo
            gsap.to(dot, {
              scale: 0,
              opacity: 0,
              duration: 0.2,
              overwrite: "auto",
            });
            gsap.to(halo, {
              scale: 2.2,
              scaleY: 1,
              borderRadius: "50%",
              borderWidth: 1,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
            if (labelText)
              gsap.to(label, {
                opacity: 1,
                scale: 0.45,
                duration: 0.25,
                delay: 0.08,
                ease: "back.out(1.7)",
                overwrite: "auto",
              });
            else
              gsap.to(label, {
                opacity: 0,
                scale: 0.8,
                duration: 0.15,
                overwrite: "auto",
              });
          }
          break;

        case "input":
          gsap.to(dot, {
            scale: 0,
            opacity: 0,
            duration: 0.2,
            overwrite: "auto",
          });
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
          gsap.to(label, {
            opacity: 0,
            scale: 0.8,
            duration: 0.15,
            overwrite: "auto",
          });
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
          gsap.to(label, {
            opacity: 0,
            scale: 0.8,
            duration: 0.15,
            overwrite: "auto",
          });
          break;
      }
    };

    // ── Mouse Move ──
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isActive) {
        // First move: initialize halo position to prevent flash
        haloX = mouseX;
        haloY = mouseY;
        show();
      }

      // Dot always follows mouse instantly
      gsap.set(dot, { x: mouseX, y: mouseY });
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
      gsap.ticker.remove(tickerFn);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseleave", onMouseLeaveViewport);
      document.removeEventListener("keydown", onKeyDown);
      mqFine.removeEventListener("change", onFineChange);
      mqReduced.removeEventListener("change", onReducedChange);
      document.documentElement.classList.remove("custom-cursor-active");
      gsap.killTweensOf([dot, halo, label]);
      dot.remove();
      halo.remove();
    };
  }, []);

  // The style tag stays in React tree for SSR safety + Tailwind CSS 4 compatibility
  return <CursorStyleOverride />;
}

/**
 * Injects a <style> tag that hides the native cursor ONLY when
 * the JS-driven class `custom-cursor-active` is present on <html>.
 * Placed outside @layer so Tailwind CSS 4 won't strip it.
 */
function CursorStyleOverride() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      html.custom-cursor-active,
      html.custom-cursor-active *,
      html.custom-cursor-active *::before,
      html.custom-cursor-active *::after {
        cursor: none !important;
      }
    `,
      }}
    />
  );
}
