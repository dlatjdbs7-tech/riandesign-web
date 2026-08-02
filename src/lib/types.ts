export type UserRole = "owner" | "manager" | "employee";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  username: string | null;
  hire_date: string | null;
  department: string | null;
  role: UserRole;
  status: ApprovalStatus;
  team_id: string | null;
  created_at: string;
};

export type WorkSite = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_by: string | null;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  user_id: string;
  work_site_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  created_at: string;
};
