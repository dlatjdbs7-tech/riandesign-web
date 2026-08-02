"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "이미 가입된 이메일입니다."
          : "가입 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
          <h1 className="mt-3 font-serif text-2xl font-semibold text-charcoal">
            이메일을 확인해주세요
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-charcoal/70">
            입력하신 이메일로 인증 링크를 보내드렸습니다. 링크를 클릭해서 인증을 완료하면
            로그인하실 수 있습니다. 로그인 후에는 관리자 승인을 기다려주세요.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-gold underline">
            로그인 화면으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
        <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-charcoal">
          직원 회원가입
        </h1>
        <p className="mt-2 text-center text-xs text-charcoal/60">
          가입 후 관리자 승인이 완료되면 이용하실 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-xs tracking-wide text-charcoal/70">
              이름
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-xs tracking-wide text-charcoal/70">
              연락처
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs tracking-wide text-charcoal/70">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs tracking-wide text-charcoal/70">
              비밀번호 (6자 이상)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-charcoal px-8 py-3 text-sm tracking-wide text-cream transition-colors hover:bg-gold disabled:opacity-50"
          >
            {isSubmitting ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-charcoal/60">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-gold underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
