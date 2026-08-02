import PlaceholderBlock from "./PlaceholderBlock";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="grid gap-12 sm:grid-cols-2 sm:items-center sm:gap-16">
        <PlaceholderBlock label="RIAN DESIGN" className="aspect-[4/5] w-full rounded-sm" />

        <div className="flex flex-col gap-6">
          <p className="text-xs tracking-[0.4em] text-taupe">ABOUT US</p>
          <h2 className="font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
            철학이 있는 공간을 만듭니다
          </h2>
          <p className="leading-relaxed text-charcoal/70">
            리안디자인은 대전에서 시작해 하이엔드 인테리어 시장을 지향하는 디자인 스튜디오입니다.
            유행을 따르기보다 공간을 사용하는 사람의 라이프스타일과 취향을 깊이 이해하는 것에서
            디자인을 시작합니다.
          </p>
          <p className="leading-relaxed text-charcoal/70">
            소재 선정부터 시공, 사후관리까지 전 과정을 체계적으로 관리하여 고객이 신뢰할 수 있는
            결과물을 약속합니다.
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-6 border-t border-nude/60 pt-6">
            <div>
              <dt className="text-xs tracking-widest text-taupe">PROJECTS</dt>
              <dd className="mt-1 font-serif text-2xl text-charcoal">진행중</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-taupe">REGION</dt>
              <dd className="mt-1 font-serif text-2xl text-charcoal">대전</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-taupe">FOCUS</dt>
              <dd className="mt-1 font-serif text-2xl text-charcoal">하이엔드</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
