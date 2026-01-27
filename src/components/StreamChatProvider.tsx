/**
 * StreamChat Provider Wrapper
 * 
 * Provides StreamChat context to the app when user is authenticated.
 * This component wraps the chat-related screens with StreamChat's ChatProvider.
 */

import React, { useEffect, useState } from 'react';
import { Chat, OverlayProvider } from 'stream-chat-react-native';
import { useApi } from '../contexts/ApiContext';
import streamChatService from '../services/StreamChatService';
import { getStreamChatTheme } from '../themes/streamChatTheme';

interface StreamChatProviderProps {
  children: React.ReactNode;
}

export const StreamChatProvider: React.FC<StreamChatProviderProps> = ({ children }) => {
  const { isAuthenticated, user, currentProfileType, activeCompany, getStreamChatToken } = useApi();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    const initializeStreamChat = async () => {
      // CRITICAL: Don't initialize StreamChat during Google Sign-In flow
      // Wait until user is fully authenticated and has an ID
      if (!isAuthenticated || !user || !user.id) {
        console.log('💬 [StreamChatProvider] Not authenticated or no user ID, skipping initialization');
        setClientReady(false);
        return;
      }
      
      // Additional safety check: ensure user has email (fully registered)
      // This prevents initialization during the sign-in process
      if (!user.email) {
        console.log('💬 [StreamChatProvider] User email not available yet, skipping initialization (likely during sign-in)');
        setClientReady(false);
        return;
      }

      try {
        console.log('💬 [StreamChatProvider] Initializing StreamChat...');
        const client = streamChatService.getClient();
        const isConnected = streamChatService.isConnected();
        const currentConnectedUserId = client?.userID;
        
        console.log('💬 [StreamChatProvider] Client status:', {
          hasClient: !!client,
          isConnected,
          clientUserId: currentConnectedUserId,
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
            // User lost access to company - this is expected, don't log as error
            console.log('💬 [StreamChatProvider] Company membership error (user may have lost access) - skipping StreamChat initialization');
            setClientReady(false);
            return;
          }
          
          // For other errors, log but don't block app
          console.warn('⚠️ [StreamChatProvider] Token response failed (non-critical):', tokenResponse);
          setClientReady(false);
          return;
        }
        
        const { token, user_id: expectedUserId, api_key } = tokenResponse.data as any;
        
        console.log('💬 [StreamChatProvider] Token details:', {
          expectedUserId,
          currentConnectedUserId,
          profileType: currentProfileType,
          companyId: activeCompany?.id,
          needsReconnect: !isConnected || currentConnectedUserId !== expectedUserId,
        });
        
        // Check if we need to reconnect (user ID mismatch or not connected)
        const needsReconnect = !isConnected || currentConnectedUserId !== expectedUserId;
        
        if (needsReconnect) {
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
          
          // Verify connection after connectUser
          const connected = streamChatService.isConnected();
          const finalUserId = streamChatService.getClient()?.userID;
          console.log('💬 [StreamChatProvider] Connection result:', {
            connected,
            clientUserId: finalUserId,
            expectedUserId,
            match: finalUserId === expectedUserId,
          });
          
          setClientReady(connected && finalUserId === expectedUserId);
        } else {
          console.log('✅ [StreamChatProvider] Client already connected with correct user ID');
          setClientReady(true);
        }
      } catch (error: any) {
        // Check if error is about company membership - this is expected if user lost access
        const errorMessage = error?.message || error?.toString() || '';
        const isMembershipError = errorMessage.includes('must be a member') || 
                                 errorMessage.includes('member of this company') ||
                                 errorMessage.includes('not a member') ||
                                 errorMessage.includes('Invalid or expired token');
        
        if (isMembershipError) {
          // User lost access to company or token expired - this is expected, don't log as error
          console.log('💬 [StreamChatProvider] Membership/token error (expected) - skipping StreamChat initialization:', errorMessage);
          setClientReady(false);
          return;
        }
        
        // For other errors, log but don't block app
        console.warn('⚠️ [StreamChatProvider] Failed to initialize (non-critical):', error?.message || error);
        setClientReady(false);
      }
    };

    initializeStreamChat();
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, getStreamChatToken]);

  const client = streamChatService.getClient();
  const theme = getStreamChatTheme();

  // CRITICAL: Always provide Chat context when authenticated and client exists
  // This prevents "useChatContext hook was called outside ChatContext Provider" errors
  // ChannelList and other StreamChat components require Chat context to exist
  // Components will check connection state themselves and wait if needed
  if (!isAuthenticated || !client) {
    return <>{children}</>;
  }

  // Always provide Chat context - components will check connection state themselves
  // ConversationsListPage will wait for connection before rendering ChannelList
  return (
    <OverlayProvider value={{ style: theme }}>
      <Chat client={client}>
        {children}
      </Chat>
    </OverlayProvider>
  );
};

