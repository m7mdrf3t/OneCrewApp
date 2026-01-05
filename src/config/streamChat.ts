/**
 * StreamChat Configuration
 * 
 * This file contains configuration for StreamChat integration.
 * The API key should be provided by the backend via getStreamChatToken() response.
 * This is a fallback for cases where the backend doesn't provide it.
 */

// StreamChat API Key - Fallback only (backend should provide this via getStreamChatToken response)
// The backend's getStreamChatToken() should return { token, user_id, api_key }
// If backend provides api_key, it will be used automatically
// This fallback is only used if backend doesn't provide the API key
export const STREAM_CHAT_API_KEY = process.env.STREAM_CHAT_API_KEY || process.env.STREAM_API_KEY || 'gjs4e7pmvpum';

/**
 * Channel ID prefix for OneCrew conversations
 * StreamChat channels will be created with this prefix + OneCrew conversation ID
 */
export const STREAM_CHANNEL_PREFIX = 'onecrew_';

/**
 * User ID prefix for OneCrew users/companies
 * StreamChat user IDs will use this prefix + OneCrew user/company ID
 */
export const STREAM_USER_PREFIX = 'onecrew_';

/**
 * StreamChat configuration options
 */
export const STREAM_CHAT_CONFIG = {
  // Enable debug mode in development
  debug: __DEV__,
  
  // Log level: 'info' | 'warn' | 'error' | 'none'
  logLevel: __DEV__ ? 'info' : 'warn',
  
  // Enable offline support
  enableOfflineSupport: true,
  
  // Enable background sync
  enableBackgroundSync: true,
  
  // Connection timeout in milliseconds
  connectionTimeout: 10000,
  
  // Reconnection options
  reconnection: {
    enabled: true,
    maxRetries: 5,
    retryDelay: 1000,
  },
};

/**
 * Get StreamChat API key (fallback)
 * 
 * NOTE: The API key should ideally come from the backend via getStreamChatToken() response.
 * This function is a fallback if the backend doesn't provide the API key.
 * 
 * Backend should return: { token, user_id, api_key } from getStreamChatToken()
 * If backend provides api_key, StreamChatService will use it automatically.
 */
export const getStreamChatApiKey = (): string => {
  if (STREAM_CHAT_API_KEY === 'YOUR_STREAM_API_KEY') {
    console.warn('⚠️ StreamChat API key not configured.');
    console.warn('⚠️ Backend should provide api_key in getStreamChatToken() response.');
    console.warn('⚠️ Otherwise, set STREAM_CHAT_API_KEY environment variable as fallback.');
  }
  return STREAM_CHAT_API_KEY;
};

