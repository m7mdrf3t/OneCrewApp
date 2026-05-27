import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from 'onecrew-api-client';
import streamChatService from '../services/StreamChatService';
import { rateLimiter } from '../utils/rateLimiter';

interface UseProfileSwitchParams {
  user: User | null;
  activeCompany: any;
  currentProfileType: string;
  setActiveCompany: (company: any) => void;
  setCurrentProfileType: (type: 'user' | 'company') => void;
  setUnreadConversationCount: (count: number) => void;
  getStreamChatToken: (params: any) => Promise<any>;
  getUnreadConversationCount: () => Promise<any>;
  getCompany: (id: string, options?: any) => Promise<any>;
  getUserCompanies: (userId: string, forceRefresh?: boolean) => Promise<any>;
}

export function useProfileSwitch({
  user,
  activeCompany,
  currentProfileType,
  setActiveCompany,
  setCurrentProfileType,
  setUnreadConversationCount,
  getStreamChatToken,
  getUnreadConversationCount,
  getCompany,
  getUserCompanies,
}: UseProfileSwitchParams) {
  const switchToUserProfile = useCallback(async () => {
    try {
      console.log('🔄 [ProfileSwitch] Switching to user profile...');

      // Clear conversation cache for the previous profile
      const previousProfileType = currentProfileType;
      const previousProfileId = previousProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      if (previousProfileId) {
        // Clear all conversation-related cache entries
        const cachePatterns = [
          `conversations-company-${previousProfileId}`,
          `conversations-user-${previousProfileId}`,
        ];
        for (const pattern of cachePatterns) {
          await rateLimiter.clearCache(pattern);
        }
      }

      // FIXED: Reset unread count when switching profiles
      setUnreadConversationCount(0);

      // Update state first (synchronously)
      setCurrentProfileType('user');
      setActiveCompany(null);

      // Update AsyncStorage (non-blocking)
      AsyncStorage.setItem('currentProfileType', 'user').catch(err => {
        console.warn('   Failed to save profile type to storage:', err);
      });
      AsyncStorage.removeItem('activeCompanyId').catch(err => {
        console.warn('   Failed to remove company ID from storage:', err);
      });

      // Reconnect StreamChat with user profile (non-blocking, don't throw)
      if (user?.id) {
        // Use setTimeout to defer reconnection slightly, allowing state updates to propagate
        setTimeout(async () => {
          try {
            const streamTokenResponse = await getStreamChatToken({ profile_type: 'user' });
            if (streamTokenResponse.success && streamTokenResponse.data) {
              const { token, user_id, api_key } = streamTokenResponse.data as any;
              // Use user_id from token response (backend knows the correct StreamChat user ID format)
              await streamChatService.reconnectUser(
                user_id, // Use user_id from token, not mapped OneCrew ID
                token,
                {
                  name: user.name,
                  image: user.image_url,
                },
                api_key, // Pass API key from backend if provided
                'user' // User type for tracking
              );
              console.log('    StreamChat reconnected with user profile');

              // FIXED: Update unread count after reconnection for new profile
              // The unread count tracking useEffect will handle this automatically
              // But we can trigger it manually for faster updates
              setTimeout(async () => {
                try {
                  // The useEffect will call updateUnreadCount automatically
                  // But we can also call getConversations to ensure it's updated
                  await getUnreadConversationCount();
                  if (__DEV__) {
                    console.log('    [ProfileSwitch] Updated unread count after switch to user profile');
                  }
                } catch (err) {
                  console.warn('   Failed to update unread count after profile switch:', err);
                }
              }, 500); // Wait for StreamChat to be fully connected
            }
          } catch (streamError: any) {
            // Don't throw - just log the error
            console.warn('   Failed to reconnect StreamChat (non-critical):', streamError?.message || streamError);
            // StreamChatProvider will handle reconnection automatically
          }
        }, 100); // Small delay to allow state updates
      }

      // FIXED: Also update unread count immediately (before StreamChat reconnects)
      // Use lightweight endpoint for instant update
      setTimeout(async () => {
        try {
          await getUnreadConversationCount();
          if (__DEV__) {
            console.log('    [ProfileSwitch] Updated unread count immediately after switch to user profile');
          }
        } catch (err) {
          console.warn('   Failed to update unread count immediately after profile switch:', err);
        }
      }, 200);

      console.log('    Switched to user profile');
    } catch (error: any) {
      // CRITICAL: Never throw errors during profile switch - this can cause app restarts
      console.error('  Error switching to user profile (recovered):', error?.message || error);
      // Still update state even if there's an error
      setCurrentProfileType('user');
      setActiveCompany(null);
    }
  }, [user, activeCompany, currentProfileType, setActiveCompany, setCurrentProfileType, setUnreadConversationCount, getStreamChatToken, getUnreadConversationCount]);

  const switchToCompanyProfile = useCallback(async (companyId: string) => {
    try {
      // Verify user is owner or admin of this company before allowing switch
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // CRITICAL: Force refresh company list to ensure we have latest membership data
      // This prevents switching to companies the user no longer has access to
      console.log('🔄 [ProfileSwitch] Refreshing company list to verify membership...');
      const userCompaniesResponse = await getUserCompanies(user.id, true); // Force refresh

      // Extract company data from company list for fallback (name, logo_url)
      // This ensures avatar updates even if getCompany times out
      let fallbackCompanyData: { name?: string; logo_url?: string } = {};

      if (userCompaniesResponse.success && userCompaniesResponse.data) {
        const responseData = userCompaniesResponse.data as any;
        const companies = Array.isArray(responseData)
          ? responseData
          : (responseData.data || []);

        // Find the company and check if user is owner or admin
        const companyMember = companies.find((cm: any) => {
          const cmCompanyId = cm.companies?.id || cm.company_id || cm.id;
          return cmCompanyId === companyId;
        });

        if (!companyMember) {
          // User is not a member - don't switch, just return
          console.warn('   [ProfileSwitch] Company not found in user companies list - user may have lost access');
          throw new Error('Company not found in your companies list. You may no longer have access to this company.');
        }

        const role = companyMember.role || companyMember.member?.role;
        if (role !== 'owner' && role !== 'admin') {
          // User is not owner/admin - don't switch
          console.warn('   [ProfileSwitch] User is not owner/admin of company');
          throw new Error('Only company owners and admins can switch to company profiles');
        }

        // Extract company data from companyMember for fallback (name, logo_url)
        const companyFromList = companyMember.companies || companyMember;
        fallbackCompanyData = {
          name: companyFromList.name,
          logo_url: companyFromList.logo_url,
        };

        console.log('    [ProfileSwitch] Membership verified - user is', role, 'of company');
        console.log('📦 [ProfileSwitch] Fallback data available:', {
          hasName: !!fallbackCompanyData.name,
          hasLogo: !!fallbackCompanyData.logo_url
        });
      } else {
        // If we can't verify membership, don't switch
        console.warn('   [ProfileSwitch] Could not verify company membership');
        throw new Error('Could not verify company membership. Please try again.');
      }

      // Clear conversation cache for the previous profile
      const previousProfileType = currentProfileType;
      const previousProfileId = previousProfileType === 'company' && activeCompany ? activeCompany.id : user?.id;
      if (previousProfileId) {
        // Clear all conversation-related cache entries
        const cachePatterns = [
          `conversations-company-${previousProfileId}`,
          `conversations-user-${previousProfileId}`,
        ];
        for (const pattern of cachePatterns) {
          await rateLimiter.clearCache(pattern);
        }
      }

      // OPTIMIZATION: Use company list data immediately, then enhance with getCompany in background
      // This ensures instant profile switch (< 100ms) while full data loads in background
      let companyData: any = {
        id: companyId,
        name: fallbackCompanyData.name,
        logo_url: fallbackCompanyData.logo_url,
        // Use company list data immediately - no waiting for getCompany
      };

      // Update state IMMEDIATELY with company list data (no waiting)
      setActiveCompany(companyData);
      setCurrentProfileType('company');

      // Update AsyncStorage (non-blocking)
      AsyncStorage.setItem('currentProfileType', 'company').catch(err => {
        console.warn('   Failed to save profile type to storage:', err);
      });
      AsyncStorage.setItem('activeCompanyId', companyId).catch(err => {
        console.warn('   Failed to save company ID to storage:', err);
      });

      console.log('    [ProfileSwitch] Profile switched immediately with company list data:', {
        companyId,
        hasName: !!companyData.name,
        hasLogo: !!companyData.logo_url
      });

      // Enhance company data in background (non-blocking)
      // Only fetch if we need additional fields beyond what company list provides
      (async () => {
        try {
          // Reduced timeout to 3 seconds for faster failover
          const getCompanyPromise = getCompany(companyId, {
            fields: ['id', 'name', 'logo_url', 'subcategory', 'approval_status']
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 3000); // Reduced from 10s to 3s
          });

          const companyResponse = await Promise.race([getCompanyPromise, timeoutPromise]) as any;

          if (companyResponse.success && companyResponse.data) {
            // Enhance company data with fresh data from getCompany
            const enhancedData = companyResponse.data;
            // Always update to ensure we have the latest data, but preserve logo_url from company list if getCompany doesn't have it
            setActiveCompany({
              ...companyData, // Start with company list data (includes logo_url)
              ...enhancedData, // Merge fresh data from getCompany
              // Preserve logo_url from company list if getCompany doesn't return it
              logo_url: enhancedData.logo_url || companyData.logo_url,
              // Preserve name from company list if getCompany doesn't return it
              name: enhancedData.name || companyData.name,
            });
            console.log('    [ProfileSwitch] Company data enhanced with fresh data', {
              hasLogo: !!(enhancedData.logo_url || companyData.logo_url),
              hasName: !!(enhancedData.name || companyData.name),
            });
          }
        } catch (timeoutError: any) {
          // getCompany failed or timed out - that's OK, we already have company list data
          console.log('ℹ️ [ProfileSwitch] getCompany not available (using company list data):', timeoutError?.message || timeoutError);
          // Don't log as warning - this is expected and acceptable
        }
      })(); // Execute in background, don't wait

      // Reconnect StreamChat with company profile immediately (parallel with state update)
      // StreamChatProvider will also handle reconnection, but we do it here for faster response
      (async () => {
        try {
          console.log('🔄 [ProfileSwitch] Reconnecting StreamChat with company profile...');
          const streamTokenResponse = await getStreamChatToken({
            profile_type: 'company',
            company_id: companyId
          });
          if (streamTokenResponse.success && streamTokenResponse.data) {
            const { token, user_id, api_key } = streamTokenResponse.data as any;
            // Use user_id from token response (backend knows the correct StreamChat user ID format)
            await streamChatService.reconnectUser(
              user_id, // Use user_id from token, not mapped OneCrew ID
              token,
              {
                name: companyData.name || 'Company', // Fallback if name not loaded
                image: companyData.logo_url || undefined, // Only set if available
              },
              api_key, // Pass API key from backend if provided
              'company' // User type for tracking
            );
            console.log('    [ProfileSwitch] StreamChat reconnected with company profile', {
              user_id,
              hasName: !!companyData.name,
              hasLogo: !!companyData.logo_url
            });

            // FIXED: Update unread count after reconnection for new profile
            // Use lightweight endpoint for instant update
            setTimeout(async () => {
              try {
                await getUnreadConversationCount();
                if (__DEV__) {
                  console.log('    [ProfileSwitch] Updated unread count after switch to company profile');
                }
              } catch (err) {
                console.warn('   Failed to update unread count after profile switch:', err);
              }
            }, 500); // Wait for StreamChat to be fully connected
          }
        } catch (streamError: any) {
          // Check if error is about membership - this means user lost access
          const errorMessage = streamError?.message || streamError?.toString() || '';
          const isMembershipError = errorMessage.includes('must be a member') ||
                                   errorMessage.includes('member of this company') ||
                                   errorMessage.includes('not a member');

          if (isMembershipError) {
            // User lost access - revert to user profile
            console.warn('   [ProfileSwitch] User lost access to company - reverting to user profile');
            // Revert profile switch
            setCurrentProfileType('user');
            setActiveCompany(null);
            AsyncStorage.setItem('currentProfileType', 'user').catch(() => {});
            AsyncStorage.removeItem('activeCompanyId').catch(() => {});
            // Don't log as error - this is expected if user lost access
          } else {
            // Other errors - don't throw, just log
            console.warn('   Failed to reconnect StreamChat (non-critical):', streamError?.message || streamError);
          }
          // StreamChatProvider will handle reconnection automatically
        }
      })(); // Execute immediately, don't wait

      // FIXED: Also update unread count immediately (before StreamChat reconnects)
      // Use lightweight endpoint for instant update
      setTimeout(async () => {
        try {
          await getUnreadConversationCount();
          if (__DEV__) {
            console.log('    [ProfileSwitch] Updated unread count immediately after switch to company profile');
          }
        } catch (err) {
          console.warn('   Failed to update unread count immediately after profile switch:', err);
        }
      }, 200);
    } catch (error: any) {
      // CRITICAL: Never throw errors during profile switch - this can cause app restarts
      const errorMessage = error?.message || error?.toString() || '';
      const isMembershipError = errorMessage.includes('not found in your companies') ||
                               errorMessage.includes('no longer have access') ||
                               errorMessage.includes('not owner/admin') ||
                               errorMessage.includes('Could not verify');

      if (isMembershipError) {
        // User doesn't have access - don't switch, stay on current profile
        console.warn('   [ProfileSwitch] Cannot switch to company - membership issue:', errorMessage);
        // Don't update state - stay on current profile
        // Clear any partial state
        if (activeCompany?.id === companyId) {
          // If we were already on this company, switch back to user
          setCurrentProfileType('user');
          setActiveCompany(null);
          AsyncStorage.setItem('currentProfileType', 'user').catch(() => {});
          AsyncStorage.removeItem('activeCompanyId').catch(() => {});
        }
      } else {
        // Other errors - log but don't block
        console.error('  Error switching to company profile (recovered):', errorMessage);
      }
      // Don't throw - let the UI handle the error gracefully
    }
  }, [user, activeCompany, currentProfileType, setActiveCompany, setCurrentProfileType, getStreamChatToken, getUnreadConversationCount, getCompany, getUserCompanies]);

  return { switchToUserProfile, switchToCompanyProfile };
}
