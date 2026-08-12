"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type DaumPostcodeData = {
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string;
        height?: string;
      }) => {
        embed: (el: HTMLElement) => void;
      };
    };
  }
}

const inputClass =
  "rounded border border-nude bg-transparent px-4 py-3 text-sm text-charcoal outline-none focus:border-gold";

export default function AddressSearch({ name }: { name: string }) {
  const [baseAddress, setBaseAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && embedRef.current && window.daum?.Postcode) {
      embedRef.current.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data) => {
          setBaseAddress(data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress);
          setIsOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(embedRef.current);
    }
  }, [isOpen]);

  const combinedAddress = [baseAddress, detailAddress].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
      />

      <div>
        <p className="text-sm font-medium text-charcoal">공사예정지 주소</p>
        <p className="mt-1 text-xs text-charcoal/50">
          통합검색으로 아파트 주소를 찾은 뒤 상세주소를 입력해 주세요.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          required
          value={baseAddress}
          onClick={() => setIsOpen(true)}
          placeholder="아파트 · 도로명 · 지번 통합검색"
          className={`flex-1 cursor-pointer ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={!scriptReady}
          className="shrink-0 rounded border border-charcoal px-4 py-3 text-sm tracking-wide text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:opacity-50"
        >
          주소 검색
        </button>
      </div>

      <input
        type="text"
        value={detailAddress}
        onChange={(event) => setDetailAddress(event.target.value)}
        placeholder="상세주소 (동, 호수 등)를 입력해 주세요."
        className={inputClass}
      />

      <input type="hidden" name={name} value={combinedAddress} />

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative h-[480px] w-full max-w-md overflow-hidden rounded-sm bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="닫기"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/80 text-sm text-white hover:bg-charcoal"
            >
              ✕
            </button>
            <div ref={embedRef} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
