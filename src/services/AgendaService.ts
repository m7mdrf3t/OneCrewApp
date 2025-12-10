/**
 * Agenda Service
 * 
 * Handles API calls to the separate agenda backend service.
 * This service connects to the agenda backend for all calendar/event operations.
 */

import {
  AgendaEvent,
  CreateAgendaEventRequest,
  UpdateAgendaEventRequest,
  BookingRequest,
  CreateBookingRequestRequest,
  RespondToBookingRequestRequest,
  GetAgendaEventsParams,
  GetBookingRequestsParams,
  AgendaEventAttendee,
} from '../types/agenda';

class AgendaService {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl?: string) {
    // Default to environment variable or use provided URL
    // In production, this should be set via environment variable
    this.baseUrl = baseUrl || process.env.EXPO_PUBLIC_AGENDA_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Set the access token for authentication
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API request failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Agenda API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // =====================================================
  // EVENT METHODS
  // =====================================================

  /**
   * Get agenda events with optional filters
   */
  async getEvents(params?: GetAgendaEventsParams): Promise<AgendaEvent[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.event_type) queryParams.append('event_type', params.event_type);

    const queryString = queryParams.toString();
    const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<{ success: boolean; data: AgendaEvent[] }>(endpoint);
    return response.data || [];
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<AgendaEvent> {
    const response = await this.request<{ success: boolean; data: AgendaEvent }>(
      `/api/events/${eventId}`
    );
    return response.data;
  }

  /**
   * Create a new agenda event
   */
  async createEvent(eventData: CreateAgendaEventRequest): Promise<AgendaEvent> {
    const response = await this.request<{ success: boolean; data: AgendaEvent }>(
      '/api/events',
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    );
    return response.data;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    updates: UpdateAgendaEventRequest
  ): Promise<AgendaEvent> {
    const response = await this.request<{ success: boolean; data: AgendaEvent }>(
      `/api/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return response.data;
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.request(`/api/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // ATTENDEE METHODS
  // =====================================================

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<AgendaEventAttendee[]> {
    const response = await this.request<{ success: boolean; data: AgendaEventAttendee[] }>(
      `/api/events/${eventId}/attendees`
    );
    return response.data || [];
  }

  /**
   * Add an attendee to an event
   */
  async addEventAttendee(
    eventId: string,
    userId: string
  ): Promise<AgendaEventAttendee> {
    const response = await this.request<{ success: boolean; data: AgendaEventAttendee }>(
      `/api/events/${eventId}/attendees`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );
    return response.data;
  }

  /**
   * Update attendee status (accept/decline)
   */
  async updateAttendeeStatus(
    eventId: string,
    attendeeId: string,
    status: 'accepted' | 'declined'
  ): Promise<AgendaEventAttendee> {
    const response = await this.request<{ success: boolean; data: AgendaEventAttendee }>(
      `/api/events/${eventId}/attendees/${attendeeId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }
    );
    return response.data;
  }

  /**
   * Remove an attendee from an event
   */
  async removeEventAttendee(eventId: string, attendeeId: string): Promise<void> {
    await this.request(`/api/events/${eventId}/attendees/${attendeeId}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // BOOKING REQUEST METHODS
  // =====================================================

  /**
   * Get booking requests with optional filters
   */
  async getBookingRequests(
    params?: GetBookingRequestsParams
  ): Promise<BookingRequest[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);

    const queryString = queryParams.toString();
    const endpoint = `/api/booking-requests${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<{ success: boolean; data: BookingRequest[] }>(endpoint);
    return response.data || [];
  }

  /**
   * Get a single booking request by ID
   */
  async getBookingRequest(requestId: string): Promise<BookingRequest> {
    const response = await this.request<{ success: boolean; data: BookingRequest }>(
      `/api/booking-requests/${requestId}`
    );
    return response.data;
  }

  /**
   * Create a new booking request
   */
  async createBookingRequest(
    requestData: CreateBookingRequestRequest
  ): Promise<BookingRequest> {
    const response = await this.request<{ success: boolean; data: BookingRequest }>(
      '/api/booking-requests',
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    );
    return response.data;
  }

  /**
   * Respond to a booking request (accept/decline/suggest edit)
   */
  async respondToBookingRequest(
    requestId: string,
    response: RespondToBookingRequestRequest
  ): Promise<BookingRequest> {
    const apiResponse = await this.request<{ success: boolean; data: BookingRequest }>(
      `/api/booking-requests/${requestId}/respond`,
      {
        method: 'PUT',
        body: JSON.stringify(response),
      }
    );
    return apiResponse.data;
  }

  /**
   * Cancel/delete a booking request
   */
  async cancelBookingRequest(requestId: string): Promise<void> {
    await this.request(`/api/booking-requests/${requestId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export default new AgendaService();

