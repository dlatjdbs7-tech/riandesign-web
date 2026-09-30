import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Customer, CustomerProject, CustomerProjectPhoto, WorkOrder, WorkOrderPhoto } from "@/lib/types";
import { createManualProject } from "./actions";
import CustomerPageGrid, { type ProjectCard } from "@/components/admin/CustomerPageGrid";

type WorkOrderRow = WorkOrder & { customers: Pick<Customer, "name" | "phone"> | null };

export default async function CustomerPagesPage() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "reandesign.co.kr";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const [{ data: orders }, { data: photos }, { data: manualProjects }, { data: manualPhotos }] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("*, customers(name, phone)")
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
      customerPhone: order.customers?.phone ?? null,
      siteAddress: order.site_address,
      isManual: false,
      photos: photosByOrder.get(order.id) ?? [],
      createdAt: order.created_at,
    })),
    ...(manualProjects ?? []).map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      customerLabel: project.customer_name ?? "고객 미지정",
      customerPhone: null,
      siteAddress: null,
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

      <CustomerPageGrid cards={cards} origin={origin} />
    </div>
  );
}
