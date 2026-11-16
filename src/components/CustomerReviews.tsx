"use client";

import { useEffect, useState } from "react";

// "What our customers say" on the hire page: reviews staff have approved on the desk. Hidden until there is one.

type Published = { count: number; average: number | null; reviews: { rating: number; comment: string; name: string; vehicle: string; month: string }[] };

export default function CustomerReviews({ wrap, eyebrow, h2 }: { wrap: string; eyebrow: string; h2: string }) {
  const [data, setData] = useState<Published | null>(null);

  useEffect(() => {
    fetch("/api/hire/reviews")
      .then((response) => response.json())
      .then((body: Published) => setData(body))
      .catch(() => setData(null));
  }, []);

  if (!data || !data.count) return null;
  return (
    <section id="reviews" className={wrap}>
      <div className={eyebrow}>Reviews</div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className={h2}>What our customers say</h2>
        {data.average !== null && (
          <span className="text-[15px] text-[#3f3f3f]">
            <span className="text-[#e8a300]" aria-hidden="true">
              ★
            </span>{" "}
            <strong>{data.average.toFixed(1)}</strong> out of 5 from {data.count} review{data.count === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
        {data.reviews.map((review, index) => (
          <figure key={index} className="min-w-0 rounded-xl border border-[#e5e5e5] bg-white px-5 py-4">
            <div aria-label={review.rating + " out of 5 stars"} className="text-[18px] leading-none">
              <span className="text-[#e8a300]">{"★".repeat(review.rating)}</span>
              <span className="text-[#d6d6d1]">{"★".repeat(5 - review.rating)}</span>
            </div>
            {review.comment && <blockquote className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#171717]">{review.comment}</blockquote>}
            <figcaption className="mt-2 text-[13px] text-[#595959]">
              {review.name} · {review.vehicle} · {review.month}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
