"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitInquiry } from "@/app/(marketing)/actions";
import FileDropInput from "./FileDropInput";
import AddressSearch from "./AddressSearch";
import FlexibleDateInput from "./FlexibleDateInput";

const REFERRAL_SOURCES = ["유튜브", "인스타그램", "블로그", "지인소개", "인터넷검색", "기타"];
const PET_OPTIONS = ["고양이", "강아지", "기타", "없음"];
const SPACE_TYPES = ["아파트", "단독주택", "빌라", "주상복합", "오피스텔", "기타"];
const BUDGET_RANGES = [
  { label: "5,000~6,000만원대", desc: "꼭 필요한 부분부터, 실속 있게" },
  { label: "7,000~8,000만원대", desc: "공간 전체를 알차게" },
  { label: "9,000만원~1억원대", desc: "집 전체를 제대로, 빈틈없이" },
  { label: "1억2,000~1억5,000만원대", desc: "자재와 디테일까지 꼼꼼하게" },
  { label: "1억5,000만원 이상", desc: "상상하던 공간을, 우리 집으로" },
  { label: "예산 無 · 디자인 제안", desc: "예산은 열어두고, 디자인으로 승부" },
];

const inputClass =
  "rounded border border-nude bg-transparent px-4 py-3 text-sm text-charcoal outline-none focus:border-gold";
const compactInputClass =
  "rounded border border-nude bg-transparent px-4 py-2 text-sm text-charcoal outline-none focus:border-gold";
const labelClass = "text-xs tracking-wide text-charcoal/70";
const toggleButtonClass = (active: boolean) =>
  `rounded border px-3 py-2 text-sm transition-colors ${
    active
      ? "border-charcoal bg-charcoal text-cream"
      : "border-nude text-charcoal/70 hover:border-charcoal/50"
  }`;

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-display text-xs tracking-[0.3em] text-taupe">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-xl font-semibold text-charcoal">{title}</h3>
      <div className="mt-3 border-b border-nude/60" />
    </div>
  );
}

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pets, setPets] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [spaceType, setSpaceType] = useState("");

  function togglePet(option: string) {
    setPets((prev) => {
      if (option === "없음") return prev.includes("없음") ? [] : ["없음"];
      const withoutNone = prev.filter((p) => p !== "없음");
      return withoutNone.includes(option)
        ? withoutNone.filter((p) => p !== option)
        : [...withoutNone, option];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!referralSource) {
      setError("유입경로를 선택해주세요.");
      return;
    }

    if (!budgetRange) {
      setError("공사예산을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    const result = await submitInquiry(new FormData(event.currentTarget));

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <p className="rounded-sm border border-nude/60 bg-cream p-8 text-center text-sm text-charcoal/70">
        문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="flex flex-col gap-5">
        <SectionHeader eyebrow="CUSTOMER" title="고객정보" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className={labelClass}>
              성함
            </label>
            <input id="name" name="name" type="text" required className={compactInputClass} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className={labelClass}>
              연락처
            </label>
            <input id="phone" name="phone" type="tel" required className={compactInputClass} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="family_members" className={labelClass}>
              가족구성원
            </label>
            <input
              id="family_members"
              name="family_members"
              type="text"
              placeholder="예) 40대 부부, 초등학생 아들"
              className={compactInputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className={labelClass}>반려동물</p>
            <div className="flex gap-2">
              {PET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => togglePet(option)}
                  className={`flex-1 ${toggleButtonClass(pets.includes(option))}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {pets.map((pet) => (
              <input key={pet} type="hidden" name="pets" value={pet} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className={labelClass}>유입경로</p>
          <div className="flex flex-wrap gap-2">
            {REFERRAL_SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setReferralSource(source)}
                className={toggleButtonClass(referralSource === source)}
              >
                {source}
              </button>
            ))}
          </div>
          <input type="hidden" name="referral_source" value={referralSource} />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <SectionHeader eyebrow="SPACE" title="공간정보" />

        <AddressSearch name="address" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="size_py" className={labelClass}>
              평수
            </label>
            <input
              id="size_py"
              name="size_py"
              type="text"
              required
              placeholder="예) 34"
              className={compactInputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="floor_plan_type" className={labelClass}>
              평면 타입
            </label>
            <input
              id="floor_plan_type"
              name="floor_plan_type"
              type="text"
              placeholder="예) 84A"
              className={compactInputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="construction_date" className={labelClass}>
              공사 가능일
            </label>
            <FlexibleDateInput id="construction_date" name="construction_date" required />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="move_in_date" className={labelClass}>
              입주 희망일
            </label>
            <FlexibleDateInput id="move_in_date" name="move_in_date" required />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="visit_date" className={labelClass}>
              상담·방문 희망일
            </label>
            <FlexibleDateInput id="visit_date" name="visit_date" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="visit_time" className={labelClass}>
              상담 희망 시간
            </label>
            <input id="visit_time" name="visit_time" type="time" className={compactInputClass} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className={labelClass}>공간유형</p>
          <div className="grid grid-cols-3 gap-2">
            {SPACE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSpaceType(type)}
                className={toggleButtonClass(spaceType === type)}
              >
                {type}
              </button>
            ))}
          </div>
          <input type="hidden" name="space_type" value={spaceType} />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-charcoal">공사예산</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUDGET_RANGES.map((range) => {
              const active = budgetRange === range.label;
              return (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setBudgetRange(range.label)}
                  className={`rounded border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-charcoal bg-charcoal text-cream"
                      : "border-nude text-charcoal hover:border-charcoal/50"
                  }`}
                >
                  <p className="text-sm font-semibold">{range.label}</p>
                  <p className={`mt-1 text-xs ${active ? "text-cream/70" : "text-charcoal/50"}`}>
                    {range.desc}
                  </p>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="budget" value={budgetRange} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <p className="font-serif text-lg font-semibold text-charcoal">문의사항</p>
          <p className="mt-1 text-xs text-charcoal/60">
            문의하실 내용을 최대한 상세히 작성해 주시면 상담을 진행하는 데 큰 도움이 됩니다.
          </p>
        </div>
        <textarea
          id="message"
          name="message"
          rows={7}
          required
          className={`resize-none ${inputClass}`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="floor_plan" className={labelClass}>
            단위세대평면도 (선택)
          </label>
          <FileDropInput id="floor_plan" name="floor_plan" accept="image/*,.pdf" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reference" className={labelClass}>
            레퍼런스 (선택)
          </label>
          <FileDropInput id="reference" name="reference" accept="image/*,.pdf" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-charcoal">관심 포트폴리오 URL</p>
          <p className="mt-1 text-xs text-charcoal/60">
            선택 사항입니다. 참고할 링크가 있다면 첨부해 주세요.
          </p>
        </div>
        <input
          id="portfolio_url"
          name="portfolio_url"
          type="url"
          placeholder="https://"
          className={compactInputClass}
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-charcoal/60">
        <input type="checkbox" required className="mt-0.5" />
        <span>
          <Link href="/privacy" target="_blank" className="underline hover:text-gold">
            개인정보 수집 및 이용
          </Link>
          에 동의합니다.
        </span>
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded-full bg-gold px-8 py-3 text-sm tracking-wide text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "전송 중..." : "견적 문의"}
      </button>
    </form>
  );
}
