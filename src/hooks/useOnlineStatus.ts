const DEFAULT_BASE_URL = 'https://onecrew-backend-staging-309236356616.us-central1.run.app';

interface UseOnlineStatusParams {
  baseUrl?: string;
  getAccessToken: () => string;
}

export function useOnlineStatus({
  baseUrl = DEFAULT_BASE_URL,
  getAccessToken,
}: UseOnlineStatusParams) {

const getOnlineStatus = async (userId: string) => {
  try {
    const accessToken = getAccessToken();
    const response = await fetch(`${baseUrl}/api/users/${userId}/online-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
  } catch (error: any) {
    console.error('  Failed to get online status:', error);
    throw error;
  }
};

const getOnlineStatuses = async (userIds: string[]) => {
  try {
    const accessToken = getAccessToken();
    const response = await fetch(`${baseUrl}/api/users/online-statuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_ids: userIds }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
  } catch (error: any) {
    console.error('  Failed to get online statuses:', error);
    throw error;
  }
};

  return {
    getOnlineStatus,
    getOnlineStatuses,
  };
}
