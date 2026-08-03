import { createClient } from "@/utils/supabase/server";
import type { Profile, Service, SiteContent } from "@/lib/types";
import { createService, deleteService, updateSiteContent } from "./actions";

export default async function SiteManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();
  const canManage = me?.role === "owner" || me?.role === "manager";

  const [{ data: content }, { data: services }] = await Promise.all([
    supabase.from("site_content").select("*").eq("id", 1).single<SiteContent>(),
    supabase.from("services").select("*").order("display_order").returns<Service[]>(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-charcoal">사이트관리</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        여기서 수정한 문구와 서비스 항목이 홈페이지에 그대로 표시됩니다.
      </p>

      <form
        action={updateSiteContent}
        className="mt-6 flex flex-col gap-6 rounded-sm border border-nude/60 bg-white p-6"
      >
        <div>
          <h2 className="font-serif text-lg font-semibold text-charcoal">히어로 영역</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">상단 태그라인</label>
              <input
                name="hero_tagline"
                defaultValue={content?.hero_tagline ?? ""}
                disabled={!canManage}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">메인 헤드라인</label>
              <input
                name="hero_headline"
                defaultValue={content?.hero_headline ?? ""}
                disabled={!canManage}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">설명 문구</label>
              <textarea
                name="hero_description"
                rows={3}
                defaultValue={content?.hero_description ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-nude/60 pt-6">
          <h2 className="font-serif text-lg font-semibold text-charcoal">소개 영역</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">제목</label>
              <input
                name="about_title"
                defaultValue={content?.about_title ?? ""}
                disabled={!canManage}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">본문 1</label>
              <textarea
                name="about_paragraph_1"
                rows={3}
                defaultValue={content?.about_paragraph_1 ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">본문 2</label>
              <textarea
                name="about_paragraph_2"
                rows={3}
                defaultValue={content?.about_paragraph_2 ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">브랜드 네이밍 스토리 (About 페이지 하단)</label>
              <textarea
                name="about_naming_story"
                rows={2}
                defaultValue={content?.about_naming_story ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs tracking-wide text-charcoal/70">PROJECTS</label>
                <input
                  name="about_stat_projects"
                  defaultValue={content?.about_stat_projects ?? ""}
                  disabled={!canManage}
                  className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs tracking-wide text-charcoal/70">REGION</label>
                <input
                  name="about_stat_region"
                  defaultValue={content?.about_stat_region ?? ""}
                  disabled={!canManage}
                  className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs tracking-wide text-charcoal/70">FOCUS</label>
                <input
                  name="about_stat_focus"
                  defaultValue={content?.about_stat_focus ?? ""}
                  disabled={!canManage}
                  className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">소개 이미지 URL (선택)</label>
              <input
                name="about_image_url"
                defaultValue={content?.about_image_url ?? ""}
                disabled={!canManage}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-nude/60 pt-6">
          <h2 className="font-serif text-lg font-semibold text-charcoal">프로세스 / 상담 안내 문구</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">프로세스 페이지 소개 문구</label>
              <textarea
                name="process_intro"
                rows={2}
                defaultValue={content?.process_intro ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-wide text-charcoal/70">상담 안내 문구 (예약제 등)</label>
              <textarea
                name="contact_notice"
                rows={2}
                defaultValue={content?.contact_notice ?? ""}
                disabled={!canManage}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold disabled:text-charcoal/50"
              />
            </div>
          </div>
        </div>

        {canManage && (
          <button
            type="submit"
            className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
          >
            저장
          </button>
        )}
      </form>

      <div className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-charcoal">제공 서비스</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          여기서 등록한 항목이 홈페이지 서비스 섹션에 순서대로 표시됩니다.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="overflow-x-auto rounded-sm border border-nude/60 bg-white">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
                <tr>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">설명</th>
                  <th className="px-4 py-3">순서</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {services?.map((service) => (
                  <tr key={service.id} className="border-b border-nude/30 last:border-0">
                    <td className="px-4 py-3">{service.title}</td>
                    <td className="px-4 py-3 text-charcoal/70">{service.description ?? "-"}</td>
                    <td className="px-4 py-3 text-charcoal/70">{service.display_order}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <form action={deleteService.bind(null, service.id)}>
                          <button type="submit" className="text-xs text-red-700 underline hover:no-underline">
                            삭제
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {(!services || services.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-charcoal/50">
                      등록된 서비스가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canManage && (
            <form
              action={createService}
              className="flex h-fit flex-col gap-4 rounded-sm border border-nude/60 bg-white p-6"
            >
              <input
                name="title"
                placeholder="제목"
                required
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
              <textarea
                name="description"
                placeholder="설명"
                rows={3}
                className="resize-none border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
              <input
                name="display_order"
                type="number"
                placeholder="표시 순서"
                defaultValue={0}
                className="border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold"
              >
                서비스 등록
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
