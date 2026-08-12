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
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">평형</th>
              <th className="px-4 py-3">예산</th>
              <th className="px-4 py-3">접수일</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {inquiries?.map((i) => (
              <tr key={i.id} className="border-b border-nude/30 last:border-0 align-top">
                <td className="px-4 py-3">{i.name}</td>
                <td className="px-4 py-3 text-charcoal/70">{i.phone}</td>
                <td className="px-4 py-3 text-charcoal/70">{i.size_py ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{i.budget ?? "-"}</td>
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
                <td colSpan={7} className="px-4 py-6 text-center text-charcoal/50">
                  접수된 문의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inquiries && inquiries.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {inquiries.map((i) => (
            <details key={i.id} className="rounded-sm border border-nude/60 bg-white p-4 text-sm">
              <summary className="cursor-pointer text-charcoal/70">
                {i.name} 상세보기
              </summary>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-charcoal/50">주소</dt>
                  <dd>{i.address ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">공사 예정일</dt>
                  <dd>{i.construction_date ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">입주 예정일</dt>
                  <dd>{i.move_in_date ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">유입경로</dt>
                  <dd>{i.referral_source ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">가족구성원</dt>
                  <dd>{i.family_members ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">반려동물</dt>
                  <dd>{i.pets && i.pets.length > 0 ? i.pets.join(", ") : "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-charcoal/50">공사 내용</dt>
                  <dd>{i.construction_items && i.construction_items.length > 0 ? i.construction_items.join(", ") : "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-charcoal/50">문의 내용</dt>
                  <dd className="whitespace-pre-wrap">{i.message ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">단위세대평면도</dt>
                  <dd>
                    {i.floor_plan_url ? (
                      <a href={i.floor_plan_url} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                        파일 보기
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">레퍼런스</dt>
                  <dd>
                    {i.reference_url ? (
                      <a href={i.reference_url} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                        파일 보기
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
