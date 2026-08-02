export default function Hero() {
  return (
    <section
      id="top"
      className="flex min-h-[85vh] flex-col items-center justify-center gap-8 bg-gradient-to-b from-beige to-cream px-6 text-center"
    >
      <p className="text-xs tracking-[0.4em] text-taupe">DAEJEON HIGH-END INTERIOR</p>
      <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl md:text-6xl">
        공간에 격을 더하다
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-charcoal/70 sm:text-lg">
        리안디자인은 대전을 기반으로 주거와 상업 공간에 하이엔드 디자인 철학을 담습니다.
        절제된 소재와 섬세한 디테일로 오래도록 품격 있는 공간을 완성합니다.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="#contact"
          className="rounded-full bg-charcoal px-8 py-3 text-sm tracking-wide text-cream transition-colors hover:bg-gold"
        >
          상담 신청하기
        </a>
        <a
          href="#portfolio"
          className="rounded-full border border-charcoal/30 px-8 py-3 text-sm tracking-wide text-charcoal transition-colors hover:border-charcoal"
        >
          포트폴리오 보기
        </a>
      </div>
    </section>
  );
}
