import OneCrewApi, { User, AuthResponse } from 'onecrew-api-client';
import { GuestSessionData, ConvertGuestToUserRequest } from '../types';
import { FilterParams } from '../components/FilterModal';

interface UseGuestSessionParams {
  api: OneCrewApi;
  guestSessionId: string | null;
  setGuestSessionId: (id: string | null) => void;
  setIsGuest: (v: boolean) => void;
  setIsAuthenticated: (v: boolean) => void;
  setUser: (user: User) => void;
}

export function useGuestSession({
  api,
  guestSessionId,
  setGuestSessionId,
  setIsGuest,
  setIsAuthenticated,
  setUser,
}: UseGuestSessionParams) {

const createGuestSession = async (): Promise<GuestSessionData> => {
  try {
    console.log('🎭 Creating guest session...');
    const response = await api.createGuestSession();
    if (response.success && response.data) {
      setGuestSessionId(response.data.sessionId);
      setIsGuest(true);
      console.log('🎭 Guest session created:', response.data.sessionId);
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to create guest session');
    }
  } catch (error) {
    console.error('Failed to create guest session:', error);
    throw error;
  }
};

const browseUsersAsGuest = async (params?: FilterParams & { page?: number; limit?: number }) => {
  if (!guestSessionId) {
    throw new Error('No guest session available');
  }
  try {
    console.log('🎭 Browsing users as guest...', params);
    // The underlying API client may only support basic params, but we pass all params
    // The backend should handle unsupported params gracefully
    const response = await api.browseUsersAsGuest(guestSessionId, params);
    return response;
  } catch (error) {
    console.error('Failed to browse users as guest:', error);
    throw error;
  }
};

const convertGuestToUser = async (request: ConvertGuestToUserRequest): Promise<AuthResponse> => {
  try {
    console.log('🎭 Converting guest to user...');
    const response = await api.convertGuestToUser(request);
    if (response.success && response.data) {
      setIsGuest(false);
      setGuestSessionId(null);
      setIsAuthenticated(true);
      setUser(response.data.user);
      console.log('🎭 Guest converted to user:', response.data.user.name);
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to convert guest to user');
    }
  } catch (error) {
    console.error('Failed to convert guest to user:', error);
    throw error;
  }
};

const getGuestSessionId = (): string | null => {
  return guestSessionId;
};

  return {
    createGuestSession,
    browseUsersAsGuest,
    convertGuestToUser,
    getGuestSessionId,
  };
}
