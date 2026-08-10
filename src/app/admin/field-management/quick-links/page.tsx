import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, QuickLink } from "@/lib/types";
import { createQuickLink, deleteQuickLink } from "./actions";

export default async function QuickLinksPage() {
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

  const { data: links } = await supabase
    .from("quick_links")
    .select("*")
    .order("category", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true })
    .returns<QuickLink[]>();

  const groups = new Map<string, QuickLink[]>();
  for (const link of links ?? []) {
    const key = link.category ?? "기타";
    const list = groups.get(key) ?? [];
    list.push(link);
    groups.set(key, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">자주쓰는링크</h1>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 현장관리
        </Link>
      </div>
      <p className="mt-2 text-sm text-charcoal/60">
        자재사이트, 설계사이트, 참조사이트 등 자주 찾는 링크를 카테고리별로 모아둡니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {Array.from(groups.entries()).map(([category, categoryLinks]) => (
            <div key={category} className="rounded-sm border border-nude/60 bg-white p-4">
              <h2 className="font-serif text-sm font-semibold text-charcoal">{category}</h2>
              <div className="mt-3 flex flex-col gap-2">
                {categoryLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-sm border border-nude/40 p-2.5 text-sm"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-charcoal hover:text-orange-600"
                    >
                      {link.title}
                    </a>
                    {canManage && (
                      <form action={deleteQuickLink.bind(null, link.id)}>
                        <button type="submit" className="ml-2 shrink-0 text-xs text-charcoal/40 hover:text-red-600">
                          삭제
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.size === 0 && (
            <p className="rounded-sm border border-dashed border-nude p-8 text-center text-sm text-charcoal/40">
              등록된 링크가 없습니다.
            </p>
          )}
        </div>

        {canManage && (
          <form
            action={createQuickLink}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <input
              name="title"
              placeholder="제목 (예: OO자재 쇼핑몰)"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="url"
              type="url"
              placeholder="https://..."
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <input
              name="category"
              placeholder="카테고리 (예: 자재사이트, 설계사이트, 참조사이트)"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-orange-300 px-6 py-2 text-sm tracking-wide text-orange-900 hover:bg-orange-400"
            >
              링크 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
