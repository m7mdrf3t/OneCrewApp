/**
 * StreamChat Service
 * 
 * Manages StreamChat client initialization, authentication, and lifecycle.
 * Provides singleton instance for app-wide use.
 */

import { Platform } from 'react-native';
import { StreamChat, User as StreamUser, TokenOrProvider } from 'stream-chat';
import { getStreamChatApiKey } from '../config/streamChat';
import streamChatConnectionMonitor from '../utils/StreamChatConnectionMonitor';

interface UnreadCounts {
  total_unread_count: number;
  unread_channels: number;
  unread_threads: number;
}

class StreamChatService {
  private client: StreamChat | null = null;
  private currentUserId: string | null = null;
  private currentUserType: 'user' | 'company' = 'user';
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private apiKey: string | null = null; // Store API key from backend
  private connectionListeners: Array<{ unsubscribe: () => void }> = [];
  private isOnline: boolean = false;
  private initialUnreadCounts: UnreadCounts | null = null;
  private isDisconnecting: boolean = false;
  private disconnectPromise: Promise<void> | null = null;
  /** Last device token we registered with Stream — used to remove before re-register on refresh (reduce duplicates) */
  private lastRegisteredDeviceToken: string | null = null;

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
      this.client = StreamChat.getInstance(apiKey);
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

    // CRITICAL: If disconnect is in progress, wait for it to complete first
    // This prevents race conditions where connectUser is called while disconnect is still processing
    if (this.isDisconnecting && this.disconnectPromise) {
      console.log('⏳ StreamChat: Disconnect in progress, waiting for it to complete before connecting...');
      await this.disconnectPromise;
      console.log('✅ StreamChat: Disconnect completed, proceeding with connect');
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

    // OPTIMIZED: Skip disconnect if already connected to same user (instant connection)
    let currentUserId: string | undefined;
    try {
      currentUserId = client.userID;
      if (currentUserId === streamUserId) {
        console.log('✅ StreamChat: Already connected to this user - skipping reconnect');
        // Still set up connection listeners if not already set
        if (this.connectionListeners.length === 0) {
          this.setupConnectionListeners(client);
        }
        return; // Instant - no disconnect/connect needed!
      }
    } catch (error) {
      // If accessing userID throws, we need to connect - currentUserId remains undefined
    }

    // CRITICAL: Disconnect previous user if any - must complete fully before connecting
    if (currentUserId && currentUserId !== streamUserId) {
      console.log('🔄 StreamChat: Disconnecting previous user before connecting new one');
      // Use our disconnectUser method which properly releases channels
      // This will wait if a disconnect is already in progress (prevents race conditions)
      await this.disconnectUser();
      
      // CRITICAL: Additional verification after disconnectUser() returns
      // Even though disconnectUser() waits internally, we double-check here
      // This ensures the SDK has fully processed the disconnect before we connect
      // Increased timeout to 2.5 seconds to match disconnectUser's internal verification
      let disconnectVerified = false;
      let attempts = 0;
      const maxAttempts = 50; // 2.5 seconds max wait (50 * 50ms) - must match disconnectUser's max wait
      
      while (!disconnectVerified && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
        attempts++;
        
        // Verify disconnect completed by checking userID is cleared
        try {
          const currentUserId = client.userID;
          if (!currentUserId || currentUserId === null || currentUserId === undefined) {
            // userID is cleared - disconnect is verified
            // Since disconnectUser() already verified, this is just a double-check
            disconnectVerified = true;
            console.log(`✅ StreamChat: Additional disconnect verification passed after ${attempts * 50}ms`);
          }
        } catch (error: any) {
          // If accessing userID throws (tokens not set), disconnect is complete
          const errorMsg = error?.message || String(error);
          if (errorMsg.includes('tokens are not set') || errorMsg.includes('Both secret')) {
            disconnectVerified = true;
            console.log(`✅ StreamChat: Additional disconnect verification passed (tokens cleared) after ${attempts * 50}ms`);
          }
        }
      }
      
      if (!disconnectVerified) {
        console.warn('⚠️ StreamChat: Additional disconnect verification timeout, but disconnectUser() already verified - proceeding');
      }
    }

    // Prepare user object for StreamChat
    const streamUser: StreamUser = {
      id: streamUserId,
      ...(userData?.name && { name: userData.name }),
      ...(userData?.image && { image: userData.image }),
      ...userData,
    };

    console.log('🔌 StreamChat: Connecting user', streamUserId);
    
    // Monitor: Log connectUser call
    streamChatConnectionMonitor.logConnectUser(streamUserId, !!token, !!this.apiKey);
    
    // Connect user and capture response (contains initial unread counts)
    let response: any;
    try {
      response = await client.connectUser(streamUser, token);
      streamChatConnectionMonitor.logConnectUserSuccess(streamUserId, response);
    } catch (error: any) {
      streamChatConnectionMonitor.logConnectUserError(streamUserId, error);
      throw error;
    }
    
    // Capture initial unread counts from connectUser response (best practice per Stream docs)
    if (response?.me) {
      this.initialUnreadCounts = {
        total_unread_count: response.me.total_unread_count || 0,
        unread_channels: response.me.unread_channels || 0,
        unread_threads: response.me.unread_threads || 0,
      };
      console.log('💬 [StreamChat] Initial unread counts from connectUser:', this.initialUnreadCounts);
    } else {
      this.initialUnreadCounts = {
        total_unread_count: 0,
        unread_channels: 0,
        unread_threads: 0,
      };
    }
    
    // Set up connection event listeners (best practice per Stream docs)
    this.setupConnectionListeners(client);
    
    // OPTIMIZED: Reduced wait time for instant connection (200ms instead of 500ms)
    // The SDK needs minimal time to set up internal token state
    // The actual readiness is verified by StreamChatProvider via isConnected() check
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('✅ StreamChat: User connected successfully');
  }

  /**
   * Set up connection event listeners (best practice per Stream Chat docs)
   * Listens to connection.changed and connection.recovered events
   */
  private setupConnectionListeners(client: StreamChat): void {
    // Clean up existing listeners first
    this.cleanupConnectionListeners();

    // Listen to connection changes (best practice per Stream docs)
    const connectionChangedListener = client.on("connection.changed", (e: any) => {
      this.isOnline = e.online || false;
      console.log(`💬 [StreamChat] Connection ${this.isOnline ? 'UP' : 'DOWN'}`);
      // Monitor: Connection state changed
      streamChatConnectionMonitor.logEvent('connection.changed', {
        online: this.isOnline,
        userID: this.currentUserId,
      });
    });

    // Listen to connection recovery (best practice per Stream docs)
    const connectionRecoveredListener = client.on("connection.recovered", () => {
      this.isOnline = true;
      console.log('✅ [StreamChat] Connection recovered');
      // Monitor: Connection recovered
      streamChatConnectionMonitor.logEvent('connection.recovered', {
        userID: this.currentUserId,
      });
    });

    this.connectionListeners = [
      connectionChangedListener,
      connectionRecoveredListener,
    ];
  }

  /**
   * Clean up connection event listeners
   */
  private cleanupConnectionListeners(): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener.unsubscribe();
      } catch (error) {
        console.warn('⚠️ StreamChat: Error unsubscribing listener:', error);
      }
    });
    this.connectionListeners = [];
  }

  /**
   * Get connection state (best practice - use SDK's connection events)
   */
  getConnectionState(): { isOnline: boolean } {
    return { isOnline: this.isOnline };
  }

  /**
   * Get initial unread counts from connectUser response (best practice per Stream docs)
   * These are the counts returned when the user first connects
   */
  getInitialUnreadCounts(): UnreadCounts {
    return this.initialUnreadCounts || {
      total_unread_count: 0,
      unread_channels: 0,
      unread_threads: 0,
    };
  }

  /**
   * Disconnect current user from StreamChat
   * Releases all active channels before disconnecting to prevent "can't use channel after disconnect" errors
   * CRITICAL: This method is now protected against concurrent calls to prevent race conditions
   */
  async disconnectUser(): Promise<void> {
    if (!this.client) {
      return;
    }

    // CRITICAL: If disconnect is already in progress, wait for it to complete
    if (this.isDisconnecting && this.disconnectPromise) {
      console.log('⏳ StreamChat: Disconnect already in progress, waiting...');
      await this.disconnectPromise;
      return;
    }

    // Mark as disconnecting and create promise
    this.isDisconnecting = true;
    this.disconnectPromise = this._disconnectUser();
    
    try {
      await this.disconnectPromise;
    } finally {
      this.isDisconnecting = false;
      this.disconnectPromise = null;
    }
  }

  /**
   * Internal disconnect implementation
   */
  private async _disconnectUser(): Promise<void> {
    try {
      console.log('🔌 StreamChat: Disconnecting user');
      
      // Monitor: Log disconnectUser call
      streamChatConnectionMonitor.logDisconnectUser();
      
      // Clean up connection listeners
      this.cleanupConnectionListeners();
      this.isOnline = false;
      this.initialUnreadCounts = null;
      
      // Disconnect all active channels before disconnecting user (SDK uses _disconnect on each channel)
      try {
        const activeChannels = this.client?.activeChannels;
        if (activeChannels && Object.keys(activeChannels).length > 0) {
          console.log(`🔌 StreamChat: Disconnecting ${Object.keys(activeChannels).length} active channels before disconnect`);
          for (const channelId in activeChannels) {
            try {
              const channel = activeChannels[channelId];
              if (channel && typeof (channel as any)._disconnect === 'function') {
                (channel as any)._disconnect();
              }
            } catch (channelError) {
              console.warn(`⚠️ StreamChat: Error disconnecting channel ${channelId}:`, channelError);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (releaseError) {
        console.warn('⚠️ StreamChat: Error disconnecting channels (non-critical):', releaseError);
      }
      
      // CRITICAL: Disconnect and verify it completes
      if (this.client) {
        await this.client.disconnectUser();
      }
      this.currentUserId = null;
      this.lastRegisteredDeviceToken = null;
      
      // CRITICAL: Verify disconnect completed - must be thorough to prevent race conditions
      // The SDK's disconnectUser() returns immediately but internal cleanup takes time
      // We need to ensure tokens are actually cleared before proceeding
      let disconnectComplete = false;
      let verifyAttempts = 0;
      const maxVerifyAttempts = 20; // 1 second max (20 * 50ms) - must be thorough
      
      while (!disconnectComplete && verifyAttempts < maxVerifyAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Check every 50ms
        verifyAttempts++;
        
        // Verify disconnect by checking if userID is cleared
        // If accessing userID throws with "tokens not set", disconnect is complete
        try {
          const userId = this.client?.userID;
          if (!userId || userId === null || userId === undefined) {
            // userID is cleared - disconnect is complete
            // Wait at least 2 checks (100ms) to ensure SDK has processed it
            if (verifyAttempts >= 2) {
              disconnectComplete = true;
              console.log(`✅ StreamChat: Disconnect verified internally after ${verifyAttempts * 50}ms`);
            }
          } else {
            // Still has userID - wait more
            if (verifyAttempts % 4 === 0) {
              console.log(`⏳ StreamChat: Waiting for disconnect to complete... (${verifyAttempts * 50}ms)`);
            }
          }
        } catch (error: unknown) {
          // If accessing userID throws, check if it's a token error
          const errorMsg = (error instanceof Error ? error.message : String(error));
          if (errorMsg.includes('tokens are not set') || errorMsg.includes('Both secret')) {
            // Tokens are cleared - disconnect is complete
            disconnectComplete = true;
            console.log(`✅ StreamChat: Disconnect verified (tokens cleared) after ${verifyAttempts * 50}ms`);
          } else {
            // Other error accessing userID - assume disconnect is complete after a few attempts
            if (verifyAttempts >= 3) {
              disconnectComplete = true;
              console.log(`✅ StreamChat: Disconnect verified (error accessing userID) after ${verifyAttempts * 50}ms`);
            }
          }
        }
      }
      
      if (!disconnectComplete) {
        console.warn('⚠️ StreamChat: Disconnect verification timeout after 1 second, but proceeding');
      }
      
      // Monitor: Log disconnectUser success
      streamChatConnectionMonitor.logDisconnectUserSuccess();
      
      console.log('✅ StreamChat: User disconnected');
    } catch (error) {
      console.error('❌ StreamChat: Error disconnecting user', error);
      // Don't throw - allow reconnect to proceed even if disconnect had issues
      this.currentUserId = null;
      this.lastRegisteredDeviceToken = null;
    }
  }

  /**
   * Check if user is connected.
   * Uses try/catch because client.userID can throw "Both secret and user tokens are not set"
   * when the client exists but connectUser wasn't called or disconnect was called.
   */
  isConnected(): boolean {
    try {
      if (!this.client) {
        return false;
      }
      // Check if userID is set (primary check) - can throw if tokens not set
      const hasUserId = this.client.userID !== undefined && this.client.userID !== null;
      if (!hasUserId) {
        return false;
      }
      // Bonus check: connectionState (if available)
      const connectionState = (this.client as any).connectionState;
      if (connectionState === 'disconnected' || connectionState === 'offline') {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current connected user ID (StreamChat format).
   * Safe: returns null if client absent or tokens not set (can throw).
   */
  getCurrentUserId(): string | null {
    try {
      return this.client?.userID ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get current connected user type
   */
  getCurrentUserType(): 'user' | 'company' {
    return this.currentUserType;
  }

  /**
   * Register this device with Stream Chat for push notifications.
   * - iOS: must pass APNs device token (provider 'apn'). Do not pass FCM token.
   * - Android: must pass FCM token (provider 'firebase').
   * On token refresh, removes the previous device from Stream before adding the new one to reduce duplicate devices.
   * Call after connectUser when token is available.
   * Requires Stream Chat Dashboard to have APNs (iOS) / FCM (Android) configured.
   */
  async registerDeviceForPush(deviceToken: string): Promise<void> {
    const trimmed = deviceToken?.trim() ?? '';
    if (!trimmed) {
      console.warn('⚠️ [StreamChat] Cannot register empty push token');
      return;
    }
    try {
      if (!this.isConnected() || !this.client) {
        console.log('📱 [StreamChat] Skipping push device registration (not connected)');
        return;
      }
      if (Platform.OS === 'ios') {
        // Stream expects APNs token on iOS (hex string, typically 64 chars). Refuse obvious FCM token.
        const looksLikeFcm = trimmed.length > 120 || trimmed.includes(':');
        if (looksLikeFcm) {
          console.warn('⚠️ [StreamChat] iOS requires APNs device token, not FCM token. Skipping registration.');
          return;
        }
      }
      // Remove previous device token from Stream before adding new one (avoids duplicate devices)
      if (this.lastRegisteredDeviceToken && this.lastRegisteredDeviceToken !== trimmed) {
        try {
          await this.client.removeDevice(this.lastRegisteredDeviceToken);
          console.log('✅ [StreamChat] Previous device removed from Stream (token refresh cleanup)');
        } catch (removeErr: unknown) {
          const removeMsg = removeErr instanceof Error ? removeErr.message : String(removeErr);
          // 404 or "device not found" is fine — already removed or never existed
          if (removeMsg.includes('404') || removeMsg.includes('not found') || removeMsg.includes('does not exist')) {
            console.log('📱 [StreamChat] Previous device already absent from Stream');
          } else {
            console.warn('⚠️ [StreamChat] Could not remove previous device (non-critical):', removeMsg);
          }
          // Continue to add new device so push still works
        }
      }
      const pushProvider = Platform.OS === 'ios' ? 'apn' : 'firebase';
      await this.client.addDevice(trimmed, pushProvider);
      this.lastRegisteredDeviceToken = trimmed;
      console.log('✅ [StreamChat] Device registered for push notifications with Stream');
      if (Platform.OS === 'ios') {
        console.log('✅ [StreamChat] iOS APNs token registered — push should work when app is backgrounded/closed');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ [StreamChat] Could not register device for push:', msg);
    }
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
      this.cleanupConnectionListeners();
      await this.disconnectUser();
      this.client = null;
      this.currentUserId = null;
      this.lastRegisteredDeviceToken = null;
      this.isOnline = false;
      this.initialUnreadCounts = null;
    } catch (error) {
      console.error('❌ StreamChat: Error during cleanup', error);
    }
  }
}

// Export singleton instance
const streamChatService = new StreamChatService();
export default streamChatService;

