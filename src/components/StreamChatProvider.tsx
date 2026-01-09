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
      if (!isAuthenticated || !user) {
        console.log('💬 [StreamChatProvider] Not authenticated or no user, skipping initialization');
        setClientReady(false);
        return;
      }

      try {
        console.log('💬 [StreamChatProvider] Initializing StreamChat...');
        const client = streamChatService.getClient();
        const isConnected = streamChatService.isConnected();
        
        console.log('💬 [StreamChatProvider] Client status:', {
          hasClient: !!client,
          isConnected,
          clientUserId: client?.userID,
        });
        
        if (client && isConnected) {
          console.log('✅ [StreamChatProvider] Client already connected');
          setClientReady(true);
        } else {
          console.log('💬 [StreamChatProvider] Client not connected, fetching token...');
          // Try to connect if not already connected
          const tokenResponse = await getStreamChatToken();
          console.log('💬 [StreamChatProvider] Token response:', {
            success: tokenResponse.success,
            hasData: !!tokenResponse.data,
            hasToken: !!(tokenResponse.data as any)?.token,
            hasUserId: !!(tokenResponse.data as any)?.user_id,
            hasApiKey: !!(tokenResponse.data as any)?.api_key,
          });
          
          if (tokenResponse.success && tokenResponse.data) {
            const { token, user_id, api_key } = tokenResponse.data as any;
            // Use user_id from token response (backend knows the correct StreamChat user ID format)
            const userType = currentProfileType === 'company' ? 'company' : 'user';
            const userData = currentProfileType === 'company' && activeCompany
              ? { name: activeCompany.name, image: activeCompany.logo_url }
              : { name: user.name, image: user.image_url };

            console.log('💬 [StreamChatProvider] Connecting user...', {
              userId: user_id,
              userType,
              hasApiKey: !!api_key,
            });
            
            await streamChatService.connectUser(user_id, token, userData, api_key, userType);
            
            // Verify connection after connectUser
            const connected = streamChatService.isConnected();
            console.log('💬 [StreamChatProvider] Connection result:', {
              connected,
              clientUserId: streamChatService.getClient()?.userID,
            });
            
            setClientReady(connected);
          } else {
            console.error('❌ [StreamChatProvider] Token response failed:', tokenResponse);
            setClientReady(false);
          }
        }
      } catch (error) {
        console.error('❌ [StreamChatProvider] Failed to initialize:', error);
        setClientReady(false);
      }
    };

    initializeStreamChat();
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, getStreamChatToken]);

  const client = streamChatService.getClient();
  const theme = getStreamChatTheme();

  // Always provide StreamChat context when authenticated and client exists
  // This allows components to use ChatContext hooks even if client isn't fully ready yet
  if (!isAuthenticated || !client) {
    return <>{children}</>;
  }

  return (
    <OverlayProvider value={{ style: theme }}>
      <Chat client={client}>
        {children}
      </Chat>
    </OverlayProvider>
  );
};

