import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { deleteInquiry } from "./actions";
import InquiryStatusSelect from "@/components/admin/InquiryStatusSelect";

function hasExtraDetails(i: Inquiry) {
  return Boolean(
    i.construction_date ||
      i.move_in_date ||
      i.visit_date ||
      i.visit_time ||
      i.space_type ||
      i.family_members ||
      (i.pets && i.pets.length > 0) ||
      (i.construction_items && i.construction_items.length > 0) ||
      i.floor_plan_url ||
      i.reference_url ||
      i.portfolio_url
  );
}

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Inquiry[]>();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">상담접수</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            홈페이지, 블로그, 인스타그램, 지인소개 등 모든 경로로 들어온 상담 문의가 여기 한곳에 모입니다. 상태를
            바꾸면 현장관리 파이프라인에도 그대로 반영됩니다.
          </p>
        </div>
        <Link
          href="/admin/sites"
          className="shrink-0 rounded-full border border-nude bg-white px-4 py-2 text-xs font-medium text-charcoal/70 hover:border-orange-300 hover:text-orange-600"
        >
          현장관리 파이프라인에서 보기 →
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {inquiries?.map((i) => (
          <div key={i.id} className="rounded-sm border border-nude/60 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-charcoal">{i.name}</span>
                <span className="text-charcoal/70">{i.phone ?? "연락처 미입력"}</span>
                {i.referral_source && (
                  <span className="rounded-full bg-beige/50 px-2 py-0.5 text-[11px] text-charcoal/60">
                    {i.referral_source}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-charcoal/40">{formatKST(i.created_at)}</span>
                <InquiryStatusSelect id={i.id} status={i.status} />
              </div>
            </div>

            {(i.address || i.size_py || i.floor_plan_type || i.budget) && (
              <p className="mt-1.5 text-xs text-charcoal/50">
                {[
                  i.address,
                  [i.size_py, i.floor_plan_type].filter(Boolean).join(" ") || null,
                  i.budget && `예산 ${i.budget}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            <p className="mt-2 whitespace-pre-wrap rounded-sm bg-beige/20 p-3 text-charcoal/80">
              {i.message || "작성된 문의 내용이 없습니다."}
            </p>

            {hasExtraDetails(i) && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-charcoal/40 hover:text-charcoal/60">
                  추가 정보 더보기
                </summary>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {i.visit_date && (
                    <div>
                      <dt className="text-xs text-charcoal/50">상담·방문 희망일</dt>
                      <dd>
                        {i.visit_date}
                        {i.visit_time ? ` ${i.visit_time}` : ""}
                      </dd>
                    </div>
                  )}
                  {i.construction_date && (
                    <div>
                      <dt className="text-xs text-charcoal/50">공사 가능일</dt>
                      <dd>{i.construction_date}</dd>
                    </div>
                  )}
                  {i.move_in_date && (
                    <div>
                      <dt className="text-xs text-charcoal/50">입주 희망일</dt>
                      <dd>{i.move_in_date}</dd>
                    </div>
                  )}
                  {i.space_type && (
                    <div>
                      <dt className="text-xs text-charcoal/50">공간유형</dt>
                      <dd>{i.space_type}</dd>
                    </div>
                  )}
                  {i.family_members && (
                    <div>
                      <dt className="text-xs text-charcoal/50">가족구성원</dt>
                      <dd>{i.family_members}</dd>
                    </div>
                  )}
                  {i.pets && i.pets.length > 0 && (
                    <div>
                      <dt className="text-xs text-charcoal/50">반려동물</dt>
                      <dd>{i.pets.join(", ")}</dd>
                    </div>
                  )}
                  {i.construction_items && i.construction_items.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-charcoal/50">공사 내용</dt>
                      <dd>{i.construction_items.join(", ")}</dd>
                    </div>
                  )}
                  {i.portfolio_url && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-charcoal/50">관심 포트폴리오 URL</dt>
                      <dd>
                        <a
                          href={i.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold underline"
                        >
                          {i.portfolio_url}
                        </a>
                      </dd>
                    </div>
                  )}
                  {i.floor_plan_url && (
                    <div>
                      <dt className="text-xs text-charcoal/50">단위세대평면도</dt>
                      <dd>
                        <a
                          href={i.floor_plan_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold underline"
                        >
                          파일 보기
                        </a>
                      </dd>
                    </div>
                  )}
                  {i.reference_url && (
                    <div>
                      <dt className="text-xs text-charcoal/50">레퍼런스</dt>
                      <dd>
                        <a
                          href={i.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold underline"
                        >
                          파일 보기
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </details>
            )}

            <div className="mt-2">
              <form action={deleteInquiry.bind(null, i.id)}>
                <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                  삭제
                </button>
              </form>
            </div>
          </div>
        ))}
        {(!inquiries || inquiries.length === 0) && (
          <p className="rounded-sm border border-dashed border-nude bg-white py-10 text-center text-sm text-charcoal/50">
            접수된 문의가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
