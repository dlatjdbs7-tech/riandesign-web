"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toAuthEmail, USERNAME_PATTERN } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!USERNAME_PATTERN.test(username)) {
      setError("아이디는 영문/숫자/밑줄(_)로 3~20자여야 합니다.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: toAuthEmail(username),
      password,
      options: {
        data: { username, full_name: fullName, hire_date: hireDate, department },
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "이미 사용 중인 아이디입니다."
          : "가입 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      return;
    }

    router.push("/pending");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-16 font-admin">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
        <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-charcoal">
          직원 회원가입
        </h1>
        <p className="mt-2 text-center text-xs text-charcoal/60">
          가입 후 대표 승인이 완료되면 이용하실 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs tracking-wide text-charcoal/70">
              아이디
            </label>
            <input
              id="username"
              type="text"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="영문/숫자/밑줄(_)로 3~20자"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
            <label htmlFor="hireDate" className="text-xs tracking-wide text-charcoal/70">
              입사일
            </label>
            <input
              id="hireDate"
              type="date"
              required
              value={hireDate}
              onChange={(event) => setHireDate(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="department" className="text-xs tracking-wide text-charcoal/70">
              부서
            </label>
            <input
              id="department"
              type="text"
              required
              placeholder="예: 디자인팀, 시공팀, 관리팀"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
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
