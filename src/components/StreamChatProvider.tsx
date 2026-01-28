/**
 * StreamChat Provider Wrapper
 * 
 * Provides StreamChat context to the app when user is authenticated.
 * This component wraps the chat-related screens with StreamChat's ChatProvider.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Chat, OverlayProvider } from 'stream-chat-react-native';
import { useApi } from '../contexts/ApiContext';
import streamChatService from '../services/StreamChatService';
import { getStreamChatTheme } from '../themes/streamChatTheme';
import streamChatConnectionMonitor from '../utils/StreamChatConnectionMonitor';
// Import helper to expose monitor to console
import '../utils/StreamChatMonitorHelper';

interface StreamChatProviderProps {
  children: React.ReactNode;
}

type StreamChatReadyContextValue = { clientReady: boolean };
const StreamChatReadyContext = createContext<StreamChatReadyContextValue>({ clientReady: false });

export const useStreamChatReady = (): StreamChatReadyContextValue =>
  useContext(StreamChatReadyContext) ?? { clientReady: false };

export const StreamChatProvider: React.FC<StreamChatProviderProps> = ({ children }) => {
  const { isAuthenticated, user, currentProfileType, activeCompany, getStreamChatToken } = useApi();
  const [clientReady, setClientReady] = useState(false);
  const [client, setClient] = useState<ReturnType<typeof streamChatService.getClient> | null>(null);

  useEffect(() => {
    // Start monitoring on mount
    streamChatConnectionMonitor.startMonitoring();
    
    const initializeStreamChat = async () => {
      // CRITICAL: Don't initialize StreamChat during Google Sign-In flow
      // Wait until user is fully authenticated and has an ID
      if (!isAuthenticated || !user || !user.id) {
        console.log('💬 [StreamChatProvider] Not authenticated or no user ID, skipping initialization');
        setClientReady(false);
        setClient(null);
        return;
      }
      if (!user.email) {
        console.log('💬 [StreamChatProvider] User email not available yet, skipping initialization (likely during sign-in)');
        setClientReady(false);
        setClient(null);
        return;
      }

      try {
        console.log('💬 [StreamChatProvider] Initializing StreamChat...');
        const isConnected = streamChatService.isConnected();
        const currentConnectedUserId = streamChatService.getCurrentUserId();
        let c: ReturnType<typeof streamChatService.getClient> | null = null;
        try {
          c = streamChatService.getClient();
        } catch (e) {
          console.warn('💬 [StreamChatProvider] getClient failed (no API key?):', (e as Error)?.message);
        }
        console.log('💬 [StreamChatProvider] Client status:', {
          hasClient: !!c,
          isConnected,
          clientUserId: currentConnectedUserId ?? null,
          currentProfileType,
          activeCompanyId: activeCompany?.id,
        });
        
        // Always fetch token to get expected user ID for current profile
        console.log('💬 [StreamChatProvider] Fetching token for current profile...', {
          currentProfileType,
          activeCompanyId: activeCompany?.id,
        });
        
        // Pass profile type and company ID to get the correct token
        const tokenOptions = currentProfileType === 'company' && activeCompany?.id
          ? { profile_type: 'company' as const, company_id: activeCompany.id }
          : { profile_type: 'user' as const };
        
        const tokenResponse = await getStreamChatToken(tokenOptions);
        console.log('💬 [StreamChatProvider] Token response:', {
          success: tokenResponse.success,
          hasData: !!tokenResponse.data,
          hasToken: !!(tokenResponse.data as any)?.token,
          hasUserId: !!(tokenResponse.data as any)?.user_id,
          hasApiKey: !!(tokenResponse.data as any)?.api_key,
        });
        
        if (!tokenResponse.success || !tokenResponse.data) {
          // Check if error is about company membership - this is expected if user lost access
          const errorMessage = (tokenResponse as any)?.error || (tokenResponse as any)?.message || '';
          const isMembershipError = errorMessage.includes('must be a member') || 
                                   errorMessage.includes('member of this company') ||
                                   errorMessage.includes('not a member');
          
          if (isMembershipError) {
            console.log('💬 [StreamChatProvider] Company membership error (user may have lost access) - skipping StreamChat initialization');
            setClientReady(false);
            setClient(c);
            return;
          }
          console.warn('⚠️ [StreamChatProvider] Token response failed (non-critical):', tokenResponse);
          setClientReady(false);
          setClient(c);
          return;
        }
        const { token, user_id: expectedUserId, api_key } = tokenResponse.data as any;
        const needsReconnect = !isConnected || currentConnectedUserId !== expectedUserId;
        console.log('💬 [StreamChatProvider] Token details:', {
          expectedUserId,
          currentConnectedUserId,
          profileType: currentProfileType,
          companyId: activeCompany?.id,
          needsReconnect,
        });
        
        // OPTIMIZED: If already connected to correct user, set ready immediately for instant connection
        if (!needsReconnect && isConnected && currentConnectedUserId === expectedUserId) {
          console.log('✅ [StreamChatProvider] Already connected to correct user - instant ready');
          // Verify SDK is ready (quick check)
          let actuallyReady = false;
          try {
            const testClient = streamChatService.getClient();
            const testUserId = testClient?.userID;
            if (testUserId === expectedUserId && typeof testClient.queryChannels === 'function') {
              actuallyReady = true;
            }
          } catch (e) {
            console.warn('⚠️ [StreamChatProvider] Quick verification failed, will reconnect');
          }
          
          if (actuallyReady) {
            setClientReady(true);
            try {
              setClient(streamChatService.getClient());
            } catch (e) {
              setClient(null);
              setClientReady(false);
            }
            return; // Skip reconnection - instant!
          }
        }
        
        if (needsReconnect) {
          // Monitor: Log profile switch
          const fromProfile = currentConnectedUserId ? 
            (currentProfileType === 'company' ? `company-${activeCompany?.id}` : 'user') : 'none';
          const toProfile = currentProfileType === 'company' ? 
            `company-${activeCompany?.id}` : 'user';
          streamChatConnectionMonitor.logProfileSwitch(
            fromProfile,
            toProfile,
            activeCompany?.id
          );
          
          if (isConnected && currentConnectedUserId !== expectedUserId) {
            console.log('🔄 [StreamChatProvider] Profile changed, reconnecting...', {
              currentUserId: currentConnectedUserId,
              expectedUserId,
            });
          } else {
            console.log('💬 [StreamChatProvider] Client not connected, connecting...');
          }
          
          // Use user_id from token response (backend knows the correct StreamChat user ID format)
          const userType = currentProfileType === 'company' ? 'company' : 'user';
          const userData = currentProfileType === 'company' && activeCompany
            ? { name: activeCompany.name, image: activeCompany.logo_url }
            : { name: user.name, image: user.image_url };

          console.log('💬 [StreamChatProvider] Connecting user...', {
            userId: expectedUserId,
            userType,
            hasApiKey: !!api_key,
          });
          
          await streamChatService.connectUser(expectedUserId, token, userData, api_key, userType);
          const connected = streamChatService.isConnected();
          const finalUserId = streamChatService.getCurrentUserId();
          console.log('💬 [StreamChatProvider] Connection result:', {
            connected,
            clientUserId: finalUserId,
            expectedUserId,
            match: finalUserId === expectedUserId,
          });
          
          // OPTIMIZED: Reduced delay for instant connection (100ms instead of 200ms)
          // Verify SDK is actually ready by testing if we can use the client
          // Just checking isConnected() isn't enough - SDK might not have finished setting up tokens
          await new Promise(resolve => setTimeout(resolve, 100));
          
          let actuallyReady = false;
          if (connected && finalUserId === expectedUserId) {
            try {
              const testClient = streamChatService.getClient();
              // Try to access userID - if tokens aren't set, this will throw
              const testUserId = testClient?.userID;
              if (testUserId === expectedUserId) {
                // Verify queryChannels exists (requires tokens to be set)
                if (typeof testClient.queryChannels === 'function') {
                  actuallyReady = true;
                  console.log('✅ [StreamChatProvider] SDK verified ready - tokens are set');
                }
              }
            } catch (verifyError: any) {
              const errorMsg = verifyError?.message || String(verifyError);
              if (errorMsg.includes('tokens are not set') || errorMsg.includes('Both secret')) {
                console.warn('⚠️ [StreamChatProvider] SDK tokens not ready yet, waiting...');
                // OPTIMIZED: Reduced retry wait for instant connection (150ms instead of 300ms)
                await new Promise(resolve => setTimeout(resolve, 150));
                try {
                  const retryClient = streamChatService.getClient();
                  const retryUserId = retryClient?.userID;
                  if (retryUserId === expectedUserId && typeof retryClient.queryChannels === 'function') {
                    actuallyReady = true;
                    console.log('✅ [StreamChatProvider] SDK ready after retry');
                  }
                } catch (retryError) {
                  console.warn('⚠️ [StreamChatProvider] SDK still not ready after retry');
                }
              } else {
                console.warn('⚠️ [StreamChatProvider] SDK verification failed:', errorMsg);
              }
            }
          }
          
          setClientReady(actuallyReady);
          setClient(actuallyReady ? streamChatService.getClient() : null);
        } else {
          console.log('✅ [StreamChatProvider] Client already connected with correct user ID');
          // Verify SDK is actually ready even if we think we're connected
          let actuallyReady = false;
          try {
            const testClient = streamChatService.getClient();
            const testUserId = testClient?.userID;
            if (testUserId === expectedUserId && typeof testClient.queryChannels === 'function') {
              actuallyReady = true;
            }
          } catch (e) {
            console.warn('⚠️ [StreamChatProvider] Verification failed for existing connection:', (e as Error)?.message);
          }
          setClientReady(actuallyReady);
          try {
            setClient(actuallyReady ? streamChatService.getClient() : null);
          } catch (e) {
            setClient(null);
            setClientReady(false);
          }
        }
      } catch (error: any) {
        // Check if error is about company membership - this is expected if user lost access
        const errorMessage = error?.message || error?.toString() || '';
        const isMembershipError = errorMessage.includes('must be a member') || 
                                 errorMessage.includes('member of this company') ||
                                 errorMessage.includes('not a member') ||
                                 errorMessage.includes('Invalid or expired token');
        
        if (isMembershipError) {
          console.log('💬 [StreamChatProvider] Membership/token error (expected) - skipping StreamChat initialization:', errorMessage);
          setClientReady(false);
          setClient(null);
          return;
        }
        console.warn('⚠️ [StreamChatProvider] Failed to initialize (non-critical):', error?.message || error);
        setClientReady(false);
        setClient(null);
      }
    };
    initializeStreamChat();
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, getStreamChatToken]);

  const theme = getStreamChatTheme();

  if (!isAuthenticated) {
    return <>{children}</>;
  }
  return (
    <StreamChatReadyContext.Provider value={{ clientReady }}>
      {clientReady && client ? (
        <OverlayProvider value={{ style: theme }}>
          <Chat client={client}>
            {children}
          </Chat>
        </OverlayProvider>
      ) : (
        <>{children}</>
      )}
    </StreamChatReadyContext.Provider>
  );
};

