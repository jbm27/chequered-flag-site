"use client";

import { useState } from "react";
import { YARD } from "../lib/hire";
import PinMap, { type LatLng } from "./PinMap";

// Address search plus map for one pin (delivery or collection) on the hire page.
// Search and pin names use OpenStreetMap's Nominatim service. Its rules allow a search when the visitor asks
// (button or Enter) but not search-as-you-type.

const roundField =
  "h-[46px] w-full min-w-0 rounded-lg border border-[#c8c8c8] bg-white px-3 text-[15px] text-[#171717]";
const btnDark =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-lg border-0 bg-[#171717] px-[22px] text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-50";

export default function PinPicker({
  idPrefix,
  searchLabel,
  placeholder,
  pin,
  onChange,
}: {
  idPrefix: string; // "d" for delivery (input id "daddr"), "c" for collection ("caddr")
  searchLabel: string;
  placeholder: string;
  pin: LatLng | null;
  onChange: (pin: LatLng, address: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");

  async function searchAddress() {
    const q = query.trim();
    if (q.length < 3) {
      setSearchNote("Type at least 3 letters of the address, area or a nearby landmark.");
      return;
    }
    setSearching(true);
    setSearchNote("");
    setResults([]);
    try {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ke&q=" + encodeURIComponent(q),
        { headers: { "Accept-Language": "en" } },
      );
      const body = (await response.json()) as { display_name: string; lat: string; lon: string }[];
      const found = body.map((item) => ({ label: item.display_name, lat: Number(item.lat), lng: Number(item.lon) }));
      setResults(found);
      if (!found.length) setSearchNote("No match found. Try a nearby landmark, or tap the map to drop the pin.");
    } catch {
      setSearchNote("The address search is not available right now. Tap the map to drop the pin instead.");
    } finally {
      setSearching(false);
    }
  }

  function choosePlace(item: { label: string; lat: number; lng: number }) {
    onChange({ lat: item.lat, lng: item.lng }, item.label.split(",").slice(0, 4).join(",").trim());
    setResults([]);
    setSearchNote("");
  }

  async function dropPin(point: LatLng) {
    setResults([]);
    onChange(point, "Pinned location");
    try {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=" + point.lat + "&lon=" + point.lng,
        { headers: { "Accept-Language": "en" } },
      );
      const body = (await response.json()) as { display_name?: string };
      if (body.display_name) onChange(point, "Pin near " + body.display_name.split(",").slice(0, 3).join(",").trim());
    } catch {
      /* the pin is enough; the name is a convenience */
    }
  }

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          searchAddress();
        }}
      >
        <label htmlFor={idPrefix + "addr"} className="sr-only">
          {searchLabel}
        </label>
        <input
          id={idPrefix + "addr"}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={roundField}
        />
        <button type="submit" disabled={searching} className={btnDark + " h-[46px] flex-none px-5"}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {results.length > 0 && (
        <div role="listbox" aria-label="Matching places" className="mt-2 overflow-hidden rounded-lg border border-[#c8c8c8] bg-white">
          {results.map((item) => (
            <button
              key={item.lat + "," + item.lng}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => choosePlace(item)}
              className="block w-full cursor-pointer border-0 border-b border-[#f0f0f0] bg-white px-3.5 py-2.5 text-left text-sm text-[#171717] last:border-b-0 hover:bg-[#f7f7f5]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {searchNote && <p className="mt-2 text-[13px] text-[#5f4b00]">{searchNote}</p>}
      <div className="mt-3">
        <PinMap pin={pin} home={{ ...YARD, label: "Our workshop" }} onPick={dropPin} />
        <p className="mt-1.5 text-xs text-[#595959]">
          Can&apos;t find the address? Drag the map to the area, zoom in, and tap the exact spot.
        </p>
      </div>
    </div>
  );
}
