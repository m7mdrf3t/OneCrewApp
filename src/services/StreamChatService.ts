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
      // Use our disconnectUser method which properly releases channels
      await this.disconnectUser();
      // Wait for disconnect to complete
      await new Promise(resolve => setTimeout(resolve, 150));
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
    
    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ StreamChat: User connected successfully');
  }

  /**
   * Disconnect current user from StreamChat
   * Releases all active channels before disconnecting to prevent "can't use channel after disconnect" errors
   */
  async disconnectUser(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      console.log('🔌 StreamChat: Disconnecting user');
      
      // Release all active channels before disconnecting
      // This prevents "You can't use a channel after client.disconnect() was called" errors
      try {
        const activeChannels = this.client.activeChannels;
        if (activeChannels && Object.keys(activeChannels).length > 0) {
          console.log(`🔌 StreamChat: Releasing ${Object.keys(activeChannels).length} active channels before disconnect`);
          for (const channelId in activeChannels) {
            try {
              const channel = activeChannels[channelId];
              if (channel && typeof channel.release === 'function') {
                await channel.release();
              }
            } catch (channelError) {
              console.warn(`⚠️ StreamChat: Error releasing channel ${channelId}:`, channelError);
            }
          }
          // Small delay to ensure all channel operations complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (releaseError) {
        console.warn('⚠️ StreamChat: Error releasing channels (non-critical):', releaseError);
      }
      
      await this.client.disconnectUser();
      this.currentUserId = null;
      
      // Small delay after disconnect to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ StreamChat: User disconnected');
    } catch (error) {
      console.error('❌ StreamChat: Error disconnecting user', error);
      // Don't throw - allow reconnect to proceed even if disconnect had issues
      this.currentUserId = null;
    }
  }

  /**
   * Check if user is connected
   */
  isConnected(): boolean {
    if (!this.client) {
      return false;
    }
    
    // Check if userID is set (primary check)
    const hasUserId = this.client.userID !== undefined && this.client.userID !== null;
    if (!hasUserId) {
      return false;
    }
    
    // Bonus check: connectionState (if available)
    // StreamChat client has connectionState: 'connecting' | 'connected' | 'disconnected' | 'online' | 'offline'
    const connectionState = (this.client as any).connectionState;
    
    // If connectionState is explicitly disconnected/offline, return false
    if (connectionState === 'disconnected' || connectionState === 'offline') {
      return false;
    }
    
    // If userID is set and connectionState is not explicitly disconnected, consider it connected
    // This is more lenient because connectionState might not always be available or accurate
    return true;
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
      console.log('🔄 StreamChat: Reconnecting - disconnecting current user first...');
      await this.disconnectUser();
      
      // Wait a bit longer after disconnect to ensure all operations complete
      // This prevents "can't use channel after disconnect" errors
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify disconnect completed
      const connectionState = (this.client as any)?.connectionState;
      if (connectionState === 'disconnected' || connectionState === 'offline') {
        console.log('✅ StreamChat: Disconnect confirmed, proceeding with reconnect');
      }
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

