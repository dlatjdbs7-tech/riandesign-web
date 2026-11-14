import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Estimate, EstimateItem, EstimateLine } from "@/lib/estimate";
import EstimateEditor from "@/components/admin/estimate/EstimateEditor";

export default async function EstimateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: estimate }, { data: lines }, { data: items }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).maybeSingle<Estimate>(),
    supabase.from("estimate_lines").select("*").eq("estimate_id", id).order("sort_order").returns<EstimateLine[]>(),
    supabase.from("estimate_items").select("*").eq("is_active", true).order("sort_order").returns<EstimateItem[]>(),
  ]);
  if (!estimate) notFound();

  return <EstimateEditor estimate={estimate} lines={lines ?? []} items={items ?? []} />;
}
