import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Profile, WorkDirective } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { createDirective, deleteDirective } from "./actions";
import DirectiveStatusSelect from "@/components/admin/DirectiveStatusSelect";

type DirectiveRow = WorkDirective & {
  profiles: Pick<Profile, "full_name"> | null;
};

export default async function WorkDirectivesPage() {
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

  const { data: directives } = await supabase
    .from("work_directives")
    .select("*, profiles!work_directives_assignee_id_fkey(full_name)")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<DirectiveRow[]>();

  const { data: employees } = canManage
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "approved")
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name">[]>()
    : { data: null };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">작업지시서</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            대표·팀장이 직원에게 작업 지시를 내리는 곳입니다. 지시 내용을 수기로 작성해 등록하세요.
          </p>
        </div>
        <Link href="/admin/field-management" className="text-xs text-taupe hover:text-orange-600">
          ← 시공관리
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {directives?.map((directive) => {
            const canManageRow = canManage || directive.created_by === user?.id || directive.assignee_id === user?.id;
            return (
              <div
                key={directive.id}
                className={`rounded-sm border border-nude/60 bg-white p-4 ${
                  directive.status === "completed" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`font-serif text-base font-semibold text-charcoal ${
                        directive.status === "completed" ? "line-through" : ""
                      }`}
                    >
                      {directive.title}
                    </p>
                    {directive.content && (
                      <p className="mt-1 whitespace-pre-line text-sm text-charcoal/70">{directive.content}</p>
                    )}
                  </div>
                  {canManageRow && (
                    <form action={deleteDirective.bind(null, directive.id)} className="shrink-0">
                      <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                        삭제
                      </button>
                    </form>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal/60">
                  <span>담당 {directive.profiles?.full_name ?? "미지정"}</span>
                  <span>기한 {directive.due_date ?? "미정"}</span>
                  <span>등록 {formatKST(directive.created_at)}</span>
                  <DirectiveStatusSelect id={directive.id} status={directive.status} />
                </div>
              </div>
            );
          })}
          {(!directives || directives.length === 0) && (
            <p className="rounded-sm border border-dashed border-nude p-8 text-center text-sm text-charcoal/40">
              등록된 작업지시가 없습니다.
            </p>
          )}
        </div>

        {canManage && (
          <form
            action={createDirective}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <p className="text-xs tracking-wide text-charcoal/70">새 작업지시 등록</p>
            <input
              name="title"
              placeholder="지시 제목"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <textarea
              name="content"
              placeholder="지시 내용을 수기로 작성하세요."
              rows={6}
              className="resize-none border border-nude/60 bg-cream/40 p-3 text-sm outline-none focus:border-orange-400"
            />
            <select
              name="assignee_id"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            >
              <option value="">담당자 없음</option>
              {employees?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
            <input
              name="due_date"
              type="date"
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-orange-300 px-6 py-2 text-sm font-medium text-orange-900 hover:bg-orange-400"
            >
              작업지시 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
