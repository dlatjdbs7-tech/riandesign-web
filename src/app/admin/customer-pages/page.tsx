import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Customer, CustomerProject, CustomerProjectPhoto, WorkOrder, WorkOrderPhoto } from "@/lib/types";
import {
  addManualProjectPhoto,
  addProjectPhoto,
  createManualProject,
  deleteManualProject,
  deleteManualProjectPhoto,
  deleteProjectPhoto,
} from "./actions";
import CopyLinkButton from "@/components/admin/CopyLinkButton";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
};

type WorkOrderRow = WorkOrder & { customers: Pick<Customer, "name"> | null };

type ProjectCard = {
  id: string;
  title: string;
  status: WorkOrder["status"];
  customerLabel: string;
  isManual: boolean;
  photos: { id: string; image_url: string; caption: string | null }[];
  createdAt: string;
};

export default async function CustomerPagesPage() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "reandesign.co.kr";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const [{ data: orders }, { data: photos }, { data: manualProjects }, { data: manualPhotos }] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false })
        .returns<WorkOrderRow[]>(),
      supabase
        .from("work_order_photos")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<WorkOrderPhoto[]>(),
      supabase
        .from("customer_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<CustomerProject[]>(),
      supabase
        .from("customer_project_photos")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<CustomerProjectPhoto[]>(),
    ]);

  const photosByOrder = new Map<string, WorkOrderPhoto[]>();
  for (const photo of photos ?? []) {
    const list = photosByOrder.get(photo.work_order_id) ?? [];
    list.push(photo);
    photosByOrder.set(photo.work_order_id, list);
  }

  const photosByManualProject = new Map<string, CustomerProjectPhoto[]>();
  for (const photo of manualPhotos ?? []) {
    const list = photosByManualProject.get(photo.customer_project_id) ?? [];
    list.push(photo);
    photosByManualProject.set(photo.customer_project_id, list);
  }

  const cards: ProjectCard[] = [
    ...(orders ?? []).map((order) => ({
      id: order.id,
      title: order.title,
      status: order.status,
      customerLabel: order.customers?.name ?? order.client_name ?? "고객 미지정",
      isManual: false,
      photos: photosByOrder.get(order.id) ?? [],
      createdAt: order.created_at,
    })),
    ...(manualProjects ?? []).map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      customerLabel: project.customer_name ?? "고객 미지정",
      isManual: true,
      photos: photosByManualProject.get(project.id) ?? [],
      createdAt: project.created_at,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">고객페이지</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        고객이 실시간으로 보는 현장 페이지입니다. 링크를 공유하고, 현장 사진을 바로 등록할 수 있습니다.
      </p>

      <div className="mt-6 rounded-sm border border-nude/60 bg-white p-5">
        <h2 className="font-serif text-sm font-semibold text-charcoal">새 프로젝트 페이지 만들기</h2>
        <p className="mt-1 text-xs text-charcoal/50">
          작업지시서를 만들지 않고, 고객페이지만 바로 만들고 싶을 때 사용하세요.
        </p>
        <form action={createManualProject} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">프로젝트명</label>
            <input
              name="title"
              required
              placeholder="예: 둔산동 32평 리모델링"
              className="w-48 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">고객명 (선택)</label>
            <input
              name="customer_name"
              placeholder="고객명"
              className="w-32 border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-charcoal/50">시공일 (선택)</label>
            <input
              type="date"
              name="work_date"
              className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-sm bg-orange-300 px-4 py-1.5 text-xs font-medium text-orange-900 hover:bg-orange-400"
          >
            페이지 만들기
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {cards.map((card) => {
          const publicUrl = `${origin}/project/${card.id}`;

          return (
            <div key={card.id} className="rounded-sm border border-nude/60 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        card.status === "completed"
                          ? "text-emerald-700"
                          : card.status === "in_progress"
                            ? "text-orange-600"
                            : "text-charcoal/60"
                      }`}
                    >
                      {STATUS_LABEL[card.status]}
                    </span>
                    {card.isManual && (
                      <span className="rounded-sm bg-stone-100 px-1.5 py-0.5 text-[10px] text-charcoal/50">
                        직접등록
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-lg font-semibold text-charcoal">{card.title}</h2>
                  <p className="text-sm text-charcoal/60">{card.customerLabel}</p>
                </div>
                {card.isManual && (
                  <form action={deleteManualProject.bind(null, card.id)}>
                    <button type="submit" className="text-xs text-charcoal/40 hover:text-red-600">
                      삭제
                    </button>
                  </form>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-charcoal px-4 py-1.5 text-xs text-cream hover:bg-orange-400"
                >
                  고객페이지 열기 ↗
                </a>
                <CopyLinkButton url={publicUrl} />
              </div>

              <div className="mt-4">
                <p className="text-xs text-charcoal/50">현장 사진 · {card.photos.length}</p>
                {card.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {card.photos.map((photo) => (
                      <div key={photo.id} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.image_url}
                          alt={photo.caption ?? ""}
                          className="h-16 w-16 rounded-sm border border-nude/60 object-cover"
                        />
                        <form
                          action={(card.isManual ? deleteManualProjectPhoto : deleteProjectPhoto).bind(
                            null,
                            photo.id
                          )}
                        >
                          <button
                            type="submit"
                            className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-charcoal text-[10px] text-cream"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  action={(card.isManual ? addManualProjectPhoto : addProjectPhoto).bind(null, card.id)}
                  className="mt-3 flex flex-col gap-2"
                >
                  <input
                    name="image_url"
                    placeholder="사진 이미지 URL"
                    required
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-orange-400"
                  />
                  <input
                    name="caption"
                    placeholder="설명 (선택)"
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-orange-400"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-full border border-charcoal/30 px-4 py-1 text-xs text-charcoal hover:border-charcoal"
                  >
                    + 사진 등록
                  </button>
                </form>
              </div>
            </div>
          );
        })}

        {cards.length === 0 && (
          <p className="text-sm text-charcoal/50">
            등록된 프로젝트가 없습니다. 작업지시서를 등록하거나, 위에서 새 프로젝트 페이지를 바로 만들어보세요.
          </p>
        )}
      </div>
    </div>
  );
}
