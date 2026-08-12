import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Manual, Profile } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { createManual, deleteManual, updateManual } from "./actions";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function linkifyContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_PATTERN.exec(content)) !== null) {
    if (match.index > lastIndex) nodes.push(content.slice(lastIndex, match.index));
    const url = match[0];
    nodes.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold underline hover:text-orange-600"
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < content.length) nodes.push(content.slice(lastIndex));
  return nodes;
}

export default async function ManualPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isCreating && canManage && (
          <div className="rounded-sm border border-nude/60 bg-white p-6 lg:col-span-2">
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
                rows={8}
                required
                className="resize-none border border-nude/60 bg-cream/40 p-3 text-sm outline-none focus:border-gold"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
                >
                  저장
                </button>
                <Link href="/admin/manual" className="text-xs text-taupe hover:text-gold">
                  취소
                </Link>
              </div>
            </form>
          </div>
        )}

        {manuals?.map((manual) => (
          <div key={manual.id} className="flex flex-col rounded-sm border border-nude/60 bg-white p-6">
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-xl font-semibold tracking-tight text-charcoal">{manual.title}</h2>
              {canManage && (
                <form action={deleteManual.bind(null, manual.id)}>
                  <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                    삭제
                  </button>
                </form>
              )}
            </div>
            <p className="mt-1 text-xs text-charcoal/40">최종 수정 {formatKST(manual.updated_at)}</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed tracking-tight text-charcoal/80">
              {linkifyContent(manual.content)}
            </p>

            {canManage && (
              <details className="mt-6">
                <summary className="cursor-pointer text-xs text-taupe hover:text-gold">수정하기</summary>
                <form action={updateManual.bind(null, manual.id)} className="mt-4 flex flex-col gap-4">
                  <input
                    name="title"
                    defaultValue={manual.title}
                    required
                    className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
                  />
                  <textarea
                    name="content"
                    defaultValue={manual.content}
                    rows={8}
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
        ))}

        {(!manuals || manuals.length === 0) && !isCreating && (
          <p className="text-sm text-charcoal/50 lg:col-span-2">
            {canManage ? "등록된 문서가 없습니다. 새 문서를 작성해보세요." : "등록된 매뉴얼이 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
