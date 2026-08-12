import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Manual, Profile } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { createManual, deleteManual, updateManual } from "./actions";

export default async function ManualPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const params = await searchParams;
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

  const { data: manuals } = await supabase
    .from("manuals")
    .select("*")
    .order("title", { ascending: true })
    .returns<Manual[]>();

  const selected = params.id ? manuals?.find((m) => m.id === params.id) : (manuals?.[0] ?? null);
  const isCreating = params.new === "1";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">리안메뉴얼</h1>
        {canManage && (
          <Link
            href="/admin/manual?new=1"
            className="rounded-full bg-charcoal px-5 py-2 text-xs tracking-wide text-cream hover:bg-gold"
          >
            + 새 문서
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-1 rounded-sm border border-nude/60 bg-white p-3">
          {manuals?.map((manual) => (
            <Link
              key={manual.id}
              href={`/admin/manual?id=${manual.id}`}
              className={`rounded-sm px-3 py-2 text-sm ${
                selected?.id === manual.id && !isCreating
                  ? "bg-beige text-charcoal"
                  : "text-charcoal/70 hover:bg-beige/50"
              }`}
            >
              {manual.title}
            </Link>
          ))}
          {(!manuals || manuals.length === 0) && (
            <p className="px-3 py-2 text-sm text-charcoal/50">등록된 문서가 없습니다.</p>
          )}
        </div>

        <div className="rounded-sm border border-nude/60 bg-white p-6">
          {isCreating && canManage ? (
            <form action={createManual} className="flex flex-col gap-4">
              <input
                name="title"
                placeholder="문서 제목"
                required
                className="border-b border-nude bg-transparent py-2 text-lg font-serif outline-none focus:border-gold"
              />
              <textarea
                name="content"
                placeholder="내용을 입력하세요."
                rows={14}
                required
                className="resize-none border border-nude/60 bg-cream/40 p-3 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
              >
                저장
              </button>
            </form>
          ) : selected ? (
            <div>
              <div className="flex items-start justify-between">
                <h2 className="font-serif text-xl font-semibold tracking-tight text-charcoal">{selected.title}</h2>
                {canManage && (
                  <form action={deleteManual.bind(null, selected.id)}>
                    <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                      삭제
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-1 text-xs text-charcoal/40">최종 수정 {formatKST(selected.updated_at)}</p>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed tracking-tight text-charcoal/80">
                {selected.content}
              </p>

              {canManage && (
                <details className="mt-8">
                  <summary className="cursor-pointer text-xs text-taupe hover:text-gold">수정하기</summary>
                  <form action={updateManual.bind(null, selected.id)} className="mt-4 flex flex-col gap-4">
                    <input
                      name="title"
                      defaultValue={selected.title}
                      required
                      className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
                    />
                    <textarea
                      name="content"
                      defaultValue={selected.content}
                      rows={10}
                      required
                      className="resize-none border border-nude/60 bg-cream/40 p-3 text-sm outline-none focus:border-gold"
                    />
                    <button
                      type="submit"
                      className="self-start rounded-full border border-charcoal/30 px-6 py-2 text-sm text-charcoal hover:border-charcoal"
                    >
                      수정 저장
                    </button>
                  </form>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-charcoal/50">
              {canManage ? "왼쪽에서 문서를 선택하거나 새 문서를 작성하세요." : "등록된 매뉴얼이 없습니다."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
