/**
 * Module-level store for the shared Lenis instance.
 * SmoothScrollProvider sets it on mount; other components read it.
 */
import type Lenis from "@studio-freight/lenis";

let instance: Lenis | null = null;

export function setLenis(lenis: Lenis) {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}
