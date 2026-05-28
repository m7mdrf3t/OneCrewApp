import { useEffect } from 'react';
import { User } from 'onecrew-api-client';
import agendaService from '../services/AgendaService';
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

interface UseAgendaMethodsParams {
  isAuthenticated: boolean;
  user: User | null;
  getAccessToken: () => string;
}

export function useAgendaMethods({
  isAuthenticated,
  user,
  getAccessToken,
}: UseAgendaMethodsParams) {

useEffect(() => {
  if (isAuthenticated && user) {
    const token = getAccessToken();
    if (token) {
      agendaService.setAccessToken(token);
    }
  }
}, [isAuthenticated, user]);

const getAgendaEvents = async (params?: GetAgendaEventsParams): Promise<AgendaEvent[]> => {
  try {
    return await agendaService.getEvents(params);
  } catch (error: any) {
    console.error('  Failed to get agenda events:', error);
    throw error;
  }
};

const getAgendaEvent = async (eventId: string): Promise<AgendaEvent> => {
  try {
    return await agendaService.getEvent(eventId);
  } catch (error: any) {
    console.error('  Failed to get agenda event:', error);
    throw error;
  }
};

const createAgendaEvent = async (eventData: CreateAgendaEventRequest): Promise<AgendaEvent> => {
  try {
    return await agendaService.createEvent(eventData);
  } catch (error: any) {
    console.error('Failed to create agenda event:', error);
    throw error;
  }
};

const updateAgendaEvent = async (eventId: string, updates: UpdateAgendaEventRequest): Promise<AgendaEvent> => {
  try {
    return await agendaService.updateEvent(eventId, updates);
  } catch (error: any) {
    console.error('Failed to update agenda event:', error);
    throw error;
  }
};

const deleteAgendaEvent = async (eventId: string): Promise<void> => {
  try {
    await agendaService.deleteEvent(eventId);
  } catch (error: any) {
    console.error('Failed to delete agenda event:', error);
    throw error;
  }
};

const getEventAttendees = async (eventId: string): Promise<AgendaEventAttendee[]> => {
  try {
    return await agendaService.getEventAttendees(eventId);
  } catch (error: any) {
    console.error('  Failed to get event attendees:', error);
    throw error;
  }
};

const addEventAttendee = async (eventId: string, userId: string): Promise<AgendaEventAttendee> => {
  try {
    return await agendaService.addEventAttendee(eventId, userId);
  } catch (error: any) {
    console.error('  Failed to add event attendee:', error);
    throw error;
  }
};

const updateAttendeeStatus = async (eventId: string, attendeeId: string, status: 'accepted' | 'declined'): Promise<AgendaEventAttendee> => {
  try {
    return await agendaService.updateAttendeeStatus(eventId, attendeeId, status);
  } catch (error: any) {
    console.error('  Failed to update attendee status:', error);
    throw error;
  }
};

const removeEventAttendee = async (eventId: string, attendeeId: string): Promise<void> => {
  try {
    await agendaService.removeEventAttendee(eventId, attendeeId);
  } catch (error: any) {
    console.error('  Failed to remove event attendee:', error);
    throw error;
  }
};

const getBookingRequests = async (params?: GetBookingRequestsParams): Promise<BookingRequest[]> => {
  try {
    return await agendaService.getBookingRequests(params);
  } catch (error: any) {
    console.error('  Failed to get booking requests:', error);
    throw error;
  }
};

const getBookingRequest = async (requestId: string): Promise<BookingRequest> => {
  try {
    return await agendaService.getBookingRequest(requestId);
  } catch (error: any) {
    console.error('  Failed to get booking request:', error);
    throw error;
  }
};

const createBookingRequest = async (requestData: CreateBookingRequestRequest): Promise<BookingRequest> => {
  try {
    return await agendaService.createBookingRequest(requestData);
  } catch (error: any) {
    console.error('  Failed to create booking request:', error);
    throw error;
  }
};

const respondToBookingRequest = async (requestId: string, response: RespondToBookingRequestRequest): Promise<BookingRequest> => {
  try {
    return await agendaService.respondToBookingRequest(requestId, response);
  } catch (error: any) {
    console.error('  Failed to respond to booking request:', error);
    throw error;
  }
};

const cancelBookingRequest = async (requestId: string): Promise<void> => {
  try {
    await agendaService.cancelBookingRequest(requestId);
  } catch (error: any) {
    console.error('  Failed to cancel booking request:', error);
    throw error;
  }
};

  return {
    getAgendaEvents,
    getAgendaEvent,
    createAgendaEvent,
    updateAgendaEvent,
    deleteAgendaEvent,
    getEventAttendees,
    addEventAttendee,
    updateAttendeeStatus,
    removeEventAttendee,
    getBookingRequests,
    getBookingRequest,
    createBookingRequest,
    respondToBookingRequest,
    cancelBookingRequest,
  };
}
