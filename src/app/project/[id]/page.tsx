import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import type { PhotoComment, PublicProject, WorkOrderPhoto } from "@/lib/types";
import { submitPhotoComment } from "./actions";

export const metadata: Metadata = {
  title: "고객페이지",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<PublicProject["status"], string> = {
  pending: "준비중",
  in_progress: "시공 진행중",
  completed: "시공 완료",
  cancelled: "일정 협의중",
  on_hold: "일정 협의중",
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

  const commentsByPhoto = await Promise.all(
    photoList.map(async (photo) => {
      const { data } = await supabase.rpc("get_public_photo_comments", {
        photo_id: photo.id,
        is_manual: isManual,
      });
      return [photo.id, (data as PhotoComment[] | null) ?? []] as const;
    })
  );
  const commentsMap = new Map(commentsByPhoto);

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
              {photoList.map((photo) => {
                const comments = commentsMap.get(photo.id) ?? [];
                return (
                  <figure key={photo.id} className="overflow-hidden rounded-sm border border-nude/60 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image_url}
                      alt={photo.caption ?? project.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {photo.caption && (
                      <figcaption className="p-3 pb-0">
                        <p className="whitespace-pre-wrap text-xs text-charcoal/60">{photo.caption}</p>
                      </figcaption>
                    )}

                    <div className="p-3">
                      {comments.length > 0 && (
                        <ul className="space-y-2">
                          {comments.map((comment) => (
                            <li key={comment.id} className="rounded-sm bg-beige/40 p-2">
                              <p className="text-[11px] font-medium text-charcoal/70">
                                {comment.author_name || "고객"}
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap text-xs text-charcoal/60">
                                {comment.message}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}

                      <form
                        action={submitPhotoComment.bind(null, photo.id, isManual, id)}
                        className="mt-2 flex flex-col gap-1.5"
                      >
                        <input
                          type="text"
                          name="author_name"
                          placeholder="이름 (선택)"
                          className="rounded-sm border border-nude bg-transparent px-2 py-1 text-xs outline-none focus:border-orange-400"
                        />
                        <textarea
                          name="message"
                          placeholder="이 사진에 대해 궁금한 점을 남겨주세요"
                          rows={2}
                          required
                          className="resize-none rounded-sm border border-nude bg-transparent p-2 text-xs outline-none focus:border-orange-400"
                        />
                        <button
                          type="submit"
                          className="self-start rounded-full border border-charcoal/30 px-3 py-1 text-[11px] text-charcoal hover:border-charcoal"
                        >
                          문의 남기기
                        </button>
                      </form>
                    </div>
                  </figure>
                );
              })}
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
