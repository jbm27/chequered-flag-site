"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_BYTES, type DocImage } from "../lib/documents";

// Pieces of the booking checkout for the security update: licence photo upload and the signature box.

// Licence files customers can choose: JPG/JPEG, PNG, WebP, HEIC/HEIF (iPhone photos) and PDF (scans).
// Some computers give HEIC files no type, so the file name's ending is checked too.
export const LICENCE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";
const MAX_UPLOAD_BYTES = 25_000_000; // before shrinking
const ENDINGS: Record<string, string> = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", heic: "heic", heif: "heic", pdf: "pdf" };

export function licenceFileKind(file: File) {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg") return "jpeg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic" || type === "image/heif" || type === "image/heic-sequence" || type === "image/heif-sequence") return "heic";
  if (type === "application/pdf") return "pdf";
  const ending = (file.name.split(".").pop() || "").toLowerCase();
  return ENDINGS[ending] || "";
}

type Picture = { source: CanvasImageSource; width: number; height: number; done: () => void };

function loadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  return new Promise<Picture>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve({ source: el, width: el.naturalWidth, height: el.naturalHeight, done: () => URL.revokeObjectURL(url) });
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    el.src = url;
  });
}

// HEIC: Safari (iPhone, iPad, Mac) opens it directly. Other browsers convert it with heic2any, which is
// only downloaded when someone picks a HEIC file.
async function loadHeic(file: File) {
  try {
    return await loadImage(file);
  } catch {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return loadImage(Array.isArray(converted) ? converted[0] : converted);
  }
}

// PDF: the first page is drawn as a picture with Mozilla's pdf.js, only downloaded when someone picks a PDF.
// Scripts inside the PDF never run (pdf.js doesn't run them, and eval is switched off).
async function loadPdf(file: File): Promise<Picture> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // The worker is copied into public/ when the site is built (scripts/copy-pdf-worker.js).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, enableXfa: false }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, 2400 / Math.max(base.width, base.height)) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return trimWhite(canvas);
  } finally {
    doc.destroy();
  }
}

// A licence scanned on an A4 page is small with a lot of white around it: cut the white margins off
// (keeping a little border) so the licence fills the picture the desk sees.
function trimWhite(canvas: HTMLCanvasElement): Picture {
  const { width, height } = canvas;
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, width, height).data;
  let top = height, left = width, bottom = -1, right = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (pixels[i] < 232 || pixels[i + 1] < 232 || pixels[i + 2] < 232) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  const whole = { source: canvas, width, height, done: () => undefined };
  if (bottom < 0) return whole; // a blank page
  const pad = Math.round(Math.max(width, height) * 0.02);
  const x = Math.max(0, left - pad), y = Math.max(0, top - pad);
  const w = Math.min(width, right + pad) - x, h = Math.min(height, bottom + pad) - y;
  if (w * h > width * height * 0.8) return whole; // already fills the page
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return { source: out, width: w, height: h, done: () => undefined };
}

const UNREADABLE: Record<string, string> = {
  heic: "That HEIC photo could not be opened. Please use “Take a photo”, or save the photo as a JPG and upload that.",
  pdf: "That PDF could not be opened. Please upload a photo of your licence instead.",
};

// Shrinks a photo in the browser to a JPEG no wider or taller than 1400px (2000px for a PDF page), so uploads
// stay small. Everything is saved as JPEG, so the desk and the booking PDF work the same whatever was uploaded.
export async function compressPhoto(file: File): Promise<DocImage> {
  const kind = licenceFileKind(file);
  if (!kind) throw new Error("Please choose a JPG, PNG, HEIC, WebP or PDF file of your licence.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That file is over 25 MB. Please choose a smaller one.");
  let picture: Picture;
  try {
    picture = kind === "pdf" ? await loadPdf(file) : kind === "heic" ? await loadHeic(file) : await loadImage(file);
  } catch {
    throw new Error(UNREADABLE[kind] || "That photo could not be opened. Please try another JPG or PNG.");
  }
  try {
    let maxSide = kind === "pdf" ? 2000 : 1400;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, maxSide / Math.max(picture.width, picture.height));
      const w = Math.max(1, Math.round(picture.width * scale));
      const h = Math.max(1, Math.round(picture.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(picture.source, 0, 0, w, h);
      const data = canvas.toDataURL("image/jpeg", attempt < 2 ? 0.72 : 0.6);
      const bytes = Math.floor(((data.length - data.indexOf(",") - 1) * 3) / 4);
      if (bytes <= MAX_IMAGE_BYTES * 0.9) return { data, w, h };
      maxSide = Math.round(maxSide * 0.8);
    }
    throw new Error("That photo is too large. Please try another photo.");
  } finally {
    picture.done();
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
                  {value ? "Upload another" : "Upload a file"}
                </label>
              </div>
              {/* Upload from the gallery or files */}
              <input
                id={id}
                type="file"
                accept={LICENCE_ACCEPT}
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
                {busy ? "Preparing your licence…" : value ? "Photo added." : "Use your camera or upload a clear photo of the front, with all four corners showing. JPG, PNG, HEIC, WebP or PDF."}
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
