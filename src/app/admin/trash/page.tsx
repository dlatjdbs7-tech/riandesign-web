import { createClient } from "@/utils/supabase/server";
import { TABLE_LABEL } from "@/lib/trash";
import RestoreButton from "@/components/admin/RestoreButton";
import { EmptyTrashButton, PurgeButton } from "@/components/admin/TrashPurgeButtons";

type TrashRow = {
  id: string;
  table_name: string;
  label: string | null;
  deleted_at: string;
  profiles: { full_name: string } | null;
};

// 휴지통: 지운 항목을 모아 보고 원래 자리로 되돌린다. (대표·팀장은 전체, 직원은 본인이 지운 것만)
export default async function TrashPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("deleted_items")
    .select("id, table_name, label, deleted_at, profiles(full_name)")
    .order("deleted_at", { ascending: false })
    .limit(200)
    .returns<TrashRow[]>();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">휴지통</h1>
        <EmptyTrashButton count={items?.length ?? 0} />
      </div>
      <p className="mt-1 text-sm text-charcoal/50">
        지운 항목이 여기 보관됩니다. 되돌리기를 누르면 원래 메뉴에 다시 나타나고, 완전 삭제·휴지통 비우기를 하면 영영 지워집니다.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-nude/60 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs text-charcoal/55">
            <tr>
              <th className="px-4 py-3 font-medium">종류</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">지운 사람</th>
              <th className="px-4 py-3 font-medium">지운 시각</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id} className="border-b border-nude/30 last:border-0">
                <td className="px-4 py-3">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-charcoal/70">
                    {TABLE_LABEL[item.table_name] ?? item.table_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-charcoal">{item.label || "-"}</td>
                <td className="px-4 py-3 text-charcoal/60">{item.profiles?.full_name ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/60">
                  {new Date(item.deleted_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-3">
                    <PurgeButton trashId={item.id} label={item.label || "이 항목"} />
                    <RestoreButton trashId={item.id} />
                  </span>
                </td>
              </tr>
            ))}
            {(!items || items.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-charcoal/45">
                  휴지통이 비어 있습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
