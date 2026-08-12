"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toAuthEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: toAuthEmail(username),
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 font-admin">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
        <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-charcoal">
          관리자 로그인
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs tracking-wide text-charcoal/70">
              아이디
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs tracking-wide text-charcoal/70">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
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
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-charcoal/60">
          계정이 없으신가요?{" "}
          <Link href="/reangroup" className="text-gold underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
