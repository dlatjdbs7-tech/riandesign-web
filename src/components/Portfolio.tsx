import PlaceholderBlock from "./PlaceholderBlock";

const PROJECTS = [
  { title: "프로젝트 01", category: "주거공간" },
  { title: "프로젝트 02", category: "상업공간" },
  { title: "프로젝트 03", category: "주거공간" },
  { title: "프로젝트 04", category: "상업공간" },
  { title: "프로젝트 05", category: "주거공간" },
  { title: "프로젝트 06", category: "상업공간" },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
      <div className="mb-14 text-center">
        <p className="text-xs tracking-[0.4em] text-taupe">PORTFOLIO</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
          시공 사례
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-charcoal/60">
          실제 시공 사진은 준비 중입니다. 진행하신 프로젝트 사진을 전달해 주시면 이 자리에
          채워 넣겠습니다.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => (
          <div key={project.title} className="group">
            <PlaceholderBlock
              label={project.title}
              className="aspect-[4/3] w-full rounded-sm"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal">{project.title}</span>
              <span className="text-xs tracking-wide text-taupe">{project.category}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
