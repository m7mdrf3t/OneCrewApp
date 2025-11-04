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

