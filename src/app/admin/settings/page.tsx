"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (updateError) {
      setError("변경 중 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }

    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="max-w-sm">
      <h1 className="font-serif text-2xl font-semibold text-charcoal">비밀번호 변경</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="newPassword" className="text-xs tracking-wide text-charcoal/70">
            새 비밀번호 (6자 이상)
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-xs tracking-wide text-charcoal/70">
            새 비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="border-b border-nude bg-transparent py-2 text-sm text-charcoal outline-none focus:border-gold"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {success && <p className="text-sm text-emerald-700">비밀번호가 변경되었습니다.</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 self-start rounded-full bg-charcoal px-8 py-3 text-sm tracking-wide text-cream transition-colors hover:bg-gold disabled:opacity-50"
        >
          {isSubmitting ? "변경 중..." : "변경하기"}
        </button>
      </form>
    </div>
  );
}
