/**
 * StreamChat Service
 * 
 * Manages StreamChat client initialization, authentication, and lifecycle.
 * Provides singleton instance for app-wide use.
 */

import { StreamChat, User as StreamUser, TokenOrProvider } from 'stream-chat';
import { getStreamChatApiKey, STREAM_CHAT_CONFIG } from '../config/streamChat';

class StreamChatService {
  private client: StreamChat | null = null;
  private currentUserId: string | null = null;
  private currentUserType: 'user' | 'company' = 'user';
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private apiKey: string | null = null; // Store API key from backend

  /**
   * Set API key (should be called with key from backend)
   */
  setApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ StreamChat: Cannot set empty API key');
      return;
    }
    
    // Only update if the key is different
    if (this.apiKey !== apiKey) {
      console.log('🔑 StreamChat: Updating API key');
      this.apiKey = apiKey;
      // Recreate client if it exists to use new API key
      if (this.client) {
        console.log('🔄 StreamChat: Recreating client with new API key');
        this.client = null;
      }
    }
  }

  /**
   * Get or create StreamChat client instance
   * Uses API key from backend if available, otherwise falls back to config
   */
  getClient(): StreamChat {
    if (!this.client) {
      // Prefer API key from backend, fallback to config
      const apiKey = this.apiKey || getStreamChatApiKey();
      
      // Validate API key before creating client
      if (!apiKey || apiKey === 'YOUR_STREAM_API_KEY') {
        throw new Error('StreamChat API key is required. Backend should provide api_key in getStreamChatToken() response, or set STREAM_CHAT_API_KEY environment variable.');
      }
      
      console.log('🔑 StreamChat: Creating client with API key:', apiKey.substring(0, 10) + '...');
      this.client = StreamChat.getInstance(apiKey, {
        logLevel: STREAM_CHAT_CONFIG.logLevel as any,
        enableOfflineSupport: STREAM_CHAT_CONFIG.enableOfflineSupport,
      });
    }
    return this.client;
  }

  /**
   * Connect user to StreamChat
   * @param streamUserId - StreamChat user ID (from backend token response, not mapped)
   * @param token - StreamChat authentication token from backend
   * @param userData - Additional user data (name, image, etc.)
   * @param apiKey - Optional: StreamChat API key from backend (if provided)
   * @param userType - Optional: 'user' or 'company' (for tracking purposes)
   */
  async connectUser(
    streamUserId: string,
    token: string,
    userData?: {
      name?: string;
      image?: string;
      [key: string]: any;
    },
    apiKey?: string,
    userType?: 'user' | 'company'
  ): Promise<void> {
    // Set API key from backend if provided - MUST be done before creating client
    if (apiKey) {
      console.log('🔑 StreamChat: Setting API key from backend');
      this.setApiKey(apiKey);
    } else {
      const fallbackKey = getStreamChatApiKey();
      if (fallbackKey === 'YOUR_STREAM_API_KEY') {
        console.error('❌ StreamChat: No API key provided and fallback is not configured!');
        throw new Error('StreamChat API key is required. Backend should provide api_key in getStreamChatToken() response, or set STREAM_CHAT_API_KEY environment variable.');
      }
      console.warn('⚠️ StreamChat: Using fallback API key (backend did not provide api_key)');
    }
    
    // If already connected with the same user, skip
    if (this.currentUserId === streamUserId && this.client?.userID === streamUserId) {
      console.log('✅ StreamChat: Already connected with this user');
      return;
    }

    // If connection is in progress, wait for it
    if (this.isConnecting && this.connectionPromise) {
      await this.connectionPromise;
      return;
    }

    this.isConnecting = true;
    this.connectionPromise = this._connectUser(streamUserId, token, userData);
    
    try {
      await this.connectionPromise;
      this.currentUserId = streamUserId;
      this.currentUserType = userType || 'user';
    } catch (error) {
      console.error('❌ StreamChat: Failed to connect user', error);
      throw error;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _connectUser(
    streamUserId: string,
    token: string,
    userData?: {
      name?: string;
      image?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const client = this.getClient();

    // Disconnect previous user if any
    if (client.userID && client.userID !== streamUserId) {
      console.log('🔄 StreamChat: Disconnecting previous user');
      await client.disconnectUser();
    }

    // Prepare user object for StreamChat
    const streamUser: StreamUser = {
      id: streamUserId,
      ...(userData?.name && { name: userData.name }),
      ...(userData?.image && { image: userData.image }),
      ...userData,
    };

    console.log('🔌 StreamChat: Connecting user', streamUserId);
    await client.connectUser(streamUser, token);
    console.log('✅ StreamChat: User connected successfully');
  }

  /**
   * Disconnect current user from StreamChat
   */
  async disconnectUser(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      console.log('🔌 StreamChat: Disconnecting user');
      await this.client.disconnectUser();
      this.currentUserId = null;
      console.log('✅ StreamChat: User disconnected');
    } catch (error) {
      console.error('❌ StreamChat: Error disconnecting user', error);
      throw error;
    }
  }

  /**
   * Check if user is connected
   */
  isConnected(): boolean {
    return this.client?.userID !== undefined && this.client?.userID !== null;
  }

  /**
   * Get current connected user ID (StreamChat format)
   */
  getCurrentUserId(): string | null {
    return this.client?.userID || null;
  }

  /**
   * Get current connected user type
   */
  getCurrentUserType(): 'user' | 'company' {
    return this.currentUserType;
  }

  /**
   * Reconnect user (useful for profile switching)
   * @param streamUserId - StreamChat user ID (from backend token response)
   * @param token - StreamChat authentication token from backend
   * @param userData - Additional user data (name, image, etc.)
   * @param apiKey - Optional: StreamChat API key from backend (if provided)
   * @param userType - Optional: 'user' or 'company' (for tracking purposes)
   */
  async reconnectUser(
    streamUserId: string,
    token: string,
    userData?: {
      name?: string;
      image?: string;
      [key: string]: any;
    },
    apiKey?: string,
    userType?: 'user' | 'company'
  ): Promise<void> {
    // Disconnect first if connected
    if (this.isConnected()) {
      await this.disconnectUser();
    }

    // Connect with new user
    await this.connectUser(streamUserId, token, userData, apiKey, userType);
  }

  /**
   * Cleanup: disconnect and reset
   */
  async cleanup(): Promise<void> {
    try {
      await this.disconnectUser();
      this.client = null;
      this.currentUserId = null;
    } catch (error) {
      console.error('❌ StreamChat: Error during cleanup', error);
    }
  }
}

// Export singleton instance
const streamChatService = new StreamChatService();
export default streamChatService;

