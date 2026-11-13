"use client";

import { useEffect, useState } from "react";

// Round "back to top" button, bottom right, on every page (added in the root layout).
// It appears once the visitor has scrolled about a screen down. The scroll listener is passive
// and only updates state when the button should change, so it does not slow scrolling.
export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    function check() {
      frame = 0;
      const next = window.scrollY > Math.max(500, window.innerHeight * 0.8);
      setShow((current) => (current === next ? current : next));
    }
    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(check);
    }
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={
        "fixed z-40 grid h-12 w-12 place-items-center rounded-full bg-[#171717] text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-[opacity,transform] duration-300 hover:bg-[#2b2b2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] motion-reduce:transition-none " +
        (show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")
      }
      style={{
        right: "max(20px, env(safe-area-inset-right, 0px))",
        bottom: "max(20px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
