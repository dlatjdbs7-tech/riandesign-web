import { createClient } from "@/utils/supabase/server";
import type { Profile, ProcessStep } from "@/lib/types";
import { createProcessStep, deleteProcessStep } from "./actions";

export default async function ProcessPage() {
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

  const { data: steps } = await supabase
    .from("process_steps")
    .select("*")
    .order("display_order")
    .returns<ProcessStep[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">시공프로세스</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        여기서 등록한 단계가 홈페이지 프로세스 페이지에 순서대로 표시됩니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
              <tr>
                <th className="px-4 py-3">단계</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">설명</th>
                <th className="px-4 py-3">순서</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {steps?.map((step) => (
                <tr key={step.id} className="border-b border-nude/30 last:border-0">
                  <td className="px-4 py-3">{step.step_number}</td>
                  <td className="px-4 py-3">{step.title}</td>
                  <td className="px-4 py-3 text-charcoal/70">{step.description ?? "-"}</td>
                  <td className="px-4 py-3 text-charcoal/70">{step.display_order}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={deleteProcessStep.bind(null, step.id)}>
                        <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                          삭제
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(!steps || steps.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-charcoal/50">
                    등록된 단계가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form
            action={createProcessStep}
            className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
          >
            <input
              name="step_number"
              type="number"
              placeholder="단계 번호 (예: 1)"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <input
              name="title"
              placeholder="제목"
              required
              className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
            />
            <textarea
              name="description"
              placeholder="설명"
              rows={3}
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
              단계 등록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
