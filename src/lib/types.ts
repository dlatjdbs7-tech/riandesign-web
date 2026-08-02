export type UserRole = "owner" | "manager" | "employee";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: ApprovalStatus;
  team_id: string | null;
  created_at: string;
};
