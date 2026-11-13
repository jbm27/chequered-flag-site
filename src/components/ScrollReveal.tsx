"use client";

import { useEffect } from "react";

// Gentle fade-in as sections scroll into view.
// Mark an element with data-reveal to fade it in, or data-reveal-stagger to fade its children in one after another.
// Content is never hidden without this script, anything already on screen at load stays as it is,
// and visitors who ask for reduced motion see no animation.
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-stagger]"));
    const fold = window.innerHeight * 0.92;
    const pending = targets.filter((el) => el.getBoundingClientRect().top > fold);
    if (!pending.length) return;

    for (const el of pending) el.classList.add("reveal-init");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of pending) observer.observe(el);

    return () => {
      observer.disconnect();
      for (const el of pending) el.classList.remove("reveal-init", "reveal-in");
    };
  }, []);

  return null;
}
