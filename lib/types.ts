export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Case {
  id: string;
  name: string;
  diagnosis: string;
  outcome: string;
  status: string; // CaseStatus enum: new_referral, awaiting_surgery, on_list, completed, onward_referrals, archived
  subspecialty: string | null; // CaseSubspecialty enum: hip_and_knee, foot_and_ankle, shoulder_and_elbow, hand (nullable)
  surgery_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Additional columns (all nullable as per backend)
  hospital_number: string | null;
  referral_date: string | null;
  age: number | null;
  gender: string | null;
  consultant: string | null;
  history: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface CreateCaseRequest {
  name: string;
  diagnosis: string;
  outcome: string;
  status: string;
  subspecialty?: string | null;
  surgery_date?: string | null;
  order_index: number;
  // Additional columns (all nullable as per backend)
  hospital_number?: string | null;
  referral_date?: string | null;
  age?: number | null;
  gender?: string | null;
  consultant?: string | null;
  history?: string | null;
}

export interface UpdateCaseRequest {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  status?: string;
  subspecialty?: string | null;
  surgery_date?: string | null;
  order_index?: number;
  // Additional columns (all nullable as per backend)
  hospital_number?: string | null;
  referral_date?: string | null;
  age?: number | null;
  gender?: string | null;
  consultant?: string | null;
  history?: string | null;
}

export interface CasesFilters {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  status?: string;
  subspecialty?: string;
  surgery_date_from?: string;
  surgery_date_to?: string;
  // Additional columns for filtering
  hospital_number?: string;
  referral_date_from?: string;
  referral_date_to?: string;
  age_min?: number;
  age_max?: number;
  gender?: string;
  consultant?: string;
  id?: string; // Add support for filtering by ID
}

export interface WebSocketMessage {
  message_type: 'case_update';
  action: 'create' | 'update' | 'delete';
  case_id: string;
  timestamp: string;
  user_id: string;
  case_data: Case;
  changed_fields?: string[];
  original_data?: Partial<Case>;
}
