import { createClient } from "@/utils/supabase/server";
import type { CompanySettings } from "@/lib/types";

const FALLBACK = {
  company_name: "리안디자인",
  representative_name: "임상혁",
  business_registration_number: "592-05-01726",
  address: "대전광역시 서구 도안중로305번안길 7-17, 1층",
  phone: "042-721-9714",
  email: "red7@hanmail.net",
  blog_url: "https://blog.naver.com/reandesign_",
  instagram_url: "https://www.instagram.com/rean.interior",
  youtube_url: "https://www.youtube.com/@rean.interior",
};

const SNS_LINKS: { key: keyof typeof FALLBACK; label: string }[] = [
  { key: "blog_url", label: "Blog" },
  { key: "instagram_url", label: "Instagram" },
  { key: "youtube_url", label: "Youtube" },
];

export default async function Footer() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single<CompanySettings>();

  const info = { ...FALLBACK, ...Object.fromEntries(
    Object.entries(settings ?? {}).filter(([, value]) => value != null)
  ) };

  return (
    <footer className="border-t border-nude/60 bg-cream px-6 py-10 text-xs text-charcoal/60 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif tracking-[0.2em] text-charcoal">{info.company_name}</p>
          <div className="flex gap-5">
            {SNS_LINKS.map((sns) => {
              const url = info[sns.key];
              if (!url) return null;
              return (
                <a
                  key={sns.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tracking-wide text-charcoal/70 hover:text-gold"
                >
                  {sns.label}
                </a>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-nude/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {info.company_name} · 대표 {info.representative_name} · 사업자등록번호{" "}
            {info.business_registration_number}
          </p>
          <p>
            {info.address} · {info.phone} · {info.email}
          </p>
        </div>
        <p>© {new Date().getFullYear()} {info.company_name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
