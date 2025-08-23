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
  surgery_date?: string;
  order_index: number;
}

export interface UpdateCaseRequest {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  section?: string;
  surgery_date?: string | null;
  order_index?: number;
  archived?: boolean;
}

export interface CasesFilters {
  name?: string;
  diagnosis?: string;
  outcome?: string;
  section?: string;
  surgery_date_from?: string;
  surgery_date_to?: string;
  archived?: boolean;
}

export interface WebSocketMessage {
  action: 'create' | 'update' | 'delete';
  case: string; // This is the case ID according to API docs
}
