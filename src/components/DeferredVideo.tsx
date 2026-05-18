"use client";

import { useState } from "react";

type DeferredVideoProps = {
  src: string;
  title: string;
  /** Shown until the user loads the video (keeps large MP4 off the network until needed). */
  poster: string;
};

/**
 * Large site-hosted videos can freeze the browser on first paint if the <video> has a src
 * immediately (even with preload="metadata"). We defer loading until the user opts in.
 */
export default function DeferredVideo({ src, title, poster }: DeferredVideoProps) {
  const [loadVideo, setLoadVideo] = useState(false);

  return (
    <figure className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {!loadVideo ? (
        <button
          type="button"
          onClick={() => setLoadVideo(true)}
          className="group relative block aspect-video w-full cursor-pointer bg-neutral-900 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-400"
        >
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            loading="lazy"
            decoding="async"
          />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 px-4 transition-colors group-hover:bg-black/45">
            <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-900 shadow">
              Load video
            </span>
            <span className="max-w-sm text-center text-xs text-white drop-shadow">
              Large file — loads only when you tap here
            </span>
          </span>
        </button>
      ) : (
        <video
          src={src}
          controls
          muted
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-neutral-900 object-cover"
        >
          Your browser does not support embedded video.
        </video>
      )}
      <figcaption className="px-4 py-3 text-sm font-medium text-neutral-800">{title}</figcaption>
    </figure>
  );
}
