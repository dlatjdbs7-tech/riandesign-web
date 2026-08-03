import { createClient } from "@/utils/supabase/server";
import type { Review } from "@/lib/types";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .order("display_order")
    .returns<Review[]>();

  const average =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">REVIEW</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          Real Voices.
        </h1>
        {average && (
          <p className="mt-4 text-sm text-charcoal/60">
            {average}점 · 총 {reviews!.length}개의 후기
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        {reviews && reviews.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex flex-col gap-3 rounded-sm border border-nude/60 bg-cream p-8">
                <span className="text-sm tracking-wide text-gold">{"★".repeat(review.rating)}</span>
                <p className="text-sm leading-relaxed text-charcoal/70">&ldquo;{review.content}&rdquo;</p>
                <p className="mt-2 text-xs tracking-wide text-taupe">
                  {review.author_name}
                  {review.project_label ? ` · ${review.project_label}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-charcoal/50">등록된 후기가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
