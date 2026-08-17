import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Inquiry, Profile } from "@/lib/types";
import { formatKST } from "@/lib/date";
import { deleteInquiry } from "./actions";
import { createLeadInquiry, updateInquiryMessage } from "../sites/actions";
import InquiryStatusSelect from "@/components/admin/InquiryStatusSelect";
import FormattedPhoneInput from "@/components/admin/FormattedPhoneInput";
import FormattedNumberInput from "@/components/admin/FormattedNumberInput";
import InlineInquiryFieldInput from "@/components/admin/InlineInquiryFieldInput";
import InlineActionInput from "@/components/admin/InlineActionInput";

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

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const showLeadForm = params.new === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("*").eq("id", user!.id).single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

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
        <div className="flex shrink-0 items-center gap-2">
          {canManage && (
            <Link
              href={showLeadForm ? "/admin/inquiries" : "/admin/inquiries?new=1"}
              className="rounded-full bg-rose-400 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500"
            >
              {showLeadForm ? "닫기" : "+ 문의 수기 등록"}
            </Link>
          )}
          <Link
            href="/admin/sites"
            className="rounded-full border border-nude bg-white px-4 py-2 text-xs font-medium text-charcoal/70 hover:border-orange-300 hover:text-orange-600"
          >
            현장관리 파이프라인에서 보기 →
          </Link>
        </div>
      </div>

      {showLeadForm && canManage && (
        <form
          action={createLeadInquiry.bind(null, "/admin/inquiries")}
          className="mt-6 grid gap-3 rounded-sm border border-rose-200 bg-rose-50/40 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            name="address"
            placeholder="아파트명 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <input
            name="size_py"
            placeholder="평수 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <input
            name="floor_plan_type"
            placeholder="타입 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <input
            name="name"
            placeholder="성함 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <FormattedPhoneInput
            name="phone"
            placeholder="연락처 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <FormattedNumberInput
            name="budget"
            placeholder="예산 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <input
            name="message"
            placeholder="어떤 문의였는지 간단히 (선택)"
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-rose-400"
          />
          <button
            type="submit"
            className="rounded-full bg-rose-400 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500 lg:col-span-4 lg:w-fit"
          >
            문의 등록
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {inquiries?.map((i) => (
          <div key={i.id} className="rounded-sm border border-nude/60 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {canManage ? (
                  <InlineInquiryFieldInput
                    inquiryId={i.id}
                    field="name"
                    value={i.name}
                    placeholder="성함"
                    className="w-20 border-b border-transparent bg-transparent font-medium text-charcoal outline-none hover:border-nude focus:border-rose-400"
                  />
                ) : (
                  <span className="font-medium text-charcoal">{i.name}</span>
                )}
                {canManage ? (
                  <InlineInquiryFieldInput
                    inquiryId={i.id}
                    field="phone"
                    value={i.phone ?? ""}
                    placeholder="연락처"
                    format="phone"
                    className="w-28 border-b border-transparent bg-transparent text-charcoal/70 outline-none hover:border-nude focus:border-rose-400"
                  />
                ) : (
                  <span className="text-charcoal/70">{i.phone ?? "연락처 미입력"}</span>
                )}
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

            {canManage ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-charcoal/50">
                <InlineInquiryFieldInput
                  inquiryId={i.id}
                  field="address"
                  value={i.address ?? ""}
                  placeholder="아파트명"
                  className="w-32 border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-rose-400"
                />
                <span className="text-charcoal/20">·</span>
                <InlineInquiryFieldInput
                  inquiryId={i.id}
                  field="size_py"
                  value={i.size_py ?? ""}
                  placeholder="평수"
                  className="w-12 border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-rose-400"
                />
                <InlineInquiryFieldInput
                  inquiryId={i.id}
                  field="floor_plan_type"
                  value={i.floor_plan_type ?? ""}
                  placeholder="타입"
                  className="w-14 border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-rose-400"
                />
                <span className="text-charcoal/20">·</span>
                <InlineInquiryFieldInput
                  inquiryId={i.id}
                  field="budget"
                  value={i.budget ?? ""}
                  placeholder="예산"
                  format="number"
                  className="w-20 border-b border-transparent bg-transparent outline-none hover:border-nude focus:border-rose-400"
                />
              </div>
            ) : (
              (i.address || i.size_py || i.floor_plan_type || i.budget) && (
                <p className="mt-1.5 text-xs text-charcoal/50">
                  {[
                    i.address,
                    [i.size_py, i.floor_plan_type].filter(Boolean).join(" ") || null,
                    i.budget && `예산 ${i.budget}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )
            )}

            {canManage ? (
              <InlineActionInput
                id={i.id}
                value={i.message ?? ""}
                placeholder="문의 내용을 적어두세요"
                action={updateInquiryMessage}
                multiline
                rows={2}
                className="mt-2 w-full resize-none rounded-sm border border-nude/40 bg-beige/20 p-2 text-xs text-charcoal/80 outline-none focus:border-rose-400"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap rounded-sm bg-beige/20 p-3 text-charcoal/80">
                {i.message || "작성된 문의 내용이 없습니다."}
              </p>
            )}

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
