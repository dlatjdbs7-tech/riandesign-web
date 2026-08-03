import { createClient } from "@/utils/supabase/server";
import type { Service } from "@/lib/types";

const FALLBACK_SERVICES = [
  {
    title: "주거공간 인테리어",
    description: "아파트, 주택, 빌라의 전체 리모델링부터 부분 시공까지 맞춤 설계합니다.",
  },
  {
    title: "상업공간 인테리어",
    description: "매장, 사무실, 카페 등 브랜드 아이덴티티를 살리는 공간을 설계합니다.",
  },
  {
    title: "디자인 컨설팅",
    description: "공간 기획 단계부터 소재·컬러 큐레이션까지 전문 컨설팅을 제공합니다.",
  },
  {
    title: "A/S 및 유지관리",
    description: "시공 이후에도 체계적인 사후관리로 오래 안심할 수 있는 공간을 만듭니다.",
  },
];

export default async function Services() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("services")
    .select("*")
    .order("display_order")
    .returns<Service[]>();

  const services = items && items.length > 0 ? items : FALLBACK_SERVICES;

  return (
    <section id="services" className="bg-beige/60 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-xs tracking-[0.4em] text-taupe">SERVICES</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
            제공 서비스
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <div
              key={"id" in service ? service.id : `${service.title}-${index}`}
              className="flex flex-col gap-3 rounded-sm border border-nude/60 bg-cream p-8"
            >
              <h3 className="font-serif text-lg font-semibold text-charcoal">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-charcoal/70">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
