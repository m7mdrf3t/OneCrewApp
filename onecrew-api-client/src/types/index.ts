// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// User Types
export interface User {
  id: string;
  name: string;
  specialty?: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: UserRole;
  profile_step: string;
  profile_completeness: number;
  location_text?: string;
  bio?: string;
  email?: string;
  phone?: string;
  image_url?: string;
  online_last_seen?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type UserRole = 
  | 'actor' 
  | 'voice_actor' 
  | 'director' 
  | 'dop' 
  | 'editor' 
  | 'producer' 
  | 'scriptwriter' 
  | 'gaffer' 
  | 'grip' 
  | 'sound_engineer' 
  | 'makeup_artist' 
  | 'stylist' 
  | 'vfx' 
  | 'colorist';

export type UserCategory = 'crew' | 'talent' | 'company';

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  category: UserCategory;
  primary_role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface JWTPayload {
  sub: string;
  email?: string;
  category: UserCategory;
  role?: UserRole;
  iat: number;
  exp?: number;
}

// Project Types
export interface Project {
  id: string;
  title: string;
  description?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  delivery_date?: string;
  one_day_shoot: boolean;
  status: ProjectStatus;
  progress: number;
  budget?: number;
  location?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';

export interface CreateProjectRequest {
  title: string;
  description?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  delivery_date?: string;
  one_day_shoot?: boolean;
  budget?: number;
  location?: string;
}

// Team Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  users?: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    users: User;
  }>;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface JoinTeamRequest {
  team_id: string;
  role?: string;
}

// Communication Types
export interface Conversation {
  id: string;
  is_group: boolean;
  name?: string;
  created_at: string;
  updated_at: string;
  conversation_participants?: Array<{
    user_id: string;
    joined_at: string;
    left_at?: string;
    users: User;
  }>;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sent_at: string;
  sender_id: string;
  users?: User;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'file';
}

// Search Types
export interface SearchParams {
  q?: string;
  category?: UserCategory;
  role?: UserRole;
  location?: string;
  skills?: string[];
  languages?: string[];
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchSuggestion {
  type: 'user' | 'project' | 'team';
  text: string;
  category?: string;
  role?: string;
  status?: string;
}

// Upload Types
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

// Error Types
export class ApiError extends Error {
  public statusCode?: number;
  public code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// API Client Configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

// Request Options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}
