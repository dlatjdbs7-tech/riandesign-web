import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { PublicProject, WorkOrderPhoto } from "@/lib/types";

export const metadata: Metadata = {
  title: "고객페이지",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<PublicProject["status"], string> = {
  pending: "준비중",
  in_progress: "시공 진행중",
  completed: "시공 완료",
};

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: projectRows } = await supabase.rpc("get_public_project", { project_id: id });
  let project = (projectRows as PublicProject[] | null)?.[0];
  let isManual = false;

  if (!project) {
    const { data: manualRows } = await supabase.rpc("get_public_manual_project", { project_id: id });
    project = (manualRows as PublicProject[] | null)?.[0];
    isManual = true;
  }

  if (!project) notFound();

  const { data: photos } = await supabase.rpc(
    isManual ? "get_public_manual_project_photos" : "get_public_project_photos",
    { project_id: id }
  );
  const photoList = (photos as WorkOrderPhoto[] | null) ?? [];

  return (
    <main className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs tracking-[0.4em] text-taupe">REAN DESIGN</p>
        <h1 className="mt-3 text-center font-serif text-2xl font-semibold text-charcoal sm:text-3xl">
          {project.title}
        </h1>
        <p className="mt-2 text-center text-sm text-charcoal/60">
          {project.customer_name}님 · {project.work_date ?? "일정 협의중"}
        </p>

        <div className="mt-4 flex justify-center">
          <span
            className={`rounded-full px-4 py-1.5 text-xs tracking-wide ${
              project.status === "completed"
                ? "bg-emerald-700 text-cream"
                : project.status === "in_progress"
                  ? "bg-gold text-charcoal"
                  : "bg-nude text-charcoal"
            }`}
          >
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        <div className="mt-10">
          <h2 className="font-serif text-lg font-semibold text-charcoal">현장 사진</h2>
          {photoList.length === 0 ? (
            <p className="mt-4 rounded-sm border border-dashed border-nude bg-white p-10 text-center text-sm text-charcoal/50">
              아직 등록된 사진이 없습니다. 시공이 진행되면 이 자리에 사진이 올라옵니다.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {photoList.map((photo) => (
                <figure key={photo.id} className="overflow-hidden rounded-sm border border-nude/60 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.image_url} alt={photo.caption ?? project.title} className="aspect-[4/3] w-full object-cover" />
                  {photo.caption && (
                    <figcaption className="p-3 text-xs text-charcoal/60">{photo.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-charcoal/40">
          이 페이지는 리안디자인에서 공유해드린 전용 링크입니다.
        </p>
      </div>
    </main>
  );
}
