export default function ConstructionBanner() {
  return (
    <a
      href="https://www.reandesign.kr"
      className="block bg-gold px-6 py-6 text-center transition-colors hover:opacity-90 sm:py-8"
    >
      <p className="font-serif text-xl font-semibold text-charcoal sm:text-2xl">
        홈페이지 제작중 · 기존 홈페이지로 이동
      </p>
      <p className="mt-1 text-sm text-charcoal/70">
        클릭하시면 현재 운영 중인 홈페이지로 이동합니다 →
      </p>
    </a>
  );
}
