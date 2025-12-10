/**
 * Agenda Feature Type Definitions
 * 
 * These types define the data structures for the agenda/calendar feature
 * that integrates with the separate agenda backend service.
 */

export interface AgendaEvent {
  id: string;
  user_id: string; // Owner of the event
  title: string;
  description?: string;
  start_time: string; // ISO 8601 format: "2025-01-15T09:00:00Z"
  end_time: string; // ISO 8601 format: "2025-01-15T13:00:00Z"
  location?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  event_type: 'work' | 'personal';
  created_at: string;
  updated_at: string;
  // Frontend-only fields (derived from API response)
  attendees?: AgendaEventAttendee[];
  // Display helpers
  time?: string; // Display format: "9:00 AM - 1:00 PM"
  inTime?: string; // 24h format: "09:00"
  outTime?: string; // 24h format: "13:00"
  isCollapsed?: boolean; // UI state
}

export interface AgendaEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  // Populated from main backend
  user?: {
    id: string;
    name: string;
    image_url?: string;
    specialty?: string;
  };
}

export interface BookingRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  project_id?: string;
  requested_date: string; // ISO date: "2025-01-15"
  requested_start_time?: string; // Time format: "09:00"
  requested_end_time?: string; // Time format: "13:00"
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'suggested_edit';
  suggested_date?: string; // If status is suggested_edit
  suggested_start_time?: string;
  suggested_end_time?: string;
  created_at: string;
  updated_at: string;
  // Populated from main backend
  requester?: {
    id: string;
    name: string;
    image_url?: string;
  };
  target_user?: {
    id: string;
    name: string;
    image_url?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface CreateAgendaEventRequest {
  title: string;
  description?: string;
  start_time: string; // ISO 8601 format
  end_time: string; // ISO 8601 format
  location?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  event_type?: 'work' | 'personal';
  attendee_ids?: string[]; // Array of user IDs to add as attendees
}

export interface UpdateAgendaEventRequest {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  event_type?: 'work' | 'personal';
}

export interface CreateBookingRequestRequest {
  target_user_id: string;
  project_id?: string;
  requested_date: string; // ISO date: "2025-01-15"
  requested_start_time?: string; // Time format: "09:00"
  requested_end_time?: string; // Time format: "13:00"
  message?: string;
}

export interface RespondToBookingRequestRequest {
  status: 'accepted' | 'declined' | 'suggest_edit';
  suggested_date?: string; // Required if status is 'suggest_edit'
  suggested_start_time?: string;
  suggested_end_time?: string;
  message?: string;
}

export interface GetAgendaEventsParams {
  startDate?: string; // ISO date: "2025-01-15"
  endDate?: string; // ISO date: "2025-01-31"
  userId?: string; // Filter by user ID
  status?: string; // Filter by status
  event_type?: 'work' | 'personal';
}

export interface GetBookingRequestsParams {
  status?: 'pending' | 'accepted' | 'declined' | 'suggested_edit';
  userId?: string; // Filter by target_user_id or requester_id
}

// Frontend helper: Agenda organized by day
export interface AgendaByDay {
  SU: AgendaEvent[];
  MO: AgendaEvent[];
  TU: AgendaEvent[];
  WE: AgendaEvent[];
  TH: AgendaEvent[];
  FR: AgendaEvent[];
  SA: AgendaEvent[];
}

// Helper function to convert event to day-based format
export const getDayAbbreviation = (date: Date): 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' => {
  const day = date.getDay();
  const dayMap: ('SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA')[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return dayMap[day];
};

// Helper function to format time for display
export const formatEventTime = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const format12h = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };
  
  return `${format12h(start)} - ${format12h(end)}`;
};

// Helper function to extract time components
export const extractTimeComponents = (isoString: string): { inTime: string; outTime: string } => {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return {
    inTime: `${hours}:${minutes}`,
    outTime: `${hours}:${minutes}`, // This will be set separately for end time
  };
};

