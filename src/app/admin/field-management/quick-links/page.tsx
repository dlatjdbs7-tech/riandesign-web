import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, PurchaseOrderStatus, QuickLink } from "@/lib/types";
import QuickLinkStatusSelect from "@/components/admin/QuickLinkStatusSelect";
import { createQuickLink, deleteQuickLink } from "./actions";

const COLUMNS: { status: PurchaseOrderStatus; label: string }[] = [
  { status: "ordered", label: "URL발주" },
  { status: "pending", label: "URL발주대기" },
  { status: "reference", label: "URL참조" },
];

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
    .order("created_at", { ascending: false })
    .returns<QuickLink[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">자주쓰는링크</h1>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 시공관리
        </Link>
      </div>
      <p className="mt-2 text-sm text-charcoal/60">자주 찾는 URL을 상태별로 한눈에 모아둡니다.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = links?.filter((l) => l.status === column.status) ?? [];
          return (
            <div key={column.status} className="rounded-sm border-t-4 border-orange-400 bg-stone-100 p-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-serif text-sm font-semibold text-charcoal">{column.label}</h2>
                <span className="text-xs text-charcoal/50">{items.length}</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {items.map((link) => (
                  <div key={link.id} className="rounded-sm border border-nude/60 bg-white p-3 text-sm">
                    {link.title !== link.url && (
                      <p className="truncate font-medium text-charcoal">{link.title}</p>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs text-taupe hover:text-orange-600"
                    >
                      {link.url}
                    </a>
                    <div className="mt-2 flex items-center justify-between">
                      <QuickLinkStatusSelect id={link.id} status={link.status} />
                      {canManage && (
                        <form action={deleteQuickLink.bind(null, link.id)}>
                          <button type="submit" className="text-xs text-charcoal/40 hover:text-red-600">
                            삭제
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="rounded-sm border border-dashed border-nude p-4 text-center text-xs text-charcoal/40">
                    없음
                  </p>
                )}
              </div>

              {canManage && (
                <form
                  action={createQuickLink}
                  className="mt-3 flex flex-col gap-2 border-t border-nude/40 pt-3"
                >
                  <input type="hidden" name="status" value={column.status} />
                  <input
                    name="title"
                    placeholder="소제목 (예: 이케아 조명)"
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-orange-400"
                  />
                  <input
                    type="url"
                    name="url"
                    required
                    placeholder="https://..."
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-orange-400"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-full border border-orange-400 px-3 py-1 text-xs text-orange-700 hover:bg-orange-100"
                  >
                    + URL 추가
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
