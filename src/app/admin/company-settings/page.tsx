import { createClient } from "@/utils/supabase/server";
import type { CompanySettings, Profile } from "@/lib/types";
import { updateCompanySettings } from "./actions";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const isOwner = me?.role === "owner";

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single<CompanySettings>();

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl font-semibold text-charcoal">회사설정</h1>

      <form action={updateCompanySettings} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">상호</label>
          <input
            name="company_name"
            defaultValue={settings?.company_name ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">사업자등록번호</label>
          <input
            name="business_registration_number"
            defaultValue={settings?.business_registration_number ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">대표자</label>
          <input
            name="representative_name"
            defaultValue={settings?.representative_name ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">주소</label>
          <input
            name="address"
            defaultValue={settings?.address ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">전화번호</label>
          <input
            name="phone"
            defaultValue={settings?.phone ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs tracking-wide text-charcoal/70">이메일</label>
          <input
            name="email"
            defaultValue={settings?.email ?? ""}
            disabled={!isOwner}
            className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
          />
        </div>

        {isOwner && (
          <button
            type="submit"
            className="mt-2 self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
          >
            저장
          </button>
        )}
      </form>
    </div>
  );
}
