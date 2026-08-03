import { createClient } from "@/utils/supabase/server";
import type { Profile, Review } from "@/lib/types";
import { createReview, deleteReview } from "./actions";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .order("display_order")
    .returns<Review[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">고객후기</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        여기서 등록한 후기가 홈페이지 고객후기 섹션에 표시됩니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">작성자</th>
                <th className="px-4 py-3">프로젝트</th>
                <th className="px-4 py-3">평점</th>
                <th className="px-4 py-3">내용</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {reviews?.map((review) => (
                <tr key={review.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{review.author_name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{review.project_label ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{"★".repeat(review.rating)}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-charcoal/70">{review.content}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteReview.bind(null, review.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!reviews || reviews.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 후기가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form
            action={createReview}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <input
              name="author_name"
              placeholder="작성자 (예: 제빵사)"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <input
              name="project_label"
              placeholder="프로젝트 (예: 분당 까치마을4차 27PY)"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <input
              name="rating"
              type="number"
              min={1}
              max={5}
              defaultValue={5}
              placeholder="평점 (1~5)"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <textarea
              name="content"
              placeholder="후기 내용"
              rows={4}
              required
              className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <input
              name="display_order"
              type="number"
              placeholder="표시 순서"
              defaultValue={0}
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
            >
              후기 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
