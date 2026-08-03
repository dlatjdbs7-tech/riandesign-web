import PlaceholderBlock from "./PlaceholderBlock";
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
};

export default async function About() {
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
  const imageUrl = content?.about_image_url;

  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
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
          <p className="text-xs tracking-[0.4em] text-taupe">ABOUT US</p>
          <h2 className="font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
            {title}
          </h2>
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
  );
}
