"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/lib/types";
import type { ConfigurableRole } from "@/lib/menu";

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

export async function updateMenuPermission(
  role: ConfigurableRole,
  menuKey: string,
  canView: boolean
) {
  const supabase = await createClient();
  await supabase
    .from("role_menu_permissions")
    .upsert({ role, menu_key: menuKey, can_view: canView }, { onConflict: "role,menu_key" });
  revalidatePath("/admin/team-permissions");
}
