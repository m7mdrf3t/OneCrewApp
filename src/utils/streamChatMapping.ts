/**
 * StreamChat ID Mapping Utilities
 * 
 * Maps OneCrew conversation/user IDs to StreamChat channel/user IDs
 */

import { STREAM_CHANNEL_PREFIX, STREAM_USER_PREFIX } from '../config/streamChat';

/**
 * Convert OneCrew conversation ID to StreamChat channel ID
 * StreamChat uses channel IDs in the format: messaging:onecrew_{conversationId}
 */
export const getStreamChannelId = (conversationId: string): string => {
  return `messaging:${STREAM_CHANNEL_PREFIX}${conversationId}`;
};

/**
 * Convert StreamChat channel ID to OneCrew conversation ID
 * 
 * Handles two formats:
 * 1. messaging:onecrew_{conversationId} (expected format)
 * 2. messaging:{conversationId} (backend may create channels without prefix)
 */
export const getOneCrewConversationId = (channelId: string): string | null => {
  if (!channelId) return null;
  
  // Remove the 'messaging:' prefix if present
  const withoutPrefix = channelId.replace(/^messaging:/, '');
  
  if (!withoutPrefix) return null;
  
  // If it starts with the expected prefix, remove it
  if (withoutPrefix.startsWith(STREAM_CHANNEL_PREFIX)) {
    return withoutPrefix.replace(STREAM_CHANNEL_PREFIX, '');
  }
  
  // Otherwise, the channel ID itself is the conversation ID
  // (backend may create channels without the onecrew_ prefix)
  // This handles formats like: user_user-{id}, user_company-{id}, company_company-{id}
  return withoutPrefix;
};

/**
 * Convert OneCrew user/company ID to StreamChat user ID
 */
export const getStreamUserId = (oneCrewId: string, type: 'user' | 'company' = 'user'): string => {
  return `${STREAM_USER_PREFIX}${type}_${oneCrewId}`;
};

/**
 * Convert StreamChat user ID to OneCrew user/company ID
 */
export const getOneCrewUserId = (streamUserId: string): { id: string; type: 'user' | 'company' } | null => {
  if (!streamUserId.startsWith(STREAM_USER_PREFIX)) {
    return null;
  }
  
  const withoutPrefix = streamUserId.replace(STREAM_USER_PREFIX, '');
  const parts = withoutPrefix.split('_');
  
  if (parts.length < 2) {
    return null;
  }
  
  const type = parts[0] as 'user' | 'company';
  const id = parts.slice(1).join('_'); // In case ID contains underscores
  
  return { id, type };
};

/**
 * Get channel type from OneCrew conversation type
 */
export const getStreamChannelType = (conversationType: 'user_user' | 'user_company' | 'company_company'): string => {
  // StreamChat uses 'messaging' as the channel type for direct messages
  return 'messaging';
};

/**
 * Create channel members array for StreamChat from OneCrew participants
 */
export const createStreamChannelMembers = (
  participants: Array<{ participant_id: string; participant_type: 'user' | 'company' }>
): string[] => {
  return participants.map((p) => getStreamUserId(p.participant_id, p.participant_type));
};

/**
 * Extract participant info from StreamChat user ID
 */
export const extractParticipantInfo = (streamUserId: string): { id: string; type: 'user' | 'company' } | null => {
  return getOneCrewUserId(streamUserId);
};

