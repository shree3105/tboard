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
  section: string;
  surgery_date: string | null;
  order_index: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Newly added columns
  hospital_number: string;
  referral_date: string | null;
  age: number;
  gender: string;
  consultant: string;
  history: string;
  original_section: string | null;
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
  section: string;
  surgery_date?: string | null;
  order_index: number;
  // Newly added columns
  hospital_number: string;
  referral_date?: string | null;
  age: number;
  gender: string;
  consultant: string;
  history: string;
  original_section?: string | null;
}

export interface UpdateCaseRequest {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  section?: string;
  surgery_date?: string | null;
  order_index?: number;
  archived?: boolean;
  // Newly added columns
  hospital_number?: string;
  referral_date?: string | null;
  age?: number;
  gender?: string;
  consultant?: string;
  history?: string;
  original_section?: string | null;
}

export interface CasesFilters {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  section?: string;
  surgery_date_from?: string;
  surgery_date_to?: string;
  archived?: boolean;
  // Newly added columns for filtering
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
  action: 'create' | 'update' | 'delete';
  case: string; // This is the case ID according to API docs
}
