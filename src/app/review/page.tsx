import { Suspense } from "react";
import ReviewForm from "../../components/ReviewForm";

export const metadata = {
  title: "Review your hire",
  robots: { index: false, follow: false }, // each review link is private to one booking
};

export default function ReviewPage() {
  return (
    <main className="mx-auto box-border max-w-[720px] px-[5.5%] py-12 sm:px-6">
      <Suspense fallback={<p className="text-sm text-[#595959]">Loading…</p>}>
        <ReviewForm />
      </Suspense>
    </main>
  );
}
