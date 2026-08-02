export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">{title}</h1>
      <p className="mt-4 rounded-sm border border-dashed border-nude bg-white p-10 text-center text-sm text-charcoal/50">
        준비 중입니다. 다음 단계에서 개발 예정입니다.
      </p>
    </div>
  );
}
