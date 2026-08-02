export default function Footer() {
  return (
    <footer className="border-t border-nude/60 bg-cream px-6 py-10 text-xs text-charcoal/60 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-serif tracking-[0.2em] text-charcoal">REAN DESIGN</p>
        <div className="flex flex-col gap-1 sm:text-right">
          <p>리안디자인 · 대표 임상혁 · 사업자등록번호 592-05-01726</p>
          <p>대전광역시 서구 도안중로305번안길 7-17, 101호 · 042-721-9714 · red7@hanmail.net</p>
          <p>© {new Date().getFullYear()} 리안디자인. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
