"use client";

import { useEffect, useRef, useState } from "react";

// A small OpenStreetMap map with no extra library: drag to move, + / − to zoom, tap or click to drop a pin.
// Tiles come from tile.openstreetmap.org (light use is allowed with the attribution shown below).

const TILE = 256;

function project(lat: number, lng: number, zoom: number) {
  const scale = TILE * Math.pow(2, zoom);
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export type LatLng = { lat: number; lng: number };

export default function PinMap({
  pin,
  home,
  onPick,
  height = 300,
}: {
  pin: LatLng | null;
  home: LatLng & { label: string };
  onPick: (point: LatLng) => void;
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [zoom, setZoom] = useState(pin ? 15 : 11);
  const [center, setCenter] = useState<LatLng>(pin || home);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);

  // Follow the pin when it is set from the address search.
  const pinKey = pin ? pin.lat.toFixed(6) + "," + pin.lng.toFixed(6) : "";
  useEffect(() => {
    if (pin) {
      setCenter(pin);
      setZoom((z) => Math.max(z, 15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 600);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const c = project(center.lat, center.lng, zoom);
  const left = c.x - width / 2;
  const top = c.y - height / 2;
  const max = Math.pow(2, zoom);
  const tiles: { key: string; x: number; y: number; src: string }[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx += 1) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty += 1) {
      if (ty < 0 || ty >= max) continue;
      const wrapped = ((tx % max) + max) % max;
      tiles.push({
        key: zoom + "/" + tx + "/" + ty,
        x: tx * TILE - left,
        y: ty * TILE - top,
        src: "https://tile.openstreetmap.org/" + zoom + "/" + wrapped + "/" + ty + ".png",
      });
    }
  }

  function toScreen(point: LatLng) {
    const p = project(point.lat, point.lng, zoom);
    return { x: p.x - left, y: p.y - top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, cx: c.x, cy: c.y, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setCenter(unproject(d.cx - dx, d.cy - dy, zoom));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const point = unproject(left + (event.clientX - rect.left), top + (event.clientY - rect.top), zoom);
    onPick(point);
  }

  const pinAt = pin ? toScreen(pin) : null;
  const homeAt = toScreen(home);
  const zoomBtn =
    "grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-[#c8c8c8] bg-white text-lg font-bold text-[#171717] shadow-sm hover:bg-[#f5f5f3] disabled:opacity-40";

  return (
    <div
      ref={box}
      role="application"
      aria-label="Map. Drag to move, use the plus and minus buttons to zoom, tap to drop your delivery pin."
      className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-[#c8c8c8] bg-[#e8e6df]"
      style={{ height, cursor: drag.current?.moved ? "grabbing" : "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute h-64 w-64 max-w-none"
          style={{ left: tile.x, top: tile.y }}
          onError={(event) => ((event.currentTarget as HTMLImageElement).style.visibility = "hidden")}
        />
      ))}

      {/* Workshop */}
      <div className="pointer-events-none absolute" style={{ left: homeAt.x, top: homeAt.y, transform: "translate(-50%, -50%)" }}>
        <div className="grid h-6 w-6 place-items-center rounded-md border-2 border-white bg-[#171717] text-[10px] font-bold text-white shadow">
          CF
        </div>
      </div>
      <div
        className="pointer-events-none absolute whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-[#171717] shadow"
        style={{ left: homeAt.x + 16, top: homeAt.y - 10 }}
      >
        {home.label}
      </div>

      {/* Customer pin */}
      {pinAt && (
        <svg
          className="pointer-events-none absolute drop-shadow"
          width="30"
          height="40"
          viewBox="0 0 30 40"
          style={{ left: pinAt.x - 15, top: pinAt.y - 38 }}
          aria-hidden="true"
        >
          <path d="M15 1C7.3 1 1 7.2 1 14.8 1 25 15 39 15 39s14-14 14-24.2C29 7.2 22.7 1 15 1z" fill="#c5221f" stroke="#ffffff" strokeWidth="2" />
          <circle cx="15" cy="15" r="5" fill="#ffffff" />
        </svg>
      )}

      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button type="button" aria-label="Zoom in" className={zoomBtn} disabled={zoom >= 18} onClick={() => setZoom((z) => Math.min(18, z + 1))}>
          +
        </button>
        <button type="button" aria-label="Zoom out" className={zoomBtn} disabled={zoom <= 5} onClick={() => setZoom((z) => Math.max(5, z - 1))}>
          −
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 bg-white/85 px-1.5 py-0.5 text-[10px] text-[#3f3f3f]">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}
