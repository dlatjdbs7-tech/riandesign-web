import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { SiteContent } from "@/lib/types";

export default async function ContactCTA() {
  const supabase = await createClient();
  const { data: content } = await supabase
    .from("site_content")
    .select("*")
    .eq("id", 1)
    .single<SiteContent>();

  const notice =
    content?.contact_notice || "상담은 예약제로 운영되고 있어 사전 예약 후 방문 부탁드립니다.";

  return (
    <section id="contact" className="bg-charcoal px-6 py-24 text-center text-cream sm:px-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs tracking-[0.4em] text-nude">CONTACT</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">상담 신청</h2>
        <p className="mt-4 text-sm text-cream/70">
          공간에 대한 고민을 남겨주시면 담당자가 순서대로 연락드립니다.
        </p>
        <p className="mt-2 text-xs text-cream/50">{notice}</p>
        <Link
          href="/contact"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:bg-nude"
        >
          상담 신청하기 <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
