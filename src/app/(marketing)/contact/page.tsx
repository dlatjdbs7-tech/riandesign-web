import Contact from "@/components/Contact";
import { createClient } from "@/utils/supabase/server";
import type { CompanySettings, SiteContent } from "@/lib/types";

const FAQ_ITEMS = [
  {
    question: "01. 초도상담 시 견적을 바로 알 수 있나요?",
    answer:
      "상담은 단순히 금액을 바로 안내드리는 시간이 아니라, 고객님의 생활 방식과 공사 범위를 함께 확인하는 과정입니다. 공간의 방향을 충분히 상담 후 견적을 안내해 드리고 있습니다.",
  },
  {
    question: "02. 공사는 얼마나 걸리나요?",
    answer:
      "공사 기간은 공간의 규모와 공사 범위에 따라 달라집니다. 전체 인테리어 기준으로 보통 4주 ~ 8주 소요, 대형평수인 경우 최대 12주까지 필요할 수 있습니다. 상담 후 상세 일정을 안내해 드립니다.",
  },
  {
    question: "03. 상담 후 꼭 계약해야 하나요?",
    answer:
      "아닙니다. 상담은 고객님의 공간에 어떤 변화가 필요한지 함께 확인하는 과정입니다. 상담 후 방향과 기준이 맞는다고 판단되실 때 진행을 결정하시면 됩니다.",
  },
  {
    question: "04. 디자인부터 시공까지 모두 진행하시나요?",
    answer:
      "네, 상담부터 디자인, 시공, 사후관리까지 전 과정을 책임지고 진행합니다. 모든 과정이 체계적으로 이어질 수 있도록 처음부터 끝까지 함께합니다.",
  },
];

const INTRO_PARAGRAPHS = [
  "좋은 공간은 충분한 대화에서 시작됩니다.",
  "보다 책임 있는 상담을 위해 작성해 주신 내용을 먼저 검토한 뒤, 진행가능 여부와 상담 일정을 안내드립니다.",
  "원활한 상담을 위해 가능한 꼼꼼히 작성 부탁드립니다.",
];

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
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10 sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">CONTACT</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-charcoal sm:text-6xl">
          Get in touch
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-display text-lg text-charcoal">Contact & FAQ</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-charcoal sm:text-4xl">
              {notice}
            </h2>

            <div className="mt-6 flex flex-col gap-2 text-sm leading-relaxed text-charcoal/70">
              {INTRO_PARAGRAPHS.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>

            <div className="mt-10 flex flex-col divide-y divide-nude/60 border-t border-b border-nude/60">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-charcoal">
                    {item.question}
                    <span
                      aria-hidden
                      className="shrink-0 text-lg text-gold transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/70">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <div>
            <Contact />
          </div>
        </div>
      </section>

      {settings?.address && (
        <p className="px-6 pb-16 text-center text-sm text-charcoal/60">{settings.address}</p>
      )}
    </div>
  );
}
