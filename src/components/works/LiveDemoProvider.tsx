"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * LiveDemoProvider — caps the number of live demo iframes running at once.
 *
 * The gallery home page renders many cards, each capable of running a live
 * demo inside an iframe. Running every iframe simultaneously tanks
 * performance, so we centralise a small amount of shared state.
 *
 * ## want vs granted
 *
 * The provider tracks ONE piece of state: `wanted` — the ordered set of slugs
 * of cards that currently WANT a slot (visible and not reduced-motion).
 *
 *   - `request(slug)` / `unrequest(slug)` mutate `wanted` only.
 *   - `active` is DERIVED: the first `maxConcurrent` slugs of `wanted` by
 *     insertion order (empty when reduced motion is on).
 *
 * A card's `useLiveSlot` effect only ever calls `request`/`unrequest`, and
 * that effect is keyed on `[slug, isVisible, reducedMotion, request,
 * unrequest]` — crucially NOT on `active` or `wanted`. So a granted, visible
 * card's effect runs exactly ONCE and never churns.
 *
 * Promotion of a waiting card is purely a derived-state re-render: when some
 * other card unmounts/hides, `wanted` shrinks, the provider recomputes
 * `active`, the context value changes, and EVERY consumer re-renders. A
 * previously-denied card then simply observes `active.has(slug) === true`
 * without its own effect re-running. No effect depends on `active`, so there
 * is no release-then-reclaim churn and therefore no render loop.
 */

type LiveDemoContextValue = {
  /** Slugs currently granted a running slot (the first `maxConcurrent` of `wanted`). */
  active: Set<string>;
  /** True when the user prefers reduced motion — forces every slot denied. */
  reducedMotion: boolean;
  /**
   * Declare that `slug` WANTS a slot. Adds it to `wanted` (insertion order
   * preserved). No-op if already present. Stable identity.
   */
  request: (slug: string) => void;
  /**
   * Declare that `slug` no longer wants a slot. Removes it from `wanted`.
   * No-op if absent. Stable identity.
   */
  unrequest: (slug: string) => void;
};

const LiveDemoContext = createContext<LiveDemoContextValue | null>(null);

type LiveDemoProviderProps = {
  children: React.ReactNode;
  /** Maximum number of demos allowed to run concurrently. Defaults to 6. */
  maxConcurrent?: number;
};

export function LiveDemoProvider({ children, maxConcurrent = 6 }: LiveDemoProviderProps) {
  // The ONLY mutable slot state: the ordered set of slugs that WANT a slot.
  // JS Set preserves insertion order, which we rely on to decide which cards
  // win the first `maxConcurrent` slots.
  const [wanted, setWanted] = useState<Set<string>>(() => new Set<string>());

  // Whether the user has requested reduced motion. Read on mount and kept in
  // sync via a matchMedia change listener.
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Guard for SSR / environments without matchMedia.
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // request: add `slug` to `wanted`. Functional setState so the decision is
  // made against the freshest state. If the slug is already present we return
  // the SAME Set reference, so React skips the re-render. No deps → `request`
  // is referentially stable for the lifetime of the provider.
  const request = useCallback((slug: string) => {
    setWanted((prev) => {
      if (prev.has(slug)) {
        return prev; // Already wants a slot → no change, no re-render.
      }
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  }, []);

  // unrequest: drop `slug` from `wanted`. Same stability/no-op rules as above.
  const unrequest = useCallback((slug: string) => {
    setWanted((prev) => {
      if (!prev.has(slug)) {
        return prev; // Did not want a slot → no change, no re-render.
      }
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  // Derived `active`: the first `maxConcurrent` slugs of `wanted` by insertion
  // order. Reduced motion forces this empty. Recomputed only when `wanted`,
  // `maxConcurrent`, or `reducedMotion` change — never by a consumer's effect.
  const active = useMemo<Set<string>>(() => {
    if (reducedMotion) {
      return new Set<string>();
    }
    return new Set([...wanted].slice(0, maxConcurrent));
  }, [wanted, maxConcurrent, reducedMotion]);

  const value = useMemo<LiveDemoContextValue>(
    () => ({ active, reducedMotion, request, unrequest }),
    [active, reducedMotion, request, unrequest],
  );

  return <LiveDemoContext.Provider value={value}>{children}</LiveDemoContext.Provider>;
}

/**
 * useLiveSlot — called by each gallery card to decide whether it may run its
 * live iframe right now.
 *
 * @param slug      Unique identifier for the card's demo.
 * @param isVisible Whether the card is currently on-screen (e.g. driven by an
 *                  IntersectionObserver in the card component).
 * @returns `granted` — true when the card is allowed to mount/run its iframe.
 *
 * want / granted flow:
 *  - The effect below ONLY calls `request`/`unrequest`, and is keyed solely on
 *    `[slug, isVisible, reducedMotion, request, unrequest]`. It does NOT
 *    depend on `active` or `wanted`, so for a stable visible card it runs
 *    exactly once (request) and cleans up once (unrequest on hide/unmount).
 *    There is no release-then-reclaim churn.
 *  - `granted` is derived directly from context: `active.has(slug)`. When
 *    another card unmounts/hides, `wanted` shrinks, the provider recomputes
 *    `active`, the context value changes, and this consumer re-renders — so a
 *    previously-denied card observes `active.has(slug) === true` WITHOUT its
 *    own effect re-running.
 *  - Reduced motion: `active` is always empty, so `granted` is always false.
 *    We also skip `request` entirely in that case.
 */
export function useLiveSlot(slug: string, isVisible: boolean): boolean {
  const ctx = useContext(LiveDemoContext);
  if (ctx === null) {
    throw new Error(
      "useLiveSlot must be used within a <LiveDemoProvider>. " +
        "Wrap the gallery (or app) in <LiveDemoProvider> so live demos can " +
        "coordinate how many run at once.",
    );
  }

  const { active, reducedMotion, request, unrequest } = ctx;

  useEffect(() => {
    // Reduced motion: never want a slot. Nothing to register or clean up.
    if (reducedMotion) {
      return;
    }

    if (isVisible) {
      // Declare intent: this card wants a slot. The provider decides whether
      // it actually gets one via the derived `active` set.
      request(slug);
      // Cleanup: when the card hides or unmounts, withdraw the want — this
      // shrinks `wanted` and lets a waiting card be promoted.
      return () => unrequest(slug);
    }

    // Not visible → make sure we are not registered as wanting a slot.
    unrequest(slug);
    return undefined;
    // NOTE: deliberately NOT depending on `active`/`wanted`. This effect must
    // not re-run when the shared set changes — that is what kills the loop.
  }, [slug, isVisible, reducedMotion, request, unrequest]);

  // Granted is the pure truth of the derived shared set. Reduced motion keeps
  // `active` empty, so this is naturally false then.
  return active.has(slug);
}
