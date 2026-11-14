import { createClient } from "@/utils/supabase/server";
import type { Estimate, EstimateLine } from "@/lib/estimate";
import { buildEstimateWorkbook, type ExcelCompany } from "@/lib/estimateExcel";

// 견적서 엑셀 내려받기 (리안 엑셀 양식: 표지·갑지·공사원가계산서·집계표·내역서, 수식 포함)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("로그인이 필요합니다.", { status: 401 });

  const [{ data: estimate }, { data: lines }, { data: company }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).maybeSingle<Estimate>(),
    supabase.from("estimate_lines").select("*").eq("estimate_id", id).order("sort_order").returns<EstimateLine[]>(),
    supabase.from("company_settings").select("*").order("id").limit(1).maybeSingle<NonNullable<ExcelCompany>>(),
  ]);
  if (!estimate) return new Response("견적서를 찾을 수 없습니다.", { status: 404 });

  // 로고 그림 (사이트의 public 폴더에서)
  const load = async (path: string) => {
    try {
      const res = await fetch(new URL(path, request.url));
      return res.ok ? await res.arrayBuffer() : undefined;
    } catch {
      return undefined;
    }
  };
  const [rean, design, studio] = await Promise.all([load("/logo.png"), load("/estimate-assets/cover-design.png"), load("/estimate-assets/studio.png")]);

  const wb = await buildEstimateWorkbook(estimate, lines ?? [], company ?? null, { rean, design, studio });
  const buf = await wb.xlsx.writeBuffer();

  const safe = estimate.title.replace(/[\\/:*?"<>|]/g, " ").trim() || "견적서";
  const filename = `견적서_${safe}_${estimate.quote_date}.xlsx`;
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="estimate.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
