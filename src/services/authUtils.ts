export type ExtractedAuthPayload = {
  userData: any | null;
  token: string | null;
};

export type ParsedAuthError = {
  errorMessage: string;
  errorData: any;
};

export const extractAuthPayload = (authResponse: any): ExtractedAuthPayload => {
  let userData: any | null = null;
  let token: string | null = null;

  if (authResponse?.data) {
    if (authResponse.data.user) {
      userData = authResponse.data.user;
    } else if (authResponse.data.userData) {
      userData = authResponse.data.userData;
    } else if (authResponse.data.id || authResponse.data.name || authResponse.data.email) {
      userData = authResponse.data;
    }

    if (authResponse.data.token) {
      token = authResponse.data.token;
    } else if (authResponse.data.accessToken) {
      token = authResponse.data.accessToken;
    }
  }

  if (!userData) {
    userData = authResponse?.user ?? null;
  }

  if (!token) {
    token = authResponse?.token || authResponse?.accessToken || null;
  }

  return { userData, token };
};

export const parseAuthErrorResponse = (
  responseText: string,
  fallbackMessage: string
): ParsedAuthError => {
  let errorMessage = responseText || fallbackMessage;
  let errorData: any = {};

  try {
    errorData = JSON.parse(responseText);
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    // Not JSON, keep text fallback
  }

  return { errorMessage, errorData };
};

export const parseAuthResponseJson = (responseText: string): any => {
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(responseText || 'Server returned invalid JSON response');
  }
};

/**
 * Clear the password reset flag from AsyncStorage (silent – never throws).
 * Call this before writing new auth data so stale flags don't affect 401 handling.
 */
export const clearPasswordResetFlag = async (): Promise<void> => {
  try {
    await (await import('@react-native-async-storage/async-storage')).default.removeItem(
      'passwordResetFlag'
    );
  } catch {
    // Silent fail – this is a best-effort cleanup
  }
};

/**
 * Remove OAuth pending state keys that were stored before a social sign-in redirect.
 * Always safe to call; silently ignores storage errors.
 */
export const clearOAuthPendingState = async (): Promise<void> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('pending_category');
    await AsyncStorage.removeItem('pending_role');
  } catch {
    // Silent fail
  }
};

export type OAuthPendingState = {
  storedCategory: 'crew' | 'talent' | 'company' | null;
  storedRole: string | null;
};

/**
 * Read pending_category and pending_role written before the OAuth redirect.
 * Returns nulls (never throws) when not found or on storage failure.
 */
export const readOAuthPendingState = async (): Promise<OAuthPendingState> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const [storedCategory, storedRole] = await Promise.all([
      AsyncStorage.getItem('pending_category'),
      AsyncStorage.getItem('pending_role'),
    ]);
    return {
      storedCategory: storedCategory as OAuthPendingState['storedCategory'],
      storedRole,
    };
  } catch {
    return { storedCategory: null, storedRole: null };
  }
};

/**
 * On an OAuth error path, clear pending state unless the error was a user cancellation.
 * Never throws.
 */
export const clearOAuthPendingStateOnError = async (err: any): Promise<void> => {
  if (err?.message?.toLowerCase().includes('cancelled')) return;
  await clearOAuthPendingState();
};

export const isCategoryRequiredError = (errorMessage: string): boolean => {
  const errorLower = errorMessage.toLowerCase();
  return errorLower.includes('category') && errorLower.includes('required');
};

export const createCategoryRequiredError = (): Error => {
  const categoryError = new Error('CATEGORY_REQUIRED');
  (categoryError as any).code = 'CATEGORY_REQUIRED';
  return categoryError;
};

export const buildLoginAuthError = (
  status: number,
  responseText: string,
  statusText: string
): Error => {
  const { errorMessage: initialMessage, errorData } = parseAuthErrorResponse(
    responseText,
    `HTTP ${status}: ${statusText}`
  );

  const errorLower = initialMessage.toLowerCase();
  if (errorLower.includes('lockout') || errorLower.includes('locked') || errorLower.includes('too many attempts')) {
    const lockoutError: any = new Error(initialMessage);
    lockoutError.code = 'ACCOUNT_LOCKOUT';
    lockoutError.lockoutDuration = errorData.lockoutDuration || errorData.lockout_duration || 3600;
    lockoutError.remainingTime = errorData.remainingTime || errorData.remaining_time;
    return lockoutError;
  }

  if (errorLower.includes('deleted') || errorLower.includes('deletion')) {
    const deletionError: any = new Error(
      'Your account is scheduled for deletion. You can still log in during the grace period to restore your account. Please contact support if you need assistance.'
    );
    deletionError.code = 'ACCOUNT_DELETION_PENDING';
    deletionError.isPending = true;
    if (errorData.expirationDate) {
      deletionError.expirationDate = errorData.expirationDate;
    }
    if (errorData.daysRemaining !== undefined) {
      deletionError.daysRemaining = errorData.daysRemaining;
    }
    return deletionError;
  }

  let normalizedMessage = initialMessage;
  if (
    errorLower.includes('invalid') &&
    (errorLower.includes('email') || errorLower.includes('password') || errorLower.includes('credential'))
  ) {
    normalizedMessage = 'Invalid email or password. Please check your credentials and try again.';
  } else if (errorLower.includes('unauthorized') || status === 401) {
    normalizedMessage = 'Invalid email or password. Please check your credentials and try again.';
  }

  const authError: any = new Error(normalizedMessage);
  authError.isAuthError = true;
  authError.statusCode = status;
  return authError;
};

export const persistAuthSession = async (
  api: any,
  token: string,
  userData: any
): Promise<void> => {
  if (api?.auth && typeof api.auth.setAuthData === 'function') {
    await api.auth.setAuthData({ token, user: userData });
  } else {
    if (api?.apiClient && typeof api.apiClient.setAuthToken === 'function') {
      api.apiClient.setAuthToken(token);
    }

    if (api?.auth) {
      api.auth.authToken = token;
      api.auth.token = token;
      api.auth.accessToken = token;
      api.auth.currentUser = userData;
    }
  }

  if (api?.apiClient) {
    if (!api.apiClient.defaultHeaders) {
      api.apiClient.defaultHeaders = {};
    }
    api.apiClient.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  if (api?.auth) {
    api.auth.authToken = token;
    api.auth.token = token;
    api.auth.accessToken = token;
  }
};
