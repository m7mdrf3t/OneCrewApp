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
        setClientReady(false);
        return;
      }

      try {
        const client = streamChatService.getClient();
        if (client && streamChatService.isConnected()) {
          setClientReady(true);
        } else {
          // Try to connect if not already connected
          const tokenResponse = await getStreamChatToken();
          if (tokenResponse.success && tokenResponse.data) {
            const { token, user_id, api_key } = tokenResponse.data as any;
            // Use user_id from token response (backend knows the correct StreamChat user ID format)
            const userType = currentProfileType === 'company' ? 'company' : 'user';
            const userData = currentProfileType === 'company' && activeCompany
              ? { name: activeCompany.name, image: activeCompany.logo_url }
              : { name: user.name, image: user.image_url };

            await streamChatService.connectUser(user_id, token, userData, api_key, userType);
            setClientReady(true);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize StreamChat provider:', error);
        setClientReady(false);
      }
    };

    initializeStreamChat();
  }, [isAuthenticated, user?.id, currentProfileType, activeCompany?.id, getStreamChatToken]);

  const client = streamChatService.getClient();
  const theme = getStreamChatTheme();

  // Only provide StreamChat context when authenticated and client is ready
  if (!isAuthenticated || !client || !clientReady) {
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

