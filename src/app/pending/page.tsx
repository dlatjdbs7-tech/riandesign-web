import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/lib/types";
import LogoutButton from "@/components/admin/LogoutButton";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profile?.status === "approved") {
    redirect("/admin");
  }

  const isRejected = profile?.status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-charcoal">
          {isRejected ? "승인이 거절되었습니다" : "승인 대기 중입니다"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-charcoal/70">
          {isRejected
            ? "가입 승인이 거절되었습니다. 담당자에게 문의해주세요."
            : "관리자(대표 또는 팀장)의 승인 후 이용하실 수 있습니다. 승인이 완료되면 다시 로그인해주세요."}
        </p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
