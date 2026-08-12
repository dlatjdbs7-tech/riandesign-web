import ProjectFilterGrid from "@/components/ProjectFilterGrid";
import { createClient } from "@/utils/supabase/server";
import type { PortfolioItem } from "@/lib/types";

export default async function ProjectPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("display_order")
    .returns<PortfolioItem[]>();

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">PROJECT</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          Our work
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-charcoal/60">
          고객의 라이프스타일과 공간의 특성을 깊이 이해하여, 디자인부터 완성까지 정성을 담아
          완성한 프로젝트를 소개합니다.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <ProjectFilterGrid items={items ?? []} />
      </section>
    </div>
  );
}
