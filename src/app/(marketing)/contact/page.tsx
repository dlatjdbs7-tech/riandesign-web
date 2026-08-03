import Contact from "@/components/Contact";
import { createClient } from "@/utils/supabase/server";
import type { CompanySettings, SiteContent } from "@/lib/types";

export default async function ContactPage() {
  const supabase = await createClient();
  const [{ data: content }, { data: settings }] = await Promise.all([
    supabase.from("site_content").select("*").eq("id", 1).single<SiteContent>(),
    supabase.from("company_settings").select("*").eq("id", 1).single<CompanySettings>(),
  ]);

  const notice =
    content?.contact_notice || "상담은 예약제로 운영되고 있어 사전 예약 후 방문 부탁드립니다.";

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">CONTACT</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          Contact & FAQ
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-charcoal/60">{notice}</p>
        {settings?.address && (
          <p className="mt-2 text-sm text-charcoal/60">{settings.address}</p>
        )}
      </section>

      <Contact />
    </div>
  );
}
