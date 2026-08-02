"use client";

import { useState, type FormEvent } from "react";

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 실제 이메일/DB 전송 연동은 별도 작업 단위(백엔드 연결)에서 진행합니다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
  }

  return (
    <section id="contact" className="bg-charcoal px-6 py-24 text-cream sm:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.4em] text-nude">CONTACT</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">상담 신청</h2>
          <p className="mt-4 text-sm text-cream/70">
            공간에 대한 고민을 남겨주시면 담당자가 순서대로 연락드립니다.
          </p>
        </div>

        {isSubmitted ? (
          <p className="rounded-sm border border-nude/30 bg-cream/5 p-8 text-center text-sm">
            문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-xs tracking-wide text-cream/70">
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="border-b border-cream/30 bg-transparent py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-xs tracking-wide text-cream/70">
                  연락처
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="border-b border-cream/30 bg-transparent py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-xs tracking-wide text-cream/70">
                문의 내용
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="resize-none border-b border-cream/30 bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-cream/60">
              <input type="checkbox" required className="mt-0.5" />
              개인정보 수집 및 이용에 동의합니다.
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-gold px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:bg-nude"
            >
              문의 보내기
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
