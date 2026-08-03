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

export type WorkOrderStatus = "pending" | "in_progress" | "completed";

export type WorkOrder = {
  id: string;
  title: string;
  client_name: string | null;
  site_address: string | null;
  customer_id: string | null;
  work_date: string | null;
  description: string | null;
  assignee_id: string | null;
  status: WorkOrderStatus;
  created_by: string | null;
  created_at: string;
};

export type WorkLog = {
  id: string;
  work_order_id: string | null;
  author_id: string;
  log_date: string;
  content: string;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  memo: string | null;
  created_at: string;
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";
export type Quote = {
  id: string;
  customer_id: string | null;
  title: string;
  amount: number | null;
  status: QuoteStatus;
  quote_date: string;
  memo: string | null;
  created_at: string;
};

export type TransactionStatus = "unpaid" | "partial" | "paid";
export type Transaction = {
  id: string;
  customer_id: string | null;
  title: string;
  amount: number;
  status: TransactionStatus;
  transaction_date: string;
  memo: string | null;
  created_at: string;
};

export type AsStatus = "received" | "in_progress" | "completed";
export type AsRequest = {
  id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  status: AsStatus;
  request_date: string;
  created_at: string;
};

export type Material = {
  id: string;
  name: string;
  spec: string | null;
  unit: string | null;
  unit_price: number | null;
  supplier: string | null;
  created_at: string;
};

export type QuickPhrase = {
  id: string;
  category: string | null;
  content: string;
  created_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  contact: string | null;
  category: string | null;
  memo: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  type: string | null;
  created_at: string;
};

export type InquiryStatus = "new" | "contacted" | "closed";
export type Inquiry = {
  id: string;
  name: string;
  phone: string;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
};

export type SiteContent = {
  id: number;
  hero_tagline: string | null;
  hero_headline: string | null;
  hero_description: string | null;
  about_title: string | null;
  about_paragraph_1: string | null;
  about_paragraph_2: string | null;
  about_stat_projects: string | null;
  about_stat_region: string | null;
  about_stat_focus: string | null;
  about_image_url: string | null;
  updated_at: string;
};

export type Service = {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
};

export type CompanySettings = {
  id: number;
  company_name: string | null;
  business_registration_number: string | null;
  representative_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  updated_at: string;
};
