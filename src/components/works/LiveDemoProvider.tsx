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
 * performance, so we centralise a small amount of shared state:
 *
 *   - `active`: the SET of slugs currently allowed to run their iframe.
 *   - `maxConcurrent`: the hard cap on the size of that set.
 *   - `reducedMotion`: when true, NO demo ever gets a slot.
 *
 * Each card calls `useLiveSlot(slug, isVisible)`. The hook returns a boolean
 * telling the card whether it may mount/run its iframe right now. A card that
 * is denied stays as a static cover image and re-attempts whenever the active
 * set changes (e.g. another card frees a slot).
 */

type LiveDemoContextValue = {
  /** Slugs currently granted a running slot. */
  active: Set<string>;
  /** Hard cap on concurrent running demos. */
  maxConcurrent: number;
  /** True when the user prefers reduced motion — forces every slot denied. */
  reducedMotion: boolean;
  /**
   * Attempt to claim a slot for `slug`. No-op if the slug already holds a
   * slot, if the set is full, or if reduced motion is on. Stable identity.
   */
  claim: (slug: string) => void;
  /** Release the slot held by `slug` (no-op if it holds none). Stable identity. */
  release: (slug: string) => void;
};

const LiveDemoContext = createContext<LiveDemoContextValue | null>(null);

type LiveDemoProviderProps = {
  children: React.ReactNode;
  /** Maximum number of demos allowed to run concurrently. Defaults to 6. */
  maxConcurrent?: number;
};

export function LiveDemoProvider({ children, maxConcurrent = 6 }: LiveDemoProviderProps) {
  // Set of slugs currently granted a running slot. We always create a NEW Set
  // on every update so React detects the change and re-renders consumers.
  const [active, setActive] = useState<Set<string>>(() => new Set<string>());

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

  // claim: add `slug` to the active set IFF there is room and it is not
  // already present. Uses the functional setState form so the decision is
  // made against the freshest state — this keeps `claim` referentially stable
  // (no deps) and avoids stale-closure bugs when many cards claim at once.
  const claim = useCallback(
    (slug: string) => {
      setActive((prev) => {
        // Already running, or the cap is reached → no change. Returning the
        // SAME Set reference means React skips a re-render.
        if (prev.has(slug) || prev.size >= maxConcurrent) {
          return prev;
        }
        const next = new Set(prev);
        next.add(slug);
        return next;
      });
    },
    [maxConcurrent],
  );

  // release: drop `slug` from the active set, freeing a slot for others.
  const release = useCallback((slug: string) => {
    setActive((prev) => {
      if (!prev.has(slug)) {
        return prev; // Held no slot → no change, no re-render.
      }
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  const value = useMemo<LiveDemoContextValue>(
    () => ({ active, maxConcurrent, reducedMotion, claim, release }),
    [active, maxConcurrent, reducedMotion, claim, release],
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
 * Claim / release flow:
 *  - `granted` is derived purely from `active.has(slug)`, so it is always
 *    consistent with shared state and never gets stuck.
 *  - An effect keyed on `[slug, isVisible, ...]` claims a slot while visible
 *    and releases it when the card is hidden OR unmounts (the effect cleanup
 *    handles both — a card scrolled away frees its slot for others).
 *  - When the set is full a claim is a no-op. But the effect ALSO depends on
 *    `active`: when any other card releases a slot, `active` changes, every
 *    visible-but-ungranted card's effect re-runs, and it gets another chance
 *    to claim. This is how a denied card becomes granted later.
 *  - `claim` is a no-op once the card already holds a slot, so the repeated
 *    effect runs (one per `active` change) are cheap and cause no loop:
 *    claim → setActive returns the SAME Set → no re-render.
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

  const { active, reducedMotion, claim, release } = ctx;

  useEffect(() => {
    // Reduced motion: never claim, and proactively release anything held.
    if (reducedMotion) {
      release(slug);
      return;
    }

    if (isVisible) {
      // Attempt to claim. No-op if already granted or the set is full; in the
      // full case this effect re-runs when `active` changes (a slot frees),
      // giving this card another chance.
      claim(slug);
      // Cleanup: when the card hides or unmounts, free its slot.
      return () => release(slug);
    }

    // Not visible → ensure no slot is held.
    release(slug);
    return undefined;
    // `active` is intentionally a dependency: a change to the shared set
    // (someone released) must re-trigger the claim attempt for denied cards.
  }, [slug, isVisible, reducedMotion, active, claim, release]);

  // Reduced motion always denies. Otherwise the truth is the shared set.
  return !reducedMotion && active.has(slug);
}
