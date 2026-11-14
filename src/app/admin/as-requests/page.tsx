import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { AsRequest, Customer, Profile } from "@/lib/types";
import { createAsRequest, deleteAsRequest, updateAsRequest } from "./actions";
import AsStatusSelect from "@/components/admin/AsStatusSelect";
import AsUrgentCheckbox from "@/components/admin/AsUrgentCheckbox";
import AsContactFields, { type AsContactOption } from "@/components/admin/AsContactFields";
import { formatPhoneNumber } from "@/lib/format";
import DeleteButton from "@/components/admin/DeleteButton";

type AsRequestRow = AsRequest & { customers: Pick<Customer, "name"> | null };

const FIELD_CLASS =
  "border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold";

// 등록 / 수정에 같이 쓰는 입력 칸. 수정일 때는 기존 값이 미리 채워진다.
function AsRequestFields({
  contactOptions,
  initial,
}: {
  contactOptions: AsContactOption[];
  initial?: AsRequestRow;
}) {
  return (
    <>
      <input
        name="title"
        placeholder="제목 (예: 싱크대 누수)"
        required
        defaultValue={initial?.title}
        className={FIELD_CLASS}
      />
      <AsContactFields
        options={contactOptions}
        fieldClass={FIELD_CLASS}
        initial={
          initial && {
            customerId: initial.customer_id,
            name: initial.caller_name ?? initial.customers?.name ?? "",
            phone: initial.phone ?? "",
            address: initial.address ?? "",
          }
        }
      />
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-charcoal/50">접수일</label>
        <input
          name="request_date"
          type="date"
          defaultValue={initial?.request_date ?? new Date().toISOString().slice(0, 10)}
          className="border-b border-nude bg-transparent py-1 text-sm outline-none focus:border-gold"
        />
      </div>
      <textarea
        name="description"
        placeholder={"내용 - 어떤 문제인지 / 언제부터인지 / 발생 위치 / 요청 사항 / 기타"}
        rows={initial ? 4 : 2}
        defaultValue={initial?.description ?? ""}
        className="resize-y border-b border-nude bg-transparent py-2 text-sm outline-none focus:border-gold lg:col-span-3"
      />
    </>
  );
}

export default async function AsRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string }>;
}) {
  const params = await searchParams;
  const showCreateForm = params.new === "1";

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

  const { data: fetchedRequests } = await supabase
    .from("as_requests")
    .select("*, customers(name)")
    .order("request_date", { ascending: false })
    .returns<AsRequestRow[]>();

  // 아직 끝나지 않은 긴급건을 맨 위로 (나머지는 접수일 최신순 그대로)
  const isOpenUrgent = (r: AsRequestRow) => r.is_urgent && r.status !== "completed";
  const requests = fetchedRequests
    ? [...fetchedRequests].sort((a, b) => Number(isOpenUrgent(b)) - Number(isOpenUrgent(a)))
    : null;

  // 고객 불러오기 목록: 고객·우수회원 명단 + 현장관리 + 상담접수 (고객 정보가 실제로 들어 있는 곳)
  const contactOptions: AsContactOption[] = [];
  if (canManage) {
    const [{ data: customers }, { data: sites }, { data: inquiries }] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, address")
        .order("name")
        .returns<Pick<Customer, "id" | "name" | "phone" | "address">[]>(),
      supabase
        .from("work_orders")
        .select("id, title, client_name, site_address")
        .order("created_at", { ascending: false })
        .returns<{ id: string; title: string; client_name: string | null; site_address: string | null }[]>(),
      supabase
        .from("inquiries")
        .select("id, name, phone, address")
        .order("created_at", { ascending: false })
        .returns<{ id: string; name: string | null; phone: string | null; address: string | null }[]>(),
    ]);
    for (const c of customers ?? []) {
      contactOptions.push({
        value: `c:${c.id}`,
        group: "고객",
        label: [c.name, c.phone && formatPhoneNumber(c.phone)].filter(Boolean).join(" · "),
        name: c.name,
        phone: c.phone ?? "",
        address: c.address ?? "",
      });
    }
    for (const w of sites ?? []) {
      contactOptions.push({
        value: `w:${w.id}`,
        group: "현장",
        label: [w.title, w.client_name].filter(Boolean).join(" · "),
        name: w.client_name ?? w.title,
        phone: "",
        address: w.site_address ?? "",
      });
    }
    for (const i of inquiries ?? []) {
      // 이름도 연락처도 없는(이름 "미정"만 있는) 상담은 불러와도 쓸모가 없어 뺀다.
      const hasName = !!i.name && i.name.trim() !== "미정";
      if (!hasName && !i.phone) continue;
      contactOptions.push({
        value: `i:${i.id}`,
        group: "상담접수",
        label: [i.name, i.phone && formatPhoneNumber(i.phone), i.address].filter(Boolean).join(" · "),
        name: i.name ?? "",
        phone: i.phone ?? "",
        address: i.address ?? "",
      });
    }
  }

  const editing = canManage && params.edit ? requests?.find((r) => r.id === params.edit) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-charcoal">AS관리</h1>
        {canManage && (
          <Link
            href={showCreateForm ? "/admin/as-requests" : "/admin/as-requests?new=1"}
            className="rounded-full bg-charcoal px-4 py-2 text-xs font-medium text-cream hover:bg-charcoal/80"
          >
            + AS 접수
          </Link>
        )}
      </div>

      {showCreateForm && canManage && !editing && (
        <form
          action={createAsRequest}
          className="mt-6 grid gap-3 rounded-sm border border-nude/60 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <p className="text-xs text-charcoal/50 lg:col-span-4">
            전화로 AS 접수가 오면 여기에 바로 적어두세요.
          </p>
          <AsRequestFields contactOptions={contactOptions} />
          <button
            type="submit"
            className="self-start rounded-full bg-charcoal px-6 py-2 text-sm tracking-wide text-cream hover:bg-gold lg:col-span-4"
          >
            AS 요청 등록
          </button>
        </form>
      )}

      {editing && (
        <form
          key={editing.id}
          action={updateAsRequest.bind(null, editing.id)}
          className="mt-6 grid gap-3 rounded-sm border-2 border-orange-300 bg-orange-50/40 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <p className="text-sm font-semibold text-charcoal lg:col-span-4">
            AS 요청 수정 <span className="font-normal text-charcoal/50">— {editing.title}</span>
          </p>
          <AsRequestFields contactOptions={contactOptions} initial={editing} />
          <div className="flex items-center gap-3 lg:col-span-4">
            <button
              type="submit"
              className="rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              수정 저장
            </button>
            <Link
              href="/admin/as-requests"
              className="rounded-full border border-nude px-6 py-2 text-sm text-charcoal/70 hover:bg-stone-100"
            >
              취소
            </Link>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-sm border border-nude/60 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-nude/60 text-xs tracking-wide text-charcoal/60">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">고객</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">날짜</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">긴급</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {requests?.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-nude/30 last:border-0 align-top ${
                  editing?.id === r.id ? "bg-orange-50" : isOpenUrgent(r) ? "bg-red-50" : ""
                }`}
              >
                <td className={`px-4 py-3 ${r.is_urgent ? "border-l-4 border-l-red-500" : ""}`}>
                  <p className={r.is_urgent ? "font-semibold text-red-800" : ""}>{r.title}</p>
                  {r.description && (
                    <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-charcoal/50">
                      {r.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-charcoal/70">
                  <p>{r.customers?.name ?? r.caller_name ?? "-"}</p>
                  {r.address && <p className="mt-1 text-xs text-charcoal/50">{r.address}</p>}
                </td>
                <td className="px-4 py-3 text-charcoal/70">{r.phone ?? "-"}</td>
                <td className="px-4 py-3 text-charcoal/70">{r.request_date}</td>
                <td className="px-4 py-3">
                  {canManage ? <AsStatusSelect id={r.id} status={r.status} /> : r.status}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <AsUrgentCheckbox key={`${r.id}-${r.is_urgent}`} id={r.id} isUrgent={r.is_urgent} />
                  ) : r.is_urgent ? (
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">긴급</span>
                  ) : (
                    <span className="text-charcoal/30">-</span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <Link
                        href={`/admin/as-requests?edit=${r.id}`}
                        className="rounded-full border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                      >
                        수정
                      </Link>
                      <DeleteButton action={deleteAsRequest.bind(null, r.id)} className="text-xs text-red-700 underline hover:no-underline">삭제</DeleteButton>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!requests || requests.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-charcoal/50">
                  등록된 AS 요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
