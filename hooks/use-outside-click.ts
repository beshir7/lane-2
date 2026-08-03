"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Close-on-click-away for dropdowns, popovers and menus.
 *
 * The callback is held in a ref, so passing an inline arrow function does not
 * re-subscribe the listener on every render — which is what the hand-rolled
 * copies of this effect were doing.
 *
 * @param ref       element that counts as "inside"
 * @param onOutside runs on a mousedown outside it
 * @param enabled   skip listening entirely while false (e.g. menu closed)
 */
export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T>,
  onOutside: () => void,
  enabled = true
) {
  const cb = useRef(onOutside);
  useEffect(() => {
    cb.current = onOutside;
  });

  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, enabled]);
}
