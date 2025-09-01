// User roles and authentication
export type UserRole = 'admin' | 'consultant' | 'nurse' | 'viewer' | 'anaesthetist';

export interface User {
  email: string;
  first_name: string;
  last_name: string;
  department?: string | null;
  role: UserRole;
  is_active: boolean;
  id: string;
  created_at: string;
  updated_at?: string | null;
  last_login?: string | null;
}

export interface UserCreate {
  email: string;
  first_name: string;
  last_name: string;
  department?: string | null;
  role?: UserRole;
  is_active?: boolean;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  role?: UserRole | null;
  is_active?: boolean | null;
  password?: string | null;
}

// Authentication responses
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: any; // User object
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Case management
export type CaseStatus = 'new_referral' | 'awaiting_review' | 'awaiting_surgery' | 'scheduled' | 'in_progress' | 'completed' | 'archived' | 'onward_referral' | 'cancelled';

export type CaseSubspecialty = 'hip_and_knee' | 'foot_and_ankle' | 'shoulder_and_elbow' | 'hand' | 'spine' | 'trauma' | 'sports';

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type GenderType = 'Male' | 'Female' | 'Other';

// UserSimple interface for nested user data
export interface UserSimple {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  department?: string | null;
}

export interface Case {
  hospital_number?: string | null;
  name: string;
  age?: number | null;
  gender?: GenderType | null;
  diagnosis?: string | null;
  patient_history?: string | null;
  outcome?: string | null;
  status: CaseStatus;
  subspecialty?: CaseSubspecialty | null;
  priority: PriorityLevel;
  surgery_date?: string | null;
  order_index: number;
  referral_date?: string | null;
  consultant_id?: string | null;
  consultant?: UserSimple | null;
  id: string;
  created_at: string;
  updated_at?: string | null;
  created_by: string;
  last_modified_by?: string | null;
}

export interface CaseCreate {
  hospital_number?: string | null;
  name: string;
  age?: number | null;
  gender?: GenderType | null;
  diagnosis?: string | null;
  patient_history?: string | null;
  outcome?: string | null;
  status?: CaseStatus;
  subspecialty?: CaseSubspecialty | null;
  priority?: PriorityLevel;
  surgery_date?: string | null;
  order_index?: number;
  referral_date?: string | null;
  consultant_id?: string | null;
}

export interface CaseUpdate {
  hospital_number?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: GenderType | null;
  diagnosis?: string | null;
  patient_history?: string | null;
  outcome?: string | null;
  status?: CaseStatus | null;
  subspecialty?: CaseSubspecialty | null;
  priority?: PriorityLevel | null;
  surgery_date?: string | null;
  order_index?: number | null;
  referral_date?: string | null;
  consultant_id?: string | null;
}

// Theatre management
export interface Theatre {
  name: string;
  location?: string | null;
  capacity: number;
  equipment: Record<string, any>;
  is_active: boolean;
  id: string;
  created_at: string;
  updated_at?: string | null;
}

export interface TheatreCreate {
  name: string;
  location?: string | null;
  capacity?: number;
  equipment?: Record<string, any>;
  is_active?: boolean;
}

export interface TheatreUpdate {
  name?: string | null;
  location?: string | null;
  capacity?: number | null;
  equipment?: Record<string, any> | null;
  is_active?: boolean | null;
}

// Theatre sessions
export type SessionType = 'morning' | 'afternoon' | 'evening' | 'emergency' | 'weekend';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface TheatreSession {
  theatre_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  consultant_id?: string | null;
  consultant?: UserSimple | null;
  anaesthetist_id?: string | null;
  anaesthetist?: UserSimple | null;
  status: SessionStatus;
  notes?: string | null;
  id: string;
  created_at: string;
  updated_at?: string | null;
  created_by: string;
}

export interface TheatreSessionCreate {
  theatre_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type?: SessionType;
  consultant_id?: string | null;
  anaesthetist_id?: string | null;
  status?: SessionStatus;
  notes?: string | null;
}

export interface TheatreSessionUpdate {
  theatre_id?: string | null;
  session_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  session_type?: SessionType | null;
  consultant_id?: string | null;
  anaesthetist_id?: string | null;
  status?: SessionStatus | null;
  notes?: string | null;
}

// Case schedules
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CaseSchedule {
  case_id: string;
  session_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  estimated_duration: number;
  order_index: number;
  status: ScheduleStatus;
  notes?: string | null;
  id: string;
  created_at: string;
  updated_at?: string | null;
  created_by: string;
}

export interface CaseScheduleCreate {
  case_id: string;
  session_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  estimated_duration: number;
  order_index?: number;
  status?: ScheduleStatus;
  notes?: string | null;
}

export interface CaseScheduleUpdate {
  case_id?: string | null;
  session_id?: string | null;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  estimated_duration?: number | null;
  order_index?: number | null;
  status?: ScheduleStatus | null;
  notes?: string | null;
}

// API responses
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface SuccessResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  services: Record<string, string>;
}

export interface RootResponse {
  message: string;
  version: string;
  description: string;
  features: string[];
  documentation: string;
  health_check: string;
}

export interface WebSocketStatusResponse {
  active_connections: number;
  active_users: number;
  theatre_subscriptions: number;
  calendar_subscriptions: number;
  timestamp: string;
}

export interface ApiStatsResponse {
  version: string;
  uptime: string;
  total_requests: number;
  websocket_connections: number;
  active_users: number;
  timestamp: string;
}

// Search and filtering
export interface SearchRequest {
  query: string;
  skip?: number;
  limit?: number;
  filters?: Record<string, any> | null;
}

export interface SearchResponse {
  items: Case[];
  total: number;
  query: string;
}

export interface CasesFilters {
  status?: string | null;
  subspecialty?: string | null;
  consultant_id?: string | null;
  theatre_id?: string | null;
  surgery_date?: string | null;
  search?: string | null;
  archived?: boolean;
}

// Bulk operations
export interface BulkCaseUpdate {
  id: string;
  surgery_date?: string | null;
  order_index?: number | null;
  status?: string | null;
  subspecialty?: string | null;
  priority?: string | null;
}

export interface BulkUpdateRequest {
  updates: BulkCaseUpdate[];
}

export interface BulkUpdateRequestLegacy {
  case_ids: string[];
  updates: Record<string, any>;
}

export interface BulkUpdateResponse {
  message: string;
  updated_count: number;
}

// Calendar operations
export interface CalendarDateResponse {
  date: string;
  cases: Case[];
  count: number;
}

export interface ReorderRequest {
  target_date: string;
  case_orders: Record<string, string | number>[];
}

export interface ReorderResponse {
  message: string;
  target_date: string;
  updated_count: number;
}

export interface NextOrderIndexResponse {
  next_order_index: number;
}

// Analytics
export interface CaseStatisticsResponse {
  total_cases: number;
  new_referrals: number;
  awaiting_surgery: number;
  scheduled_cases: number;
  completed_cases: number;
  archived_cases: number;
}

export interface SubspecialtyStatisticsResponse {
  [key: string]: number;
}

export interface ConsultantWorkloadResponse {
  first_name: string;
  last_name: string;
  case_count: number;
}

export interface TheatreUtilizationResponse {
  message: string;
}

export interface TrendsResponse {
  message: string;
}

export interface SystemStatsResponse {
  total_cases: Record<string, any>;
  subspecialty_stats: Record<string, number>;
  consultant_workload: Record<string, any>[];
  websocket_connections: number;
  active_users: number;
}

// Department settings
export interface DepartmentSetting {
  department: string;
  setting_key: string;
  setting_value: Record<string, any>;
  id: string;
  updated_at: string;
}

export interface DepartmentSettingUpdate {
  setting_value: Record<string, any>;
}

// Validation
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

// WebSocket
export interface WebSocketSubscription {
  type: 'cases' | 'calendar' | 'theatres';
  filters?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  user_id?: string;
}

// Legacy types for backward compatibility
export interface DashboardStats {
  total_cases: number;
  new_referrals: number;
  awaiting_surgery_cases: number;
  scheduled_cases: number;
  completed_cases: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface CalendarSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  case_id?: string;
}

export interface CalendarDay {
  date: string;
  slots: CalendarSlot[];
}

export interface CaseFormData {
  name: string;
  hospital_number?: string;
  age?: number;
  gender?: GenderType;
  diagnosis?: string;
  patient_history?: string;
  outcome?: string;
  status: CaseStatus;
  subspecialty?: CaseSubspecialty;
  priority: PriorityLevel;
  surgery_date?: string;
  referral_date?: string;
  consultant_id?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  field: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: CasesFilters;
  sort?: SortConfig;
  include_archived?: boolean;
}

// Request types
export interface CreateCaseRequest extends CaseCreate {}
export interface UpdateCaseRequest extends CaseUpdate {}
