"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_BYTES, type DocImage } from "../lib/documents";

// Pieces of the booking checkout for the security update: licence photo upload and the signature box.

// Shrinks a photo in the browser to a JPEG no wider or taller than 1400px, so uploads stay small.
export async function compressPhoto(file: File): Promise<DocImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPG, PNG or HEIC from your camera).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That photo could not be opened. Please try a JPG or PNG."));
      el.src = url;
    });
    let maxSide = 1400;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL("image/jpeg", attempt < 2 ? 0.72 : 0.6);
      const bytes = Math.floor(((data.length - data.indexOf(",") - 1) * 3) / 4);
      if (bytes <= MAX_IMAGE_BYTES * 0.9) return { data, w, h };
      maxSide = Math.round(maxSide * 0.8);
    }
    throw new Error("That photo is too large. Please try another photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Live camera view for taking the licence photo (phone or laptop camera). Uses the rear camera when there is one.
function CameraCapture({ onPhoto, onCancel, onUnavailable }: {
  onPhoto: (file: File) => void;
  onCancel: () => void;
  onUnavailable: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((media) => {
        if (!live) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          video.current.play().catch(() => undefined);
        }
      })
      .catch(() => {
        if (live) onUnavailable("The camera could not be opened. Allow camera access, or use Upload a photo instead.");
      });
    return () => {
      live = false;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    const el = video.current;
    if (!el || !el.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext("2d")!.drawImage(el, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onPhoto(new File([blob], "licence.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => setReady(true)}
          aria-label="Camera view"
          className="block aspect-[4/3] w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-[10%] rounded-xl border-2 border-dashed border-white/80" />
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-semibold text-white [text-shadow:0_1px_2px_#000]">
          {ready ? "Fit the front of the licence inside the frame" : "Opening the camera…"}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={snap}
          disabled={!ready}
          className="min-h-[44px] rounded-lg bg-[#171717] px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          Take photo
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg border border-[#171717] bg-white px-4 text-sm font-bold">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function LicencePicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: DocImage | null;
  onChange: (image: DocImage | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);

  async function use(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await compressPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo could not be used.");
    } finally {
      setBusy(false);
    }
  }

  function openCamera() {
    setError("");
    // A live camera view where the browser allows it; otherwise the phone's own camera app.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia && window.isSecureContext) setCamera(true);
    else cameraInput.current?.click();
  }

  const btn =
    "inline-flex min-h-[40px] cursor-pointer items-center rounded-md border border-[#171717] bg-white px-3 text-[13px] font-bold";

  return (
    <div>
      <div className="mb-1.5 text-[13px] text-[#595959]" id={id + "-label"}>
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[#c8c8c8] bg-[#fafaf8] p-3">
        {camera ? (
          <CameraCapture
            onPhoto={(file) => {
              setCamera(false);
              use(file);
            }}
            onCancel={() => setCamera(false)}
            onUnavailable={(message) => {
              setCamera(false);
              setError(message);
            }}
          />
        ) : (
          <>
            {value ? (
              <img src={value.data} alt="Licence photo preview" className="h-20 w-auto max-w-[140px] rounded border border-[#e5e5e5] object-cover" />
            ) : (
              <div className="grid h-20 w-[120px] place-items-center rounded border border-[#e5e5e5] bg-white text-center text-[11px] text-[#595959]">
                Front of licence
              </div>
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id + "-label"}>
                <button type="button" onClick={openCamera} className={btn}>
                  {value ? "Retake photo" : "Take a photo"}
                </button>
                <label htmlFor={id} className={btn}>
                  {value ? "Upload another" : "Upload a photo"}
                </label>
              </div>
              {/* Upload from the gallery or files */}
              <input
                id={id}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  use(file);
                }}
              />
              {/* Fallback when the live camera is not available: opens the phone's camera app */}
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  use(file);
                }}
              />
              <p className="mt-1.5 text-xs text-[#595959]">
                {busy ? "Preparing photo…" : value ? "Photo added." : "Use your camera or upload a clear photo of the front, with all four corners showing."}
              </p>
              {error && <p className="mt-1 text-xs font-bold text-[#9b1c1c]">{error}</p>}
            </div>
            {value && (
              <button type="button" onClick={() => onChange(null)} className="text-[13px] font-semibold underline">
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Signature box: draw with a finger or mouse, or type your name instead.
export function SignatureBox({
  mode,
  onMode,
  typedName,
  onTypedName,
  onDrawn,
}: {
  mode: "drawn" | "typed";
  onMode: (mode: "drawn" | "typed") => void;
  typedName: string;
  onTypedName: (name: string) => void;
  onDrawn: (image: DocImage | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (mode !== "drawn") return;
    const el = canvas.current;
    if (!el) return;
    const ratio = window.devicePixelRatio || 1;
    const width = el.clientWidth;
    const height = el.clientHeight;
    el.width = Math.round(width * ratio);
    el.height = Math.round(height * ratio);
    const ctx = el.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    setHasInk(false);
    onDrawn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const el = canvas.current;
    if (!el) return;
    onDrawn({ data: el.toDataURL("image/jpeg", 0.85), w: el.width, h: el.height });
  }

  function clear() {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.restore();
    setHasInk(false);
    onDrawn(null);
  }

  const tab = (active: boolean) =>
    "min-h-[40px] cursor-pointer rounded-lg border-2 px-3.5 text-sm font-semibold " +
    (active ? "border-[#171717] bg-[#f5f5f3] text-[#171717]" : "border-[#d0d0d0] bg-white text-[#171717]");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] text-[#595959]">Sign by</span>
        <button type="button" aria-pressed={mode === "drawn"} onClick={() => onMode("drawn")} className={tab(mode === "drawn")}>
          Drawing your signature
        </button>
        <button type="button" aria-pressed={mode === "typed"} onClick={() => onMode("typed")} className={tab(mode === "typed")}>
          Typing your name
        </button>
      </div>
      {mode === "drawn" ? (
        <div>
          <div className="relative">
            <canvas
              ref={canvas}
              aria-label="Signature box. Draw your signature with your finger or mouse."
              className="block h-[150px] w-full touch-none rounded-lg border-2 border-[#171717] bg-white"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                drawing.current = true;
                last.current = point(event);
              }}
              onPointerMove={(event) => {
                if (!drawing.current || !canvas.current || !last.current) return;
                const p = point(event);
                const ctx = canvas.current.getContext("2d")!;
                ctx.beginPath();
                ctx.moveTo(last.current.x, last.current.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                last.current = p;
                if (!hasInk) setHasInk(true);
              }}
              onPointerUp={finish}
              onPointerCancel={finish}
              onPointerLeave={finish}
            />
            {!hasInk && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-[#9a9a9a]">
                Sign here with your finger or mouse
              </span>
            )}
            <div className="pointer-events-none absolute bottom-7 left-4 right-4 border-b border-dashed border-[#c8c8c8]" />
          </div>
          <button type="button" onClick={clear} className="mt-1.5 text-[13px] font-semibold underline">
            Clear and sign again
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="sigName" className="mb-1.5 block text-[13px] text-[#595959]">
            Type your full name as your signature
          </label>
          <input
            id="sigName"
            value={typedName}
            onChange={(event) => onTypedName(event.target.value)}
            autoComplete="name"
            className="h-[52px] w-full rounded-lg border-2 border-[#171717] bg-white px-3 text-[22px] italic text-[#171717]"
            style={{ fontFamily: "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive" }}
          />
        </div>
      )}
    </div>
  );
}
