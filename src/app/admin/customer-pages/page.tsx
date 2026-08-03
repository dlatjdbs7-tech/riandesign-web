import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Customer, WorkOrder, WorkOrderPhoto } from "@/lib/types";
import { addProjectPhoto, deleteProjectPhoto } from "./actions";
import CopyLinkButton from "@/components/admin/CopyLinkButton";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
};

type WorkOrderRow = WorkOrder & { customers: Pick<Customer, "name"> | null };

export default async function CustomerPagesPage() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "reandesign.co.kr";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const { data: orders } = await supabase
    .from("work_orders")
    .select("*, customers(name)")
    .order("created_at", { ascending: false })
    .returns<WorkOrderRow[]>();

  const { data: photos } = await supabase
    .from("work_order_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<WorkOrderPhoto[]>();

  const photosByOrder = new Map<string, WorkOrderPhoto[]>();
  for (const photo of photos ?? []) {
    const list = photosByOrder.get(photo.work_order_id) ?? [];
    list.push(photo);
    photosByOrder.set(photo.work_order_id, list);
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-charcoal">고객페이지</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        고객이 실시간으로 보는 현장 페이지입니다. 링크를 공유하고, 현장 사진을 바로 등록할 수 있습니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {orders?.map((order) => {
          const orderPhotos = photosByOrder.get(order.id) ?? [];
          const publicUrl = `${origin}/project/${order.id}`;

          return (
            <div key={order.id} className="rounded-sm border border-nude/60 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`text-xs ${
                      order.status === "completed"
                        ? "text-emerald-700"
                        : order.status === "in_progress"
                          ? "text-gold"
                          : "text-charcoal/60"
                    }`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-charcoal">{order.title}</h2>
                  <p className="text-sm text-charcoal/60">
                    {order.customers?.name ?? order.client_name ?? "고객 미지정"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-charcoal px-4 py-1.5 text-xs text-cream hover:bg-gold"
                >
                  고객페이지 열기 ↗
                </a>
                <CopyLinkButton url={publicUrl} />
              </div>

              <div className="mt-4">
                <p className="text-xs text-charcoal/50">현장 사진 · {orderPhotos.length}</p>
                {orderPhotos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {orderPhotos.map((photo) => (
                      <div key={photo.id} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.image_url}
                          alt={photo.caption ?? ""}
                          className="h-16 w-16 rounded-sm border border-nude/60 object-cover"
                        />
                        <form action={deleteProjectPhoto.bind(null, photo.id)}>
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
                  action={addProjectPhoto.bind(null, order.id)}
                  className="mt-3 flex flex-col gap-2"
                >
                  <input
                    name="image_url"
                    placeholder="사진 이미지 URL"
                    required
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-gold"
                  />
                  <input
                    name="caption"
                    placeholder="설명 (선택)"
                    className="border-b border-nude bg-transparent py-1.5 text-xs outline-none focus:border-gold"
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

        {(!orders || orders.length === 0) && (
          <p className="text-sm text-charcoal/50">
            등록된 작업지시서가 없습니다. 먼저 작업지시서를 등록하면 여기서 고객페이지를 관리할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
