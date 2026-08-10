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
export type SiteStatus = WorkOrderStatus | "cancelled" | "on_hold";

export type WorkOrder = {
  id: string;
  title: string;
  client_name: string | null;
  site_address: string | null;
  customer_id: string | null;
  work_date: string | null;
  work_end_date: string | null;
  description: string | null;
  assignee_id: string | null;
  status: SiteStatus;
  progress_percent: number;
  contract_amount: number | null;
  paid_amount: number;
  payment_contract: number | null;
  payment_start: number | null;
  payment_interim1: number | null;
  payment_interim2: number | null;
  payment_balance: number | null;
  payment_contract_date: string | null;
  payment_start_date: string | null;
  payment_interim1_date: string | null;
  payment_interim2_date: string | null;
  payment_balance_date: string | null;
  material_order_date: string | null;
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
  is_vip: boolean;
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
  attachment_url: string | null;
  attachment_name: string | null;
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
  size_py: string | null;
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
  about_naming_story: string | null;
  process_intro: string | null;
  contact_notice: string | null;
  updated_at: string;
};

export type Service = {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
};

export type ProcessStep = {
  id: string;
  step_number: number;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
};

export type Review = {
  id: string;
  author_name: string;
  project_label: string | null;
  rating: number;
  content: string;
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
  blog_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  updated_at: string;
};

export type WorkOrderTask = {
  id: string;
  work_order_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  status: WorkOrderStatus;
  auto_status: boolean;
  created_by: string | null;
  created_at: string;
};

export type WorkOrderPhoto = {
  id: string;
  work_order_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  event_date: string;
  memo: string | null;
  created_by: string | null;
  created_at: string;
};

export type CustomerProject = {
  id: string;
  title: string;
  customer_name: string | null;
  status: WorkOrderStatus;
  work_date: string | null;
  created_by: string | null;
  created_at: string;
};

export type PurchaseOrderStatus = "ordered" | "pending" | "reference";
export type PurchaseOrder = {
  id: string;
  title: string;
  vendor_name: string | null;
  site_address: string | null;
  notes: string | null;
  order_date: string | null;
  status: PurchaseOrderStatus;
  created_by: string | null;
  created_at: string;
};

export type QuickLink = {
  id: string;
  title: string;
  url: string;
  category: string | null;
  status: PurchaseOrderStatus;
  display_order: number;
  created_by: string | null;
  created_at: string;
};

export type CustomerProjectPhoto = {
  id: string;
  customer_project_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type PublicProject = {
  id: string;
  title: string;
  status: SiteStatus;
  work_date: string | null;
  customer_name: string;
};

export type Manual = {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  updated_at: string;
  created_at: string;
};

export type TodoStatus = "pending" | "in_progress" | "done";
export type Todo = {
  id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  status: TodoStatus;
  created_by: string | null;
  created_at: string;
};
