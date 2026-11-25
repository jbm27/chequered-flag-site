// Review highlights for the hire agreement revision -f (Homer, 25 Nov 2026), so James can see what changed.
// In the wording, ⟦new text⟧ is new or changed and ⟪old text⟫ was removed. On screen, with SHOW_REVIEW_CHANGES on,
// new text is highlighted yellow and removed text is struck through. Everywhere else (the booking PDF, the saved
// agreement and schedule, the desk) the markers are stripped by plain(), so customers only ever get clean text.
//
// BEFORE GOING LIVE: set SHOW_REVIEW_CHANGES to false (or run scripts/strip-review-marks.js to remove the markers
// from the wording for good). The live site never shows them anyway: Vercel sets NEXT_PUBLIC_VERCEL_ENV to
// "production" there.
export const SHOW_REVIEW_CHANGES = true && process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

// Clean text: removed wording dropped, new wording kept without its markers.
export function plain(text: string) {
  return text
    .replace(/⟪[^⟫]*⟫/g, "")
    .replace(/[⟦⟧]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ ([.,;:])/g, "$1");
}

// Whether a piece of wording has any review markers (used to open and tag changed FAQs).
export function hasChanges(text: string) {
  return /[⟦⟪]/.test(text);
}

export type MarkedPart = { kind: "same" | "added" | "removed"; text: string };

export function markedParts(text: string): MarkedPart[] {
  return text
    .split(/(⟦[^⟧]*⟧|⟪[^⟫]*⟫)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("⟦")
        ? { kind: "added" as const, text: part.slice(1, -1) }
        : part.startsWith("⟪")
          ? { kind: "removed" as const, text: part.slice(1, -1) }
          : { kind: "same" as const, text: part },
    );
}
