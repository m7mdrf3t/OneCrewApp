import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Service
 * 
 * Manages Supabase client initialization and real-time subscriptions.
 * 
 * Configuration:
 * - Set SUPABASE_URL and SUPABASE_ANON_KEY as environment variables
 * - Or call initialize() with your credentials
 */
class SupabaseService {
  private client: SupabaseClient | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Initialize Supabase client
   * @param url Supabase project URL
   * @param anonKey Supabase anon/public key
   */
  initialize(url?: string, anonKey?: string): SupabaseClient {
    const supabaseUrl = url || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = anonKey || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase URL or Anon Key not provided. Real-time features will not work.');
      console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables or call initialize() with credentials.');
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log('✅ Supabase client initialized');
    return this.client;
  }

  /**
   * Get Supabase client instance
   * @throws Error if client not initialized
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Subscribe to real-time changes on a table
   * @param tableName Name of the table to subscribe to
   * @param filter Filter for the subscription (e.g., { user_id: 'eq.current_user_id' })
   * @param onInsert Callback for INSERT events
   * @param onUpdate Callback for UPDATE events
   * @param onDelete Callback for DELETE events
   * @returns Channel subscription ID
   */
  subscribeToTable(
    tableName: string,
    filter?: Record<string, string>,
    onInsert?: (payload: any) => void,
    onUpdate?: (payload: any) => void,
    onDelete?: (payload: any) => void
  ): string {
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized. Cannot subscribe to table.');
      return '';
    }

    const channelName = `realtime:${tableName}:${Date.now()}`;
    const channel = this.client.channel(channelName);

    // Build filter string for subscription
    let filterString = '';
    if (filter) {
      filterString = Object.entries(filter)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    }

    // Subscribe to INSERT events
    if (onInsert) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: filterString || undefined,
        },
        (payload) => {
          console.log(`📨 New ${tableName} record inserted:`, payload.new);
          onInsert(payload);
        }
      );
    }

    // Subscribe to UPDATE events
    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: filterString || undefined,
        },
        (payload) => {
          console.log(`📝 ${tableName} record updated:`, payload.new);
          onUpdate(payload);
        }
      );
    }

    // Subscribe to DELETE events
    if (onDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
          filter: filterString || undefined,
        },
        (payload) => {
          console.log(`🗑️ ${tableName} record deleted:`, payload.old);
          onDelete(payload);
        }
      );
    }

    channel.subscribe((status) => {
      console.log(`📡 Subscription status for ${tableName}:`, status);
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to ${tableName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to ${tableName}`);
      }
    });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to notifications for a specific user
   * @param userId User ID to filter notifications
   * @param onNewNotification Callback when new notification is created
   * @returns Channel subscription ID
   */
  subscribeToNotifications(
    userId: string,
    onNewNotification: (notification: any) => void
  ): string {
    return this.subscribeToTable(
      'notifications',
      { user_id: `eq.${userId}` },
      (payload) => {
        onNewNotification(payload.new);
      }
    );
  }

  /**
   * @deprecated Chat subscriptions are now handled by StreamChat backend.
   * This method is kept for backward compatibility but should not be used for new code.
   * Use StreamChat SDK for real-time chat features.
   * 
   * Subscribe to chat messages for a specific conversation
   * @param conversationId Conversation ID to filter messages
   * @param onNewMessage Callback when new message is created
   * @param onMessageUpdate Callback when message is updated
   * @param onMessageDelete Callback when message is deleted
   * @returns Channel subscription ID
   */
  subscribeToChatMessages(
    conversationId: string,
    onNewMessage?: (message: any) => void,
    onMessageUpdate?: (message: any) => void,
    onMessageDelete?: (message: any) => void
  ): string {
    console.warn('⚠️ subscribeToChatMessages is deprecated. Use StreamChat SDK for real-time chat features.');
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized. Cannot subscribe to chat messages.');
      return '';
    }

    const channelName = `chat:${conversationId}:${Date.now()}`;
    const channel = this.client.channel(channelName);

    // Subscribe to INSERT events (new messages)
    if (onNewMessage) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('💬 New message received via real-time:', payload.new);
          onNewMessage(payload.new);
        }
      );
    }

    // Subscribe to UPDATE events (message edits)
    if (onMessageUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('💬 Message updated via real-time:', payload.new);
          onMessageUpdate(payload.new);
        }
      );
    }

    // Subscribe to DELETE events (message deletions)
    if (onMessageDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('💬 Message deleted via real-time:', payload);
          // Pass the entire payload, the handler will extract the ID
          onMessageDelete(payload.old || payload);
        }
      );
    }

    channel.subscribe((status) => {
      console.log(`📡 Chat subscription status for conversation ${conversationId}:`, status);
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to chat messages for conversation ${conversationId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Error subscribing to chat messages for conversation ${conversationId}`);
      }
    });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * @deprecated Chat subscriptions are now handled by StreamChat backend.
   * This method is kept for backward compatibility but should not be used for new code.
   * Use StreamChat SDK for real-time chat features.
   * 
   * Subscribe to conversation updates (for conversation list)
   * @param userId User ID to filter conversations
   * @param onConversationUpdate Callback when conversation is updated
   * @returns Channel subscription ID
   */
  subscribeToConversations(
    userId: string,
    onConversationUpdate?: (conversation: any) => void
  ): string {
    console.warn('⚠️ subscribeToConversations is deprecated. Use StreamChat SDK for real-time chat features.');
    if (!this.client) {
      console.warn('⚠️ Supabase client not initialized. Cannot subscribe to conversations.');
      return '';
    }

    const channelName = `conversations:${userId}:${Date.now()}`;
    const channel = this.client.channel(channelName);

    // Subscribe to conversation updates
    if (onConversationUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
        },
        (payload) => {
          console.log('💬 Conversation updated via real-time:', payload.new);
          onConversationUpdate(payload.new);
        }
      );
    }

    channel.subscribe((status) => {
      console.log(`📡 Conversations subscription status:`, status);
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Successfully subscribed to conversations`);
      }
    });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Unsubscribe from a channel
   * @param channelId Channel ID returned from subscribeToTable
   */
  unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.client?.removeChannel(channel);
      this.channels.delete(channelId);
      console.log(`🔌 Unsubscribed from channel: ${channelId}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      this.client?.removeChannel(channel);
      console.log(`🔌 Unsubscribed from channel: ${channelId}`);
    });
    this.channels.clear();
  }

  /**
   * Get connection state
   */
  getConnectionState(): 'connected' | 'disconnected' | 'error' | 'not_initialized' {
    if (!this.client) {
      return 'not_initialized';
    }
    // Supabase doesn't expose connection state directly
    // This is a simplified check
    return this.channels.size > 0 ? 'connected' : 'disconnected';
  }
}

// Export singleton instance
const supabaseService = new SupabaseService();
export default supabaseService;

