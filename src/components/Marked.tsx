import { Fragment } from "react";
import { SHOW_REVIEW_CHANGES, markedParts, plain } from "../lib/review";

// Shows wording with the review highlights (see lib/review.ts): new text in yellow, removed text struck through.
// With SHOW_REVIEW_CHANGES off, or on the live site, it shows the clean text only.
export default function Marked({ text }: { text: string }) {
  if (!SHOW_REVIEW_CHANGES) return <>{plain(text)}</>;
  return (
    <>
      {markedParts(text).map((part, index) =>
        part.kind === "added" ? (
          <mark key={index} className="rounded-sm bg-[#fff1a8] px-0.5 text-inherit" title="New or changed wording (for review)">
            {part.text}
          </mark>
        ) : part.kind === "removed" ? (
          <del key={index} className="text-[#a50e0e] decoration-[#a50e0e]" title="Removed wording (for review)">
            {part.text}
          </del>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

// A short key shown above highlighted wording while the review is on.
export function ReviewKey() {
  if (!SHOW_REVIEW_CHANGES) return null;
  return (
    <p className="mb-3 rounded-lg border border-[#e6c97a] bg-[#fff8e1] px-3 py-2 text-[13px] text-[#5f4b00]">
      <strong>Review copy for James:</strong> <mark className="rounded-sm bg-[#fff1a8] px-0.5">yellow</mark> = new or changed
      wording, <del className="text-[#a50e0e]">struck through</del> = removed. Highlights are removed before this goes live.
    </p>
  );
}
