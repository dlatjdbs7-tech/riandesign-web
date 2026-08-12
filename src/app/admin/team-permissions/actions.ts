"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/lib/types";

export async function createTeam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("teams").insert({ name });
  revalidatePath("/admin/team-permissions");
}

export async function updateEmployeeRole(id: string, role: UserRole) {
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/team-permissions");
}

export async function updateEmployeeTeam(id: string, teamId: string) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ team_id: teamId || null })
    .eq("id", id);
  revalidatePath("/admin/team-permissions");
}

export async function updateJobRankMenuPermission(
  jobRank: string,
  menuKey: string,
  canView: boolean
) {
  const supabase = await createClient();
  await supabase
    .from("job_rank_menu_permissions")
    .upsert(
      { job_rank: jobRank, menu_key: menuKey, can_view: canView },
      { onConflict: "job_rank,menu_key" }
    );
  revalidatePath("/admin/team-permissions");
}

export async function updateAllJobRankMenuPermissions(
  jobRank: string,
  menuKeys: string[],
  canView: boolean
) {
  const supabase = await createClient();
  await supabase
    .from("job_rank_menu_permissions")
    .upsert(
      menuKeys.map((menuKey) => ({ job_rank: jobRank, menu_key: menuKey, can_view: canView })),
      { onConflict: "job_rank,menu_key" }
    );
  revalidatePath("/admin/team-permissions");
}

export async function updateAllMenuPermissions(
  jobRanks: string[],
  menuKeys: string[],
  canView: boolean
) {
  const supabase = await createClient();
  const rows = jobRanks.flatMap((jobRank) =>
    menuKeys.map((menuKey) => ({ job_rank: jobRank, menu_key: menuKey, can_view: canView }))
  );
  await supabase
    .from("job_rank_menu_permissions")
    .upsert(rows, { onConflict: "job_rank,menu_key" });
  revalidatePath("/admin/team-permissions");
}
