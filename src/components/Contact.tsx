"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitInquiry } from "@/app/(marketing)/actions";
import FileDropInput from "./FileDropInput";

const CONSTRUCTION_ITEMS = [
  "도배",
  "바닥 [마루 or 타일]",
  "필름 시공",
  "욕실 리모델링",
  "제작 가구 [씽크대, 붙박이장, 신발장 등]",
  "조명 및 전기",
  "베란다",
  "확장 공사",
  "분배기 교체",
  "난방 배관 교체",
  "시스템 에어컨",
  "창호 시공",
];

const REFERRAL_SOURCES = ["블로그", "인스타그램", "유튜브", "인터넷 검색", "지인 소개"];

const inputClass =
  "rounded border border-nude bg-transparent px-4 py-3 text-sm text-charcoal outline-none focus:border-gold";
const labelClass = "text-xs tracking-wide text-charcoal/70";

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className={labelClass}>
            성함
          </label>
          <input id="name" name="name" type="text" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className={labelClass}>
            연락처
          </label>
          <input id="phone" name="phone" type="tel" required className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="address" className={labelClass}>
          주소
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          placeholder="예) 대전 OO아파트 OOO동 OOOO호"
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="size_py" className={labelClass}>
            평형 [면적]
          </label>
          <input id="size_py" name="size_py" type="text" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="budget" className={labelClass}>
            예산
          </label>
          <input id="budget" name="budget" type="text" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="construction_date" className={labelClass}>
            공사 예정일
          </label>
          <input
            id="construction_date"
            name="construction_date"
            type="text"
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="move_in_date" className={labelClass}>
            입주 예정일
          </label>
          <input
            id="move_in_date"
            name="move_in_date"
            type="text"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className={labelClass}>공사 내용</p>
        <div className="flex flex-col gap-2">
          {CONSTRUCTION_ITEMS.map((item) => (
            <label key={item} className="flex items-start gap-2 text-xs text-charcoal/70">
              <input type="checkbox" name="construction_items" value={item} className="mt-0.5" />
              {item}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className={labelClass}>유입경로</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {REFERRAL_SOURCES.map((source) => (
            <label key={source} className="flex items-center gap-2 text-xs text-charcoal/70">
              <input type="radio" name="referral_source" value={source} required />
              {source}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={labelClass}>
          문의 내용
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
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
