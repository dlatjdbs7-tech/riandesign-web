import PlaceholderBlock from "@/components/PlaceholderBlock";
import { createClient } from "@/utils/supabase/server";
import type { SiteContent } from "@/lib/types";

const FALLBACK = {
  title: "철학이 있는 공간을 만듭니다",
  paragraph1:
    "리안디자인은 대전에서 시작해 하이엔드 인테리어 시장을 지향하는 디자인 스튜디오입니다. 유행을 따르기보다 공간을 사용하는 사람의 라이프스타일과 취향을 깊이 이해하는 것에서 디자인을 시작합니다.",
  paragraph2:
    "소재 선정부터 시공, 사후관리까지 전 과정을 체계적으로 관리하여 고객이 신뢰할 수 있는 결과물을 약속합니다.",
  statProjects: "진행중",
  statRegion: "대전",
  statFocus: "하이엔드",
  namingStory:
    "리안(RE-AN)은 공간을 다시 분석하고(RE-analyze) 새롭게 디자인한다(RE-design)는 의미를 담고 있습니다.",
};

const VALUES = [
  {
    title: "고객의 일상을 먼저 생각합니다",
    description:
      "공간을 디자인하기 전에 고객의 생활 방식과 불편함을 먼저 이해합니다. 일상에 가장 잘 맞는 공간을 만들기 위해 충분히 고민합니다.",
  },
  {
    title: "모든 과정을 직접 책임집니다",
    description: "상담부터 시공, 사후관리까지 대표가 직접 챙기며 전 과정을 체계적으로 관리합니다.",
  },
  {
    title: "오래도록 만족하는 공간을 만듭니다",
    description: "유행을 따르기보다, 시간이 지나도 편안하고 품격 있는 공간을 완성합니다.",
  },
];

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: content } = await supabase
    .from("site_content")
    .select("*")
    .eq("id", 1)
    .single<SiteContent>();

  const title = content?.about_title || FALLBACK.title;
  const paragraph1 = content?.about_paragraph_1 || FALLBACK.paragraph1;
  const paragraph2 = content?.about_paragraph_2 || FALLBACK.paragraph2;
  const statProjects = content?.about_stat_projects || FALLBACK.statProjects;
  const statRegion = content?.about_stat_region || FALLBACK.statRegion;
  const statFocus = content?.about_stat_focus || FALLBACK.statFocus;
  const namingStory = content?.about_naming_story || FALLBACK.namingStory;
  const imageUrl = content?.about_image_url;

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
        <p className="text-xs tracking-[0.4em] text-taupe">ABOUT</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-charcoal sm:text-5xl">
          {title}
        </h1>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <div className="grid gap-12 sm:grid-cols-2 sm:items-center sm:gap-16">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="REAN DESIGN"
              className="aspect-[4/5] w-full rounded-sm object-cover"
            />
          ) : (
            <PlaceholderBlock label="REAN DESIGN" className="aspect-[4/5] w-full rounded-sm" />
          )}

          <div className="flex flex-col gap-6">
            <p className="leading-relaxed text-charcoal/70">{paragraph1}</p>
            <p className="leading-relaxed text-charcoal/70">{paragraph2}</p>
            <dl className="mt-4 grid grid-cols-3 gap-6 border-t border-nude/60 pt-6">
              <div>
                <dt className="text-xs tracking-widest text-taupe">PROJECTS</dt>
                <dd className="mt-1 font-serif text-2xl text-charcoal">{statProjects}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-widest text-taupe">REGION</dt>
                <dd className="mt-1 font-serif text-2xl text-charcoal">{statRegion}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-widest text-taupe">FOCUS</dt>
                <dd className="mt-1 font-serif text-2xl text-charcoal">{statFocus}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-beige/60 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-xs tracking-[0.4em] text-taupe">PHILOSOPHY</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
              리안디자인이 일하는 방식
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.title} className="flex flex-col gap-3 rounded-sm border border-nude/60 bg-cream p-8">
                <h3 className="font-serif text-lg font-semibold text-charcoal">{value.title}</h3>
                <p className="text-sm leading-relaxed text-charcoal/70">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:px-10">
        <p className="font-serif text-xl leading-relaxed text-charcoal sm:text-2xl">
          {namingStory}
        </p>
      </section>
    </div>
  );
}
