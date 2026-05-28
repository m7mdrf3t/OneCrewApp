import React, { useCallback } from 'react';
import { InteractionManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, SignupRequest, AuthResponse } from 'onecrew-api-client';
import pushNotificationService from '../services/PushNotificationService';
import streamChatService from '../services/StreamChatService';
import ReferenceDataService from '../services/ReferenceDataService';
import {
  registerPushToken as _registerPushToken,
  initPushTokenWithRetry,
} from '../services/pushNotificationUtils';
import { initializeGoogleSignIn, signInWithGoogle } from '../services/GoogleAuthService';
import { initializeAppleAuthentication, signInWithApple } from '../services/AppleAuthService';
import {
  buildLoginAuthError,
  clearAllAuthData as _clearAllAuthData,
  clearOAuthPendingState,
  clearOAuthPendingStateOnError,
  clearPasswordResetFlag,
  createCategoryRequiredError,
  extractAuthPayload,
  isCategoryRequiredError,
  parseAuthErrorResponse,
  parseAuthResponseJson,
  persistAuthSession,
  readOAuthPendingState,
} from '../services/authUtils';

const RECENT_LOGIN_WINDOW = 30000; // 30 seconds

interface UseAuthMethodsParams {
  api: any;
  user: User | null;
  error: string | null;
  baseUrl: string;
  setUser: (u: User | null) => void;
  setIsAuthenticated: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setCurrentProfileType: (type: 'user' | 'company') => void;
  setActiveCompany: (c: any | null) => void;
  setNotifications: (n: any[]) => void;
  setUnreadNotificationCount: (c: number) => void;
  setUnreadConversationCount: (c: number) => void;
  isHandling401Ref: React.MutableRefObject<boolean>;
  last401ErrorRef: React.MutableRefObject<number>;
  recentLoginRef: React.MutableRefObject<number>;
  stopHeartbeatRef: React.MutableRefObject<() => void>;
  fetchCompleteUserProfileRef: React.MutableRefObject<(userId: string, userData?: any) => Promise<any>>;
  getStreamChatTokenRef: React.MutableRefObject<(options?: { profile_type?: 'user' | 'company'; company_id?: string }) => Promise<any>>;
  forceUnsubscribeNotificationsRef: React.MutableRefObject<() => void>;
}

export function useAuthMethods({
  api,
  user,
  error,
  baseUrl,
  setUser,
  setIsAuthenticated,
  setIsLoading,
  setError,
  setCurrentProfileType,
  setActiveCompany,
  setNotifications,
  setUnreadNotificationCount,
  setUnreadConversationCount,
  isHandling401Ref,
  last401ErrorRef,
  recentLoginRef,
  stopHeartbeatRef,
  fetchCompleteUserProfileRef,
  getStreamChatTokenRef,
  forceUnsubscribeNotificationsRef,
}: UseAuthMethodsParams) {
  const clearAllAuthData = () => _clearAllAuthData(api);
  const registerPushToken = (token: string) => _registerPushToken(api, token);

  const handle401Error = async (error: any) => {
    const now = Date.now();
    const errorMessage = error?.message || error?.error || '';
    
    // Don't handle 401 if user just logged in (within RECENT_LOGIN_WINDOW)
    // This prevents false positives after password reset + login
    if (now - recentLoginRef.current < RECENT_LOGIN_WINDOW) {
      return;
    }
    
    // Prevent duplicate handling within 5 seconds
    if (isHandling401Ref.current || (now - last401ErrorRef.current < 5000)) {
      return;
    }

    // Check if this is a token invalidation error.
    // NOTE: Plain "unauthorized" is intentionally excluded — a generic 401 usually means the
    // token expired after long inactivity, not that it was explicitly revoked by the server.
    // Only signing out on explicit invalidation messages prevents unwanted logouts when the
    // app hasn't been opened for a while.
    if (error?.status === 401 || error?.statusCode === 401) {
      const isTokenInvalidated =
        errorMessage.toLowerCase().includes('token has been invalidated') ||
        errorMessage.toLowerCase().includes('invalidated') ||
        errorMessage.toLowerCase().includes('please sign in again') ||
        errorMessage.toLowerCase().includes('invalid token') ||
        errorMessage.toLowerCase().includes('token is invalid');

      if (isTokenInvalidated) {
        isHandling401Ref.current = true;
        last401ErrorRef.current = now;
        
        try {
          // Stop heartbeat
          stopHeartbeatRef.current();

          // Clear all auth data
          await clearAllAuthData();

          // Clear local state
          setIsAuthenticated(false);
          setUser(null);
          setNotifications([]);
          setUnreadNotificationCount(0);
          setUnreadConversationCount(0);

          // Unsubscribe from real-time notifications
          forceUnsubscribeNotificationsRef.current();

          // Clear push notification token
          await pushNotificationService.clearToken().catch(() => {});
          await pushNotificationService.setBadgeCount(0).catch(() => {});
        } catch (err) {
          console.error('Error during 401 handling:', err);
        } finally {
          isHandling401Ref.current = false;
        }
      }
    }
  };

  // Test network connectivity - try multiple endpoints
  const testConnectivity = async () => {
    const endpointsToTry = [
      '/health',
      '/api/health',
      '/api',
      '/',
    ];

    for (const endpoint of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        // If we get any response (even 404), it means the server is reachable
        if (response.status >= 200 && response.status < 500) {
          return true;
        }
        
        // Even 404 means server is reachable
        if (response.status === 404) {
          return true;
        }
      } catch (error: any) {
        // Network errors or timeouts - continue to next endpoint
        // Continue to next endpoint
        continue;
      }
    }

    // If all endpoints failed, try to initialize the API directly as a fallback
    return null; // null means "unknown, try anyway"
  };

  // Initialize API client
  const initializeApi = async () => {
      // Test connectivity in the background — truly non-blocking
      testConnectivity();
      
      try {
        await api.initialize();
        console.log('    API client initialized successfully');
        
        // Verify chat service is available
        if (api.chat) {
          console.log('    Chat service is available');
          console.log('    Chat service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(api.chat)).filter(m => m !== 'constructor'));
        } else {
          console.warn('   Chat service is not available after initialization');
          console.warn('   API object keys:', Object.keys(api));
        }
        
        // Clear any previous connectivity errors since initialization succeeded
        if (error && error.includes('Cannot connect to server')) {
          setError(null);
        }
        
        // Initialize ReferenceDataService with the API
        ReferenceDataService.setApi(api);
        
        // Auth provider setup is not needed for first paint, so initialize it in the background
        InteractionManager.runAfterInteractions(() => {
          Promise.resolve()
            .then(async () => {
              await initializeGoogleSignIn();
              await initializeAppleAuthentication();
            })
            .catch((err) => {
              console.warn('⚠️ Failed to initialize social auth providers:', err);
            });
        });
        
        // Check if password was recently reset - if so, don't restore tokens
        const passwordResetFlag = await AsyncStorage.getItem('passwordResetFlag');
        if (passwordResetFlag === 'true') {
          // Clear any tokens that might have been restored by API client
          await clearAllAuthData();
          setIsAuthenticated(false);
          setUser(null);
        } else if (api.auth.isAuthenticated()) {
          const currentUser = api.auth.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Set up token refresh callback for automatic re-registration
          pushNotificationService.setOnTokenRefreshCallback((newToken) => {
            if (api.auth.isAuthenticated()) {
              registerPushToken(newToken).catch((error) => {
                console.warn('   Failed to re-register token after refresh:', error);
              });
            }
          });
          
          // Register push token for already-authenticated user (retry: FCM often not ready until ~2s after app start)
          initPushTokenWithRetry(
            (token) => registerPushToken(token),
            () => api.auth.isAuthenticated(),
            4, 2_500, 2_500
          );
          
          // Restore profile type and active company from storage
          const savedProfileType = await AsyncStorage.getItem('currentProfileType');
          const savedCompanyId = await AsyncStorage.getItem('activeCompanyId');
          
          if (savedProfileType === 'company' && savedCompanyId) {
            try {
              const companyResponse = await api.getCompany(savedCompanyId);
              if (companyResponse.success && companyResponse.data) {
                setActiveCompany(companyResponse.data);
                setCurrentProfileType('company');
              } else {
                // Company not found or access denied, switch to user profile
                await AsyncStorage.setItem('currentProfileType', 'user');
                await AsyncStorage.removeItem('activeCompanyId');
                setCurrentProfileType('user');
              }
            } catch (error) {
              console.warn('Failed to restore company profile:', error);
              await AsyncStorage.setItem('currentProfileType', 'user');
              await AsyncStorage.removeItem('activeCompanyId');
              setCurrentProfileType('user');
            }
          } else {
            setCurrentProfileType('user');
          }
        }
      } catch (err) {
        console.warn('Failed to initialize API:', err);
      } finally {
        setIsLoading(false);
      }
    };


  const runPostAuthSetup = (userData: any, logRecentLogin: boolean = false) => {
    // Mark recent login FIRST to prevent immediate 401 handling (before setIsAuthenticated triggers API calls)
    recentLoginRef.current = Date.now();
    if (logRecentLogin) {
      console.log('    Recent login timestamp set - 401 handling will be skipped for', RECENT_LOGIN_WINDOW, 'ms');
    }

    // Update user state
    setUser(userData);
    setIsAuthenticated(true);

    // Set up token refresh callback for automatic re-registration
    pushNotificationService.setOnTokenRefreshCallback((newToken) => {
      if (api.auth.isAuthenticated()) {
        registerPushToken(newToken).catch((error) => {
          console.warn('   Failed to re-register token after refresh:', error);
        });
      }
    });

    // Register for push notifications after successful login (retry: FCM often not ready for ~2s)
    initPushTokenWithRetry(
      (token) => registerPushToken(token),
      () => api.auth.isAuthenticated(),
      4, 2_500, 500
    );

    // Fetch complete user profile data after login
    setTimeout(async () => {
      try {
        const completeUser = await fetchCompleteUserProfileRef.current(userData.id, userData);
        if (completeUser) {
          setUser(completeUser as User);
        }
      } catch (err) {
        // Silent fail - profile will load on next refresh
      }
    }, 1000);

    // Initialize StreamChat (fire-and-forget; does not block the auth flow)
    ;(async () => {
      try {
        const streamTokenResponse = await getStreamChatTokenRef.current({ profile_type: 'user' });
        if (streamTokenResponse.success && streamTokenResponse.data) {
          const { token: streamToken, user_id, api_key } = streamTokenResponse.data as any;
          await streamChatService.connectUser(
            user_id,
            streamToken,
            { name: userData.name, image: userData.image_url },
            api_key,
            'user'
          );
          console.log('    StreamChat initialized after sign-in');
        } else {
          console.error('  StreamChat token response failed:', streamTokenResponse);
        }
      } catch (streamError) {
        console.error('  Failed to initialize StreamChat:', streamError);
        // Non-critical — auth proceeds regardless
      }
    })();
  };

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try direct fetch first to bypass potential API client issues
      const response = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      // Read response as text first (can only read body once)
      const responseText = await response.text();
      
      if (!response.ok) {
        throw buildLoginAuthError(response.status, responseText, response.statusText);
      }

      // Parse response as JSON
      const authResponse = parseAuthResponseJson(responseText);
      
      const { userData, token } = extractAuthPayload(authResponse);
      
      if (!userData) {
        console.error(' No user data found in login response');
        throw new Error('Login response missing user data');
      }
      
      if (!token) {
        console.error(' No token found in login response');
        throw new Error('Login response missing authentication token');
      }
      
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);
      console.log('    API client headers updated with new token');
      
      runPostAuthSetup(userData, true);
      
      return authResponse;
    } catch (err: any) {
      // Only log detailed error info for unexpected errors, not for normal auth failures
      if (!err.isAuthError && err.code !== 'ACCOUNT_LOCKOUT' && err.code !== 'ACCOUNT_DELETION_PENDING') {
        // For unexpected errors, log full details
        console.error('Login failed:', err);
      }
      
      // If direct fetch fails, try the API client as fallback
      if (err.message.includes('Network error') || err.message.includes('ENOENT')) {
        try {
          const authResponse = await api.auth.login(credentials);
          setUser(authResponse.user);
          setIsAuthenticated(true);
          return authResponse;
        } catch (apiErr: any) {
          console.error('  API client also failed:', apiErr);
          
          // Check for account lockout in API client error
          const errorLower = apiErr.message?.toLowerCase() || '';
          if (errorLower.includes('lockout') || errorLower.includes('locked') || errorLower.includes('too many attempts')) {
            const lockoutError: any = new Error(apiErr.message || 'Account locked due to too many failed login attempts');
            lockoutError.code = 'ACCOUNT_LOCKOUT';
            setIsAuthenticated(false);
            setUser(null);
            setError(lockoutError.message);
            throw lockoutError;
          }
          
          setIsAuthenticated(false);
          setUser(null);
          setError(apiErr.message || 'Login failed');
          throw apiErr;
        }
      } else {
        // Check for account lockout in direct fetch error
        if (err.code === 'ACCOUNT_LOCKOUT') {
          setIsAuthenticated(false);
          setUser(null);
          setError(err.message);
          throw err;
        }
        
        setIsAuthenticated(false);
        setUser(null);
        setError(err.message || 'Login failed');
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupRequest) => {
    setIsLoading(true);
    setError(null);
    
    // CRITICAL: Ensure no auth data exists before signup
    // We will NOT save anything during signup - token only comes after OTP verification
    setIsAuthenticated(false);
    setUser(null);
    
    try {
      // Call the library's signup method
      // NOTE: The library's signup() method does NOT call setAuthData() - it explicitly avoids saving
      // because there's no token yet. Token will only be saved after verifySignupOtp() succeeds.
      // However, the library might try to save something internally and throw a SecureStore error
      // We'll catch that and handle it gracefully
      let authResponse: any;
      try {
        authResponse = await api.auth.signup(userData);
      } catch (libraryErr: any) {
        // If the library throws a SecureStore error, it means signup succeeded but saving failed
        // The response should be accessible from the library's internal state or error object
        if (libraryErr.message?.includes('SecureStore') || libraryErr.message?.includes('JSON-encoding')) {
          console.warn('   Library threw SecureStore error, but signup likely succeeded');
          
          // Try to get the response from various possible locations
          // The response structure from logs shows: {"data": {"message": "...", "user": {...}}}
          const possibleResponse = 
            libraryErr.response?.data?.data ||  // Nested data.data structure
            libraryErr.response?.data ||         // Direct data structure
            libraryErr.data?.data ||             // Error.data.data
            libraryErr.data ||                    // Error.data
            libraryErr.response ||                // Error.response
            libraryErr.signupResponse ||          // Custom property
            ((api as any).auth?.lastSignupResponse) ||  // Library internal state
            ((api as any).auth?.lastResponse) ||        // Library internal state
            ((api as any).auth?.response);              // Library internal state
          
          if (possibleResponse) {
            authResponse = possibleResponse;
          } else {
            // If we can't extract the response, but we know signup succeeded,
            // return a minimal success response to allow the flow to continue
            authResponse = {
              success: true,
              message: 'Registration successful. Please check your email for the OTP code to verify your account.',
              requiresEmailVerification: true,
              user: null // User data will be available after OTP verification
            };
          }
        } else {
          // Not a SecureStore error, rethrow
          throw libraryErr;
        }
      }
      
      // Ensure we're not authenticated (double-check)
      setIsAuthenticated(false);
      setUser(null);
      
      // Ensure no auth data is stored (the library shouldn't save anything, but be extra safe)
      try {
        await clearAllAuthData();
      } catch (clearErr) {
        // Silent fail
      }
      
      // Return response with requiresEmailVerification flag
      // The token will ONLY be retrieved and saved after verifySignupOtp() succeeds
      const response = {
        ...(authResponse.data || authResponse),
        requiresEmailVerification: true
      } as any;
      return response;
    } catch (err: any) {
      console.error('Signup failed:', err);
      setIsAuthenticated(false);
      setUser(null);
      
      // If it's a SecureStore error, it means something tried to save during signup
      // This shouldn't happen, but if it does, we'll handle it gracefully
      if (err.message?.includes('SecureStore') || err.message?.includes('JSON-encoding')) {
        console.error('   SecureStore error during signup - something tried to save data (this shouldn\'t happen)');
        console.error('   The library\'s signup() method should NOT save anything - token only comes after OTP verification');
        
        // Try to extract the response if signup actually succeeded
        // The response structure from logs shows: {"data": {"message": "...", "user": {...}}}
        const errorData = 
          (err as any).response?.data?.data ||  // Nested data.data structure
          (err as any).response?.data ||         // Direct data structure
          (err as any).data?.data ||             // Error.data.data
          (err as any).data ||                    // Error.data
          (err as any).response ||                // Error.response
          (err as any).signupResponse;            // Custom property
        
        // Also check if the library stored the response internally before throwing
        let signupResponse = null;
        try {
          // Check if the library has the response stored internally
          const authService = (api as any).auth;
          if (authService) {
            signupResponse = 
              authService.lastSignupResponse ||
              authService.lastResponse ||
              authService.response;
          }
        } catch (e) {
          // Ignore errors when checking internal state
        }
        
        const responseData = errorData || signupResponse;
        
        if (responseData) {
          setIsAuthenticated(false);
          setUser(null);
          // Clear any partial saves
          await clearAllAuthData();
          
          // Ensure the response has the correct structure
          const finalResponse = {
            ...(responseData.data || responseData),
            requiresEmailVerification: true,
            success: true
          } as any;
          
          return finalResponse;
        }
        
        // If we can't extract the response, still don't throw - signup likely succeeded
        // The user should check their email for the OTP
        setError('Signup completed but encountered an internal error. Please check your email for the verification code.');
        
        // Return a minimal success response to allow the flow to continue
        return {
          requiresEmailVerification: true,
          success: true,
          message: 'Registration successful. Please check your email for the OTP code to verify your account.'
        } as any;
      } else {
        setError(err.message || 'Signup failed');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignIn = async (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Get Supabase access token via native Google Sign-In
      // (Native SDK gets Google ID token, then exchanges it with Supabase)
      const accessToken = await signInWithGoogle();
      
      // Step 2: Retrieve category and role from AsyncStorage (stored before OAuth)
      const { storedCategory, storedRole } = await readOAuthPendingState();
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = storedCategory || category;
      const finalRole = storedRole || primaryRole;
      
      // Step 3: Send Supabase access token to backend
      const requestBody: any = {
        accessToken: accessToken, // Backend expects Supabase access token
        ...(finalCategory && { category: finalCategory }),
        ...(finalRole && { primary_role: finalRole }),
      };
      
      const response = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        const { errorMessage } = parseAuthErrorResponse(
          responseText,
          `HTTP ${response.status}: ${response.statusText}`
        );
        
        // Check if error is about missing category
        if (isCategoryRequiredError(errorMessage)) {
          throw createCategoryRequiredError();
        }
        
        throw new Error(errorMessage);
      }

      // Parse response
      const authResponse = parseAuthResponseJson(responseText);
      
      await clearOAuthPendingState();
      const { userData, token } = extractAuthPayload(authResponse);
      
      if (!userData) {
        throw new Error('Google Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Google Sign-In response missing authentication token');
      }
      
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);

      runPostAuthSetup(userData);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('  Google Sign-In failed:', err);
      
      await clearOAuthPendingStateOnError(err);
      
      // Don't set error state for category required - let UI handle it
      if (err.code === 'CATEGORY_REQUIRED') {
        throw err;
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Google Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const appleSignIn = async (category?: 'crew' | 'talent' | 'company', primaryRole?: string) => {
    console.log('🍎 Apple Sign-In attempt');
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Get Supabase access token via Apple OAuth
      console.log('    Requesting Apple Sign-In via Supabase OAuth...');
      const accessToken = await signInWithApple();
      console.log('    Supabase access token received');
      
      // Step 2: Retrieve category and role from AsyncStorage (stored before OAuth)
      const { storedCategory, storedRole } = await readOAuthPendingState();
      console.log('📋 Retrieved from AsyncStorage:', {
        category: storedCategory || 'not found',
        role: storedRole || 'not found',
      });
      
      // Use stored values if available, otherwise fall back to function parameters
      const finalCategory = storedCategory || category;
      const finalRole = storedRole || primaryRole;
      
      // Step 3: Use API client method if available (v2.26.0+), otherwise fallback to direct fetch
      let authResponse: any;
      let userData: any = null;
      let token: string | null = null;
      
      // Check if the new API client method is available
      if (api.auth && typeof (api.auth as any).signInWithApple === 'function') {
        try {
          const response = await (api.auth as any).signInWithApple(accessToken, finalCategory, finalRole);
          
          // Handle different response formats:
          // 1. Wrapped format: { success: true, data: { user, token } }
          // 2. Direct format: { user, token }
          // 3. Error format: { success: false, message/error }
          
          if (!response) {
            throw new Error('No response received from Apple Sign-In');
          }
          
          // Check if it's an error response
          if (response.success === false || (response.error && !response.user)) {
            // Extract error message from response
            const errorMsg = response?.message || response?.error || response?.data?.error || 'Apple Sign-In failed';
            console.error('  API client returned unsuccessful response:', {
              success: response?.success,
              message: response?.message,
              error: response?.error,
              data: response?.data,
              fullResponse: JSON.stringify(response, null, 2),
            });
            
            // Create error with full details
            const error = new Error(errorMsg);
            (error as any).response = response;
            (error as any).code = response?.code;
            (error as any).originalResponse = response;
            throw error;
          }
          
          // Response is successful - extract data from either format
          authResponse = response;
          
          // Check if response has user/token directly (direct format)
          if (response.user && response.token) {
            userData = response.user;
            token = response.token;
          } 
          // Check if response has data wrapper (wrapped format)
          else if (response.data) {
            if (response.data.user) {
              userData = response.data.user;
            } else if (response.data.userData) {
              userData = response.data.userData;
            } else if (response.data.id || response.data.name || response.data.email) {
              userData = response.data;
            }
            
            if (response.data.token) {
              token = response.data.token;
            } else if (response.data.accessToken) {
              token = response.data.accessToken;
            }
          }
          // Check if response has success: true but data might be at root
          else if (response.success === true) {
            // Data might be at root level
            if (response.user) {
              userData = response.user;
            }
            if (response.token) {
              token = response.token;
            }
          }
          
          if (!userData || !token) {
            console.error('  Missing user data or token in response');
            throw new Error('Invalid response format: missing user data or token');
          }
        } catch (apiError: any) {
          // Extract error details from various possible error structures
          const errorDetails: any = {
            code: apiError?.code,
            message: apiError?.message,
            error: apiError?.error,
            status: apiError?.status,
            statusCode: apiError?.statusCode,
            response: apiError?.response,
          };
          
          // Try to extract from ApiError structure (onecrew-api-client)
          if (apiError?.response) {
            errorDetails.responseData = apiError.response;
            if (apiError.response.data) {
              errorDetails.responseError = apiError.response.data.error || apiError.response.data.message;
            }
          }
          
          // Try to extract from nested error structures
          if (apiError?.error) {
            if (typeof apiError.error === 'string') {
              errorDetails.errorMessage = apiError.error;
            } else if (apiError.error?.message) {
              errorDetails.errorMessage = apiError.error.message;
            }
          }
          
          // Build comprehensive error message
          const errorMessage = (
            errorDetails.responseError ||
            errorDetails.errorMessage ||
            apiError?.message ||
            apiError?.error ||
            (apiError?.response?.data?.error) ||
            (apiError?.response?.data?.message) ||
            'Apple Sign-In failed'
          ).toLowerCase();
          
          // If API client method fails, check for category required error
          // Check multiple possible error formats
          const hasCategoryError = 
            apiError?.code === 'CATEGORY_REQUIRED' ||
            errorMessage.includes('category') && errorMessage.includes('required') ||
            (errorDetails.responseError && 
             typeof errorDetails.responseError === 'string' && 
             errorDetails.responseError.toLowerCase().includes('category') &&
             errorDetails.responseError.toLowerCase().includes('required'));
          
          if (hasCategoryError) {
            const categoryError = new Error('CATEGORY_REQUIRED');
            (categoryError as any).code = 'CATEGORY_REQUIRED';
            throw categoryError;
          }
          
          // Check for foreign key constraint error on primary_role
          const hasRoleError = 
            errorMessage.includes('foreign key constraint') && 
            (errorMessage.includes('primary_role') || errorMessage.includes('primary role'));
          
          if (hasRoleError) {
            const roleError = new Error('INVALID_ROLE');
            (roleError as any).code = 'INVALID_ROLE';
            (roleError as any).message = 'The selected role is not valid. Please try selecting a different role or contact support.';
            throw roleError;
          }
          
          // Re-throw with better error message
          const finalErrorMessage = errorDetails.responseError || 
                                   errorDetails.errorMessage || 
                                   apiError?.message || 
                                   'Apple Sign-In failed';
          const finalError = new Error(finalErrorMessage);
          (finalError as any).code = apiError?.code;
          (finalError as any).originalError = apiError;
          throw finalError;
        }
      } else {
        // Fallback to direct fetch for older API client versions
        const requestBody: any = {
          accessToken: accessToken,
          ...(finalCategory && { category: finalCategory }),
          ...(finalRole && { primary_role: finalRole }),
        };
        
        const response = await fetch(`${baseUrl}/api/auth/apple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          const { errorMessage } = parseAuthErrorResponse(
            responseText,
            `HTTP ${response.status}: ${response.statusText}`
          );
          
          // Check if error is about missing category
          if (isCategoryRequiredError(errorMessage)) {
            throw createCategoryRequiredError();
          }
          
          throw new Error(errorMessage);
        }

        // Parse response
        authResponse = parseAuthResponseJson(responseText);
        
        const extractedPayload = extractAuthPayload(authResponse);
        userData = extractedPayload.userData;
        token = extractedPayload.token;
      }
      
      if (!userData) {
        throw new Error('Apple Sign-In response missing user data');
      }
      
      if (!token) {
        throw new Error('Apple Sign-In response missing authentication token');
      }
      
      await clearOAuthPendingState();
      await clearAllAuthData();
      await clearPasswordResetFlag();
      await persistAuthSession(api as any, token, userData);

      runPostAuthSetup(userData);
      
      return {
        user: userData,
        token: token,
      } as AuthResponse;
      
    } catch (err: any) {
      console.error('  Apple Sign-In failed:', err);
      
      await clearOAuthPendingStateOnError(err);
      
      // Don't set error state for category required - let UI handle it
      if (err.code === 'CATEGORY_REQUIRED') {
        throw err;
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message || 'Apple Sign-In failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear token refresh callback
    pushNotificationService.clearTokenRefreshCallback();
    setIsLoading(true);
    try {
      // Disconnect StreamChat
      try {
        await streamChatService.disconnectUser();
        console.log('    StreamChat disconnected');
      } catch (streamError) {
        console.warn('   Failed to disconnect StreamChat (non-critical):', streamError);
      }
      
      // Unsubscribe from real-time notifications
      forceUnsubscribeNotificationsRef.current();
      
      // Unregister push notification token from backend before clearing
      try {
        const currentToken = await pushNotificationService.getStoredToken();
        if (currentToken) {
          console.log('    Unregistering push token from backend...');
          await api.pushNotifications.unregisterDeviceToken(currentToken);
          console.log('    Push token unregistered from backend');
        }
      } catch (tokenError) {
        console.warn('   Failed to unregister push token (non-critical):', tokenError);
      }
      
      // Clear push notification token locally
      await pushNotificationService.clearToken();
      await pushNotificationService.setBadgeCount(0);
      
      // Try to call logout API, but don't fail if token is invalid
      try {
        await api.auth.logout();
      } catch (logoutError: any) {
        // If logout fails due to invalid token, that's expected - continue with cleanup
        const isInvalidToken = logoutError?.status === 401 || 
                              logoutError?.statusCode === 401 ||
                              (logoutError?.message || logoutError?.error || '').toLowerCase().includes('invalid token');
        if (isInvalidToken) {
          console.log('   Logout API call failed due to invalid token (expected) - continuing with cleanup');
        } else {
          console.warn('   Logout API call failed (non-critical):', logoutError);
        }
      }
      
      // Clear all auth data (including tokens from API client)
      await clearAllAuthData();
      
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      // Clear notification state
      setNotifications([]);
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Logout failed:', err);
      
      // Always clear all auth data, even on error
      try {
        await clearAllAuthData();
      } catch (clearError) {
        console.error('  Error clearing auth data during logout:', clearError);
      }
      
      // Clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      setNotifications([]);
      setUnreadNotificationCount(0);
      
      // Unsubscribe from real-time notifications on error
      forceUnsubscribeNotificationsRef.current();
      
      // Try to unregister token even on error
      try {
        const currentToken = await pushNotificationService.getStoredToken();
        if (currentToken) {
          await api.pushNotifications.unregisterDeviceToken(currentToken);
        }
      } catch (tokenError) {
        // Ignore token unregistration errors during logout
      }
      
      // Clear push notification token even on error
      await pushNotificationService.clearToken();
      await pushNotificationService.setBadgeCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Request password reset (sends OTP to email)
  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📧 Requesting password reset OTP for:', email);
      console.log('📧 API client instance:', api);
      console.log('📧 API auth methods:', Object.keys(api.auth || {}));
      
      // Check if the method exists
      if (!api.auth || typeof api.auth.requestPasswordReset !== 'function') {
        const errorMsg = 'Password reset method not available. Please check API client version.';
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const response = await api.auth.requestPasswordReset(email);
      console.log('📧 API Response:', response);
      console.log('    Password reset OTP sent successfully');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send reset email. Please try again.';
      console.error('  Password reset request failed:', err);
      console.error('  Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP code and get reset token
  const verifyResetOtp = async (email: string, otpCode: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Verifying OTP code for:', email);
      console.log('🔐 API client instance:', api);
      console.log('🔐 API auth methods:', Object.keys(api.auth || {}));
      
      // Check if the method exists
      if (!api.auth) {
        const errorMsg = 'API auth object not available. Please check API client initialization.';
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // The method exists in the API client source code, but may not be enumerable
      // Try multiple ways to call it
      let result;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly (even if typeof says undefined, it might work)
      try {
        console.log('    Attempting to call authService.verifyResetOtp() directly');
        result = await authService.verifyResetOtp(email.trim().toLowerCase(), otpCode);
        console.log('    API client method call successful');
      } catch (directCallError: any) {
        console.log('   Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifyResetOtp === 'function') {
            console.log('    Calling via prototype');
            result = await prototype.verifyResetOtp.call(authService, email.trim().toLowerCase(), otpCode);
            console.log('    Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('   Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly (this should work)
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('    Using apiClient.post directly');
            try {
              const response = await apiClient.post('/api/auth/verify-reset-otp', {
                email: email.trim().toLowerCase(),
                token: otpCode
              });
              
              console.log('📥 apiClient.post response:', response);
              
              if (response.success && response.data) {
                result = { resetToken: response.data.resetToken || response.data.reset_token };
              } else {
                throw new Error(response.error || 'OTP verification failed');
              }
            } catch (apiClientError: any) {
              console.error('  apiClient.post failed:', apiClientError);
              
              // If 404, the backend route isn't deployed yet
              if (apiClientError.message?.includes('404') || apiClientError.message?.includes('not found')) {
                throw new Error('The OTP verification endpoint is not available on the deployed backend. The route exists in the backend code but needs to be deployed. Please contact your backend team to deploy the latest code with the /api/auth/verify-reset-otp endpoint.');
              }
              
              throw apiClientError;
            }
          } else {
            throw new Error('apiClient.post not available');
          }
        }
      }
      
      console.log('🔐 API Response:', result);
      console.log('    OTP verified successfully, reset token obtained');
      
      // Ensure result has resetToken
      if (!result || !result.resetToken) {
        throw new Error('Invalid response: resetToken not found');
      }
      
      return result; // Returns { resetToken: "..." }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('  OTP verification failed:', err);
      console.error('  Error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Confirm password reset using reset token (not OTP code)
  const resetPassword = async (resetToken: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('    Confirming password reset with reset token');
      
      // API client has a bug - it sends "token" instead of "resetToken"
      // Use direct API call with correct field name
      const apiBaseUrl = (api as any).baseUrl || baseUrl;
      const confirmUrl = `${apiBaseUrl}/api/auth/confirm-reset-password`;
      
      console.log('🌐 Making direct API call to:', confirmUrl);
      console.log('📤 Request payload:', { resetToken, newPassword });
      
      const response = await fetch(confirmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetToken: resetToken, // Backend expects resetToken, not token
          newPassword: newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('    Password reset successfully:', responseData);
      
      // Password reset invalidates all sessions - clear auth state completely
      console.log('🧹 Clearing auth state after password reset...');
      
      // Stop heartbeat and background processes first
      stopHeartbeatRef.current();
      
      // Clear local auth state first
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear notifications and subscriptions
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadConversationCount(0);
      
      // Unsubscribe from real-time notifications
      forceUnsubscribeNotificationsRef.current();
      
      // Clear push notification token
      await pushNotificationService.clearToken().catch(() => {});
      await pushNotificationService.setBadgeCount(0).catch(() => {});
      
      // Clear ALL authentication data from all storage locations
      await clearAllAuthData();
      
      // Set password reset flag to prevent token restoration on next app start
      try {
        await AsyncStorage.setItem('passwordResetFlag', 'true');
        console.log('    Password reset flag set - tokens will not be restored on next app start');
      } catch (err) {
        console.warn('   Failed to set password reset flag:', err);
      }
      
      // Try logout API call (may fail since token is invalidated, that's OK)
      try {
        await api.auth.logout().catch(() => {
          console.log('   Logout API call failed (expected - token already invalidated)');
        });
      } catch (err) {
        console.log('   Error during logout API call (non-critical):', err);
      }
      
      console.log('    Auth state cleared - user must sign in with new password');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to reset password';
      const statusCode = err.status || err.response?.status || err.statusCode;
      
      console.error('  Password reset confirmation failed:', err);
      console.error('  Error details:', {
        message: errorMessage,
        status: statusCode,
        response: err.response,
      });
      
      // Handle rate limiting (429)
      if (statusCode === 429 || errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many')) {
        const retryAfter = err.response?.headers?.['retry-after'] || err.retryAfter || 60;
        const minutes = Math.ceil(retryAfter / 60);
        const rateLimitError = `Too many password reset attempts. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.`;
        setError(rateLimitError);
        throw new Error(rateLimitError);
      }
      
      // Handle token expiration/invalid errors
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
        const tokenError = 'The reset token has expired or is invalid. Please request a new password reset.';
        setError(tokenError);
        throw new Error(tokenError);
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifySignupOtp = async (email: string, token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Verifying signup OTP code for:', email);
      
      // Check if the method exists
      if (!api.auth) {
        const errorMsg = 'API auth object not available. Please check API client initialization.';
        console.error(' ', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Try multiple ways to call verifySignupOtp (similar to verifyResetOtp)
      let authResponse: any;
      const authService = api.auth as any;
      
      // Method 1: Try calling directly
      try {
        if (typeof authService.verifySignupOtp === 'function') {
          console.log('    Attempting to call authService.verifySignupOtp() directly');
          authResponse = await authService.verifySignupOtp(email.trim().toLowerCase(), token);
          console.log('    API client method call successful');
        } else {
          throw new Error('Method not available directly');
        }
      } catch (directCallError: any) {
        console.log('   Direct call failed, trying via prototype:', directCallError.message);
        
        // Method 2: Try calling via prototype
        try {
          const prototype = Object.getPrototypeOf(authService);
          if (prototype && typeof prototype.verifySignupOtp === 'function') {
            console.log('    Calling via prototype');
            authResponse = await prototype.verifySignupOtp.call(authService, email.trim().toLowerCase(), token);
            console.log('    Prototype call successful');
          } else {
            throw new Error('Method not found on prototype');
          }
        } catch (prototypeError: any) {
          console.log('   Prototype call failed, using apiClient.post:', prototypeError.message);
          
          // Method 3: Use apiClient.post directly
          const apiClient = authService?.apiClient || (api as any).apiClient;
          if (apiClient && typeof apiClient.post === 'function') {
            console.log('    Using apiClient.post directly for verify-signup-otp');
            try {
              const response = await apiClient.post('/api/auth/verify-signup-otp', {
                email: email.trim().toLowerCase(),
                token: token
              });
              
              console.log('📥 apiClient.post response:', response);
              
              if (response.success && response.data) {
                authResponse = response.data;
              } else {
                throw new Error(response.error || response.message || 'OTP verification failed');
              }
            } catch (apiClientError: any) {
              console.error('  apiClient.post failed:', apiClientError);
              
              // If 404, the backend route isn't deployed yet
              if (apiClientError.message?.includes('404') || apiClientError.message?.includes('not found')) {
                throw new Error('The signup OTP verification endpoint is not available on the deployed backend. Please contact your backend team to deploy the latest code with the /api/auth/verify-signup-otp endpoint.');
              }
              
              throw apiClientError;
            }
          } else {
            throw new Error('apiClient.post not available and verifySignupOtp method not found');
          }
        }
      }
      
      console.log('    Signup OTP verified successfully:', authResponse);
      
      // IMPORTANT: Save the token and user data to SecureStore
      // This is the ONLY place where we save auth data - NOT during signup, ONLY after OTP verification
      if (authResponse.token || authResponse.access_token) {
        const token = authResponse.token || authResponse.access_token;
        const userData = authResponse.user;
        
        if (token && userData) {
          console.log('    Storing access token and user data after OTP verification');
          
          // Clear any existing tokens before storing new ones
          await clearAllAuthData();
          
          // Use the AuthService's setAuthData method to properly store the token
          if (typeof authService.setAuthData === 'function') {
            console.log('    Using AuthService.setAuthData to store token...');
            await authService.setAuthData({
              token: token,
              user: userData
            });
          } else {
            // Fallback: Set the auth token in the API client directly
            if ((api as any).apiClient && typeof (api as any).apiClient.setAuthToken === 'function') {
              (api as any).apiClient.setAuthToken(token);
            }
            
            // Also store in the auth service for compatibility
            if (authService) {
              authService.authToken = token;
              authService.token = token;
              authService.accessToken = token;
              authService.currentUser = userData;
            }
          }
          
          // Update API client headers
          if ((api as any).apiClient) {
            if (!(api as any).apiClient.defaultHeaders) {
              (api as any).apiClient.defaultHeaders = {};
            }
            (api as any).apiClient.defaultHeaders['Authorization'] = `Bearer ${token}`;
            console.log('    API client headers updated with new token');
          }
          
          console.log('    Token has been saved to SecureStore');
        }
      }
      
      // Set user and authenticate after successful verification
      if (authResponse.user) {
        setUser(authResponse.user);
        setIsAuthenticated(true);
        console.log('    User authenticated after OTP verification - token is now saved');
        return authResponse;
      } else {
        throw new Error('User data not found in response');
      }
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Invalid or expired OTP code. Please try again.';
      console.error('  Signup OTP verification failed:', err);
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, token: string, type?: "signup" | "email_change") => {
    setIsLoading(true);
    setError(null);
    try {
      // New library version (v2.14.0) signature: verifyEmail(token: string, type?: 'signup' | 'email_change')
      // The email is not needed as a parameter - it's encoded in the token or handled by backend
      // Note: For signup verification, use verifySignupOtp instead
      await api.auth.verifyEmail(token, type);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify email';
      setError(errorMessage);
      
      // Handle token expiration
      if (errorMessage.toLowerCase().includes('token') || errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
        throw new Error('The verification link has expired or is invalid. Please request a new verification email.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.resendVerificationEmail(email);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to resend verification email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      
      // Password change invalidates all sessions - log out user
      console.log('🔐 Password changed - invalidating session');
      await logout();
      
      // Show message that user needs to log in again
      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully. Please sign in again with your new password.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      
      // Handle current password mismatch
      if (errorMessage.toLowerCase().includes('current password') || errorMessage.toLowerCase().includes('incorrect password')) {
        throw new Error('Current password is incorrect. Please try again.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Account deletion methods (v2.17.0)
  const requestAccountDeletion = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🗑️ Requesting account deletion with grace period');
      const response = await api.requestAccountDeletion(password);
      
      if (response.success && response.data) {
        console.log('    Account deletion requested successfully');
        console.log('📅 Expiration date:', response.data.expirationDate);
        console.log('⏰ Days remaining:', response.data.daysRemaining);
        
        return {
          expirationDate: response.data.expirationDate,
          daysRemaining: response.data.daysRemaining,
        };
      } else {
        throw new Error('Failed to request account deletion');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to request account deletion';
      console.error('  Account deletion request failed:', err);
      setError(errorMessage);
      
      // Handle password mismatch
      if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('incorrect')) {
        throw new Error('Password is incorrect. Please try again.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const restoreAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('♻️ Restoring account from deletion');
      const response = await api.restoreAccount();
      
      if (response.success) {
        console.log('    Account restored successfully');
      } else {
        throw new Error('Failed to restore account');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore account';
      console.error('  Account restoration failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const getAccountDeletionStatus = useCallback(async () => {
    // Don't set global loading state for read operations - let the component handle its own loading
    try {
      console.log('📊 Checking account deletion status');
      const response = await api.getAccountDeletionStatus();
      
      if (response.success && response.data) {
        console.log('    Account deletion status retrieved');
        return {
          isPending: response.data.isPending,
          expirationDate: response.data.expirationDate,
          daysRemaining: response.data.daysRemaining,
        };
      } else {
        throw new Error('Failed to get account deletion status');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get account deletion status';
      console.error('  Failed to get account deletion status:', err);
      // Don't set global error for read operations - let the component handle errors
      throw err;
    }
  }, [api]);

  // Helper function to get access token
  const getAccessToken = () => {
    try {
      let accessToken = '';
      
      // First, try the AuthService's getAuthToken method
      if ((api as any).auth && typeof (api as any).auth.getAuthToken === 'function') {
        accessToken = (api as any).auth.getAuthToken();
        console.log('    Token from AuthService.getAuthToken():', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      // Fallback: Check API client's stored token
      if (!accessToken && (api as any).apiClient && (api as any).apiClient.defaultHeaders) {
        const authHeader = (api as any).apiClient.defaultHeaders['Authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          accessToken = authHeader.substring(7);
          console.log('    Token from API client headers:', accessToken.substring(0, 20) + '...');
        }
      }
      
      // Fallback: Check auth service properties
      if (!accessToken) {
        accessToken = (api as any).auth?.authToken || 
                     (api as any).auth?.token || 
                     (api as any).auth?.accessToken || 
                     (api as any).token || 
                     (api as any).getToken?.() || 
                     '';
        console.log('    Token from auth service properties:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
      }
      
      if (!accessToken) {
        console.error('  No access token found in any location');
        throw new Error('Access token not found. Please log in again.');
      }
      
      console.log('    Access token found:', accessToken.substring(0, 20) + '...');
      return accessToken;
    } catch (tokenError) {
      console.error('  Failed to get access token:', tokenError);
      throw new Error('Access token required. Please log in again.');
    }
  };


  return {
    getAccessToken,
    handle401Error,
    testConnectivity,
    registerPushToken,
    initializeApi,
    login,
    signup,
    googleSignIn,
    appleSignIn,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    verifySignupOtp,
    verifyEmail,
    resendVerificationEmail,
    changePassword,
    requestAccountDeletion,
    restoreAccount,
    getAccountDeletionStatus,
  };
}
