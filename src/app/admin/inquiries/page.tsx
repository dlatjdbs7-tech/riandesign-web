import { createClient } from "@/utils/supabase/server";
import type { Inquiry } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { deleteInquiry } from "./actions";
import InquiryStatusSelect from "@/components/admin/InquiryStatusSelect";

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Inquiry[]>();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">접수관리</h1>
      <p className="mt-2 text-sm text-charcoal/60">홈페이지 상담 신청 폼으로 접수된 문의입니다.</p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">내용</th>
              <th className="px-4 py-3">접수일</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {inquiries?.map((i) => (
              <tr key={i.id} className="border-b border-nude/30 last:border-0">
                <td className="px-4 py-3">{i.name}</td>
                <td className="px-4 py-3 text-charcoal/70">{i.phone}</td>
                <td className="px-4 py-3 max-w-xs truncate text-charcoal/70">{i.message ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{formatKST(i.created_at)}</td>
                <td className="px-4 py-3">
                  <InquiryStatusSelect id={i.id} status={i.status} />
                </td>
                <td className="px-4 py-3">
                  <form action={deleteInquiry.bind(null, i.id)}>
                    <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!inquiries || inquiries.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-charcoal/50">
                  접수된 문의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
