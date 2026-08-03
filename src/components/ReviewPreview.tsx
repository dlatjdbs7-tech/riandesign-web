import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Review } from "@/lib/types";

export default async function ReviewPreview() {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .order("display_order")
    .limit(3)
    .returns<Review[]>();

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="mb-14 text-center">
        <p className="text-xs tracking-[0.4em] text-taupe">REVIEW</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
          고객이 직접 전하는 이야기
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {reviews.map((review) => (
          <div key={review.id} className="flex flex-col gap-3 rounded-sm border border-nude/60 bg-cream p-8">
            <span className="text-sm tracking-wide text-gold">{"★".repeat(review.rating)}</span>
            <p className="line-clamp-4 text-sm leading-relaxed text-charcoal/70">
              &ldquo;{review.content}&rdquo;
            </p>
            <p className="mt-2 text-xs tracking-wide text-taupe">
              {review.author_name}
              {review.project_label ? ` · ${review.project_label}` : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link
          href="/review"
          className="inline-flex items-center gap-2 rounded-full border border-charcoal/30 px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:border-charcoal"
        >
          후기 전체보기 <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
