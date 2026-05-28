import OneCrewApi, { User } from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';

const DEFAULT_BASE_URL = 'https://onecrew-backend-staging-309236356616.us-central1.run.app';

interface UsePortfolioMethodsParams {
  api: OneCrewApi;
  user: User | null;
  getAccessToken: () => string;
  setSocialLinksRefreshTrigger: (updater: (prev: number) => number) => void;
}

export function usePortfolioMethods({
  api,
  user,
  getAccessToken,
  setSocialLinksRefreshTrigger,
}: UsePortfolioMethodsParams) {
  const baseUrl: string = (api as any).baseUrl || DEFAULT_BASE_URL;

const getAvailableSkinTones = async () => {
  return await api.getAvailableSkinTones();
};

const getAvailableHairColors = async () => {
  return await api.getAvailableHairColors();
};

const getAvailableAbilities = async () => {
  return await api.getAvailableAbilities();
};

const getAvailableLanguages = async () => {
  return await api.getAvailableLanguages();
};

const healthCheck = async () => {
  return performanceMonitor.trackApiCall(
    'Health Check',
    `${baseUrl}/api/health`,
    'GET',
    () => api.healthCheck()
  );
};

const getUserPortfolio = async () => {
  try {
    console.log('🖼️ Fetching user portfolio...');
    const response = await api.getUserPortfolio();
    console.log('    Portfolio fetched successfully:', response.data?.length || 0, 'items');
    return response;
  } catch (error: any) {
    console.error('  Failed to fetch portfolio:', error);
    throw error;
  }
};

const addPortfolioItem = async (item: { kind: 'image' | 'video'; url: string; caption?: string; sort_order?: number }) => {
  try {
    console.log('➕ Adding portfolio item:', item.kind, item.url);
    const response = await api.addPortfolioItem(item);
    console.log('    Portfolio item added successfully:', response.data);
    return response;
  } catch (error: any) {
    console.error('  Failed to add portfolio item:', error);
    throw error;
  }
};

const updatePortfolioItem = async (itemId: string, updates: { caption?: string; sort_order?: number }) => {
  try {
    console.log('✏️ Updating portfolio item:', itemId, updates);
    const response = await api.updatePortfolioItem(itemId, updates);
    console.log('    Portfolio item updated successfully:', response.data);
    return response;
  } catch (error: any) {
    console.error('  Failed to update portfolio item:', error);
    throw error;
  }
};

const removePortfolioItem = async (itemId: string) => {
  try {
    console.log('🗑️ Removing portfolio item:', itemId);
    const response = await api.removePortfolioItem(itemId);
    console.log('    Portfolio item removed successfully');
    return response;
  } catch (error: any) {
    console.error('  Failed to remove portfolio item:', error);
    throw error;
  }
};

const getUserSocialLinks = async (userId?: string) => {
  // CRITICAL: Always use the provided userId, never fall back to current user's ID
  // This ensures we fetch the correct user's social links, not the logged-in user's
  const targetUserId = userId; // Don't fall back to user?.id - this causes the bug!
  
  // Check if fetching for current user or another user
  const isCurrentUserRequest = !targetUserId || targetUserId === user?.id;
  
  // IMPORTANT: Only cache for current user's social links
  // For other users, always fetch fresh data to avoid showing wrong social links
  const fetchSocialLinks = async () => {
    try {
      console.log('🔗 Fetching user social links...', targetUserId ? `for user ${targetUserId}` : 'for current user (no cache)');
      const accessToken = getAccessToken();
      
      // Always include user_id parameter if provided, otherwise backend returns current user's links
      const url = targetUserId 
        ? `${baseUrl}/api/social-links?user_id=${targetUserId}`
        : `${baseUrl}/api/social-links`;
      
      console.log('🔗 API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('  Failed to fetch social links:', result);
        throw new Error(result.error || 'Failed to fetch social links');
      }

      // DEBUG: Log the actual response data to verify backend is returning correct user's links
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        console.log('🔍 [DEBUG] Social links response data:', JSON.stringify(result.data, null, 2));
        const firstLink = result.data[0];
        if (firstLink.user_id) {
          console.log('🔍 [DEBUG] First link user_id:', firstLink.user_id, 'Expected:', targetUserId);
          if (firstLink.user_id !== targetUserId) {
            console.error('  [BUG DETECTED] Backend returned wrong user\'s social links!');
            console.error('   Expected user_id:', targetUserId);
            console.error('   Got user_id:', firstLink.user_id);
            console.error('   This is a BACKEND bug - the API is ignoring the user_id parameter');
          } else {
            console.log('    [DEBUG] Backend returned correct user\'s social links');
          }
        }
      }

      console.log('    Social links fetched successfully for user', targetUserId || 'current', ':', result.data?.length || 0, 'links');
      return result;
    } catch (error: any) {
      console.error('  Failed to fetch social links for user', targetUserId || 'current', ':', error);
      throw error;
    }
  };
  
  // Only cache for current user's own social links
  // For other users, always fetch fresh to avoid showing wrong data
  if (isCurrentUserRequest) {
    const cacheKey = 'user-social-links-current';
    return rateLimiter.execute(cacheKey, fetchSocialLinks, { ttl: CacheTTL.SHORT, persistent: false });
  } else {
    // NO CACHING for other users' social links - always fetch fresh!
    console.log('🔗 Fetching OTHER user social links (no cache) for:', targetUserId);
    return fetchSocialLinks();
  }
};

const addSocialLink = async (linkData: { platform: string; url: string; is_custom?: boolean }) => {
  try {
    console.log('➕ Adding social link:', linkData);
    const accessToken = getAccessToken();
    const response = await fetch(`${baseUrl}/api/social-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        platform: linkData.platform,
        url: linkData.url,
        is_custom: linkData.is_custom || false,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('  Failed to add social link:', result);
      throw new Error(result.error || 'Failed to add social link');
    }

    // Invalidate all social links caches (for current user and any specific userId)
    await rateLimiter.clearCache('user-social-links');
    await rateLimiter.clearCacheByPattern('user-social-links');
    // Trigger refresh in components that display social links
    setSocialLinksRefreshTrigger(prev => prev + 1);
    
    console.log('    Social link added successfully:', result.data);
    return result;
  } catch (error: any) {
    console.error('  Failed to add social link:', error);
    throw error;
  }
};

const updateSocialLink = async (linkId: string, updates: { platform?: string; url?: string; is_custom?: boolean }) => {
  try {
    console.log('✏️ Updating social link:', linkId, updates);
    const accessToken = getAccessToken();
    const response = await fetch(`${baseUrl}/api/social-links/${linkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('  Failed to update social link:', result);
      throw new Error(result.error || 'Failed to update social link');
    }

    // Invalidate all social links caches (for current user and any specific userId)
    await rateLimiter.clearCache('user-social-links');
    await rateLimiter.clearCacheByPattern('user-social-links');
    // Trigger refresh in components that display social links
    setSocialLinksRefreshTrigger(prev => prev + 1);
    
    console.log('    Social link updated successfully:', result.data);
    return result;
  } catch (error: any) {
    console.error('  Failed to update social link:', error);
    throw error;
  }
};

const deleteSocialLink = async (linkId: string) => {
  try {
    console.log('🗑️ Deleting social link:', linkId);
    const accessToken = getAccessToken();
    const response = await fetch(`${baseUrl}/api/social-links/${linkId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('  Failed to delete social link:', result);
      throw new Error(result.error || 'Failed to delete social link');
    }

    // Invalidate all social links caches (for current user and any specific userId)
    await rateLimiter.clearCache('user-social-links');
    await rateLimiter.clearCacheByPattern('user-social-links');
    // Trigger refresh in components that display social links
    setSocialLinksRefreshTrigger(prev => prev + 1);
    
    console.log('    Social link deleted successfully');
    return result;
  } catch (error: any) {
    console.error('  Failed to delete social link:', error);
    throw error;
  }
};

const getUserProfilePictures = async (userId: string) => {
  const cacheKey = `user-profile-pictures-${userId}`;
  return rateLimiter.execute(cacheKey, async () => {
    try {
      console.log('🖼️ Fetching profile pictures for user:', userId);
      const response = await api.getUserProfilePictures(userId);
      console.log('    Profile pictures fetched successfully:', response.data?.length || 0, 'pictures');
      return response;
    } catch (error: any) {
      console.error('  Failed to fetch profile pictures:', error);
      throw error;
    }
  }, { ttl: CacheTTL.MEDIUM, persistent: false }); // Pictures change occasionally; cache briefly to speed profile loads
};

const uploadProfilePicture = async (file: any, isMain: boolean = false) => {
  try {
    console.log('📤 Uploading profile picture, isMain:', isMain);
    const response = await api.uploadProfilePicture(file, isMain);
    console.log('    Profile picture uploaded successfully');
    // Invalidate profile pictures cache (current user)
    const targetUserId = (response as any)?.data?.user_id || user?.id;
    if (targetUserId) {
      await rateLimiter.clearCache(`user-profile-pictures-${targetUserId}`);
    } else {
      await rateLimiter.clearCacheByPattern('user-profile-pictures-');
    }
    return response;
  } catch (error: any) {
    console.error('  Failed to upload profile picture:', error);
    throw error;
  }
};

const setMainProfilePicture = async (userId: string, pictureId: string) => {
  try {
    console.log('⭐ Setting main profile picture:', pictureId, 'for user:', userId);
    const response = await api.setMainProfilePicture(userId, pictureId);
    console.log('    Main profile picture set successfully');
    await rateLimiter.clearCache(`user-profile-pictures-${userId}`);
    return response;
  } catch (error: any) {
    console.error('  Failed to set main profile picture:', error);
    throw error;
  }
};

const deleteProfilePicture = async (userId: string, pictureId: string) => {
  try {
    console.log('🗑️ Deleting profile picture:', pictureId, 'for user:', userId);
    const response = await api.deleteProfilePicture(userId, pictureId);
    console.log('    Profile picture deleted successfully');
    await rateLimiter.clearCache(`user-profile-pictures-${userId}`);
    return response;
  } catch (error: any) {
    console.error('  Failed to delete profile picture:', error);
    throw error;
  }
};

const uploadFile = async (file: { uri: string; type: string; name: string }) => {
  try {
    console.log('📤 Uploading file:', file.name, file.type);
    
    // Use the correct endpoint /api/media/upload instead of /api/upload
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    
    // Add required media_type field based on file type
    const mediaType = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 
                     file.type.startsWith('audio/') ? 'audio' : 'image';
    formData.append('media_type', mediaType);

    // Debug: Log what we're sending
    console.log('🔍 FormData file object:', {
      uri: file.uri,
      type: file.type,
      name: file.name,
      media_type: mediaType,
    });

    const accessToken = getAccessToken();
    
    // Don't set Content-Type manually - let fetch() handle it with proper boundary
    const response = await fetch(`${baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // Remove Content-Type - let fetch() set it automatically
      },
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('  Upload failed with status:', response.status);
      console.error('  Response:', result);
      throw new Error(result.error || `Upload failed with status ${response.status}`);
    }

    console.log('    File uploaded successfully:', result);
    
    // The backend returns the URL in result.data.file_url, not result.data.url
    const uploadResponse = {
      url: result.data.file_url,
      filename: result.data.title || file.name,
      size: result.data.file_size,
      type: result.data.media_type,
    };
    
    console.log('🔗 Extracted upload response:', uploadResponse);
    return { 
      success: true,
      data: uploadResponse 
    };
  } catch (error: any) {
    console.error('  Failed to upload file:', error);
    throw error;
  }
};

  return {
    getAvailableSkinTones,
    getAvailableHairColors,
    getAvailableAbilities,
    getAvailableLanguages,
    healthCheck,
    getUserPortfolio,
    addPortfolioItem,
    updatePortfolioItem,
    removePortfolioItem,
    getUserSocialLinks,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    getUserProfilePictures,
    uploadProfilePicture,
    setMainProfilePicture,
    deleteProfilePicture,
    uploadFile,
  };
}
