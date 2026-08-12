import Link from "next/link";
import PlaceholderBlock from "./PlaceholderBlock";
import { createClient } from "@/utils/supabase/server";
import type { PortfolioItem } from "@/lib/types";

const FALLBACK_PROJECTS = [
  { title: "프로젝트 01", category: "주거공간" },
  { title: "프로젝트 02", category: "상업공간" },
  { title: "프로젝트 03", category: "주거공간" },
  { title: "프로젝트 04", category: "상업공간" },
  { title: "프로젝트 05", category: "주거공간" },
  { title: "프로젝트 06", category: "상업공간" },
];

export default async function Portfolio() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("display_order")
    .limit(6)
    .returns<PortfolioItem[]>();

  const hasRealItems = !!items && items.length > 0;
  const projects = hasRealItems
    ? items!.map((item) => ({
        title: item.title,
        category: item.size_py ?? item.category ?? "",
        imageUrl: item.image_url,
      }))
    : FALLBACK_PROJECTS.map((project) => ({ ...project, imageUrl: null as string | null }));

  return (
    <section id="portfolio" className="mx-auto max-w-7xl px-6 py-24 sm:px-10">
      <div className="mb-14 text-center">
        <p className="text-xs tracking-[0.4em] text-taupe">PORTFOLIO</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
          시공 사례
        </h2>
        {!hasRealItems && (
          <p className="mx-auto mt-4 max-w-xl text-sm text-charcoal/60">
            실제 시공 사진은 준비 중입니다. 진행하신 프로젝트 사진을 전달해 주시면 이 자리에
            채워 넣겠습니다.
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <div key={`${project.title}-${index}`} className="group">
            {project.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.imageUrl}
                alt={project.title}
                className="aspect-[4/3] w-full rounded-sm object-cover"
              />
            ) : (
              <PlaceholderBlock label={project.title} className="aspect-[4/3] w-full rounded-sm" />
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal">{project.title}</span>
              <span className="text-xs tracking-wide text-taupe">{project.category}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link
          href="/project"
          className="inline-flex items-center gap-2 rounded-full border border-charcoal/30 px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:border-charcoal"
        >
          PROJECT 전체보기 <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
