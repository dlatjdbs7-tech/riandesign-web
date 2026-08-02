type PlaceholderBlockProps = {
  label: string;
  className?: string;
};

export default function PlaceholderBlock({ label, className = "" }: PlaceholderBlockProps) {
  return (
    <div
      role="img"
      aria-label={`${label} 이미지 준비중`}
      className={`flex items-center justify-center bg-gradient-to-br from-beige via-nude/70 to-taupe/40 ${className}`}
    >
      <span className="font-serif text-xs tracking-[0.3em] text-charcoal/50">
        {label}
      </span>
    </div>
  );
}
