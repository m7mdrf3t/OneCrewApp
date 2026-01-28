/**
 * StreamChat Connection Monitor
 * 
 * Monitors StreamChat connection state, events, and operations to help debug
 * connection issues during profile switches.
 */

import streamChatService from '../services/StreamChatService';

interface ConnectionEvent {
  timestamp: string;
  type: string;
  details: any;
  stackTrace?: string;
}

class StreamChatConnectionMonitor {
  private events: ConnectionEvent[] = [];
  private maxEvents = 100; // Keep last 100 events
  private isMonitoring = false;
  private clientListeners: Array<{ unsubscribe: () => void }> = [];

  /**
   * Start monitoring StreamChat connection
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('🔍 [ConnectionMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.events = [];
    this.logEvent('monitor_started', { message: 'Connection monitoring started' });

    try {
      const client = streamChatService.getClient();
      
      // Monitor connection events
      const connectionChangedListener = client.on('connection.changed', (e: any) => {
        this.logEvent('connection.changed', {
          online: e.online,
          connectionState: (client as any)?.connectionState,
          userID: client.userID,
        });
      });

      const connectionRecoveredListener = client.on('connection.recovered', () => {
        this.logEvent('connection.recovered', {
          userID: client.userID,
          connectionState: (client as any)?.connectionState,
        });
      });

      // Monitor errors
      const errorListener = client.on('error', (error: any) => {
        this.logEvent('client.error', {
          error: error?.message || String(error),
          userID: client.userID,
          stackTrace: error?.stack,
        });
      });

      this.clientListeners = [
        connectionChangedListener,
        connectionRecoveredListener,
        errorListener,
      ];

      console.log('🔍 [ConnectionMonitor] Monitoring started');
    } catch (error: any) {
      this.logEvent('monitor_start_error', {
        error: error?.message || String(error),
        stackTrace: error?.stack,
      });
      console.error('❌ [ConnectionMonitor] Failed to start monitoring:', error);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.clientListeners.forEach(listener => {
      try {
        listener.unsubscribe();
      } catch (error) {
        console.warn('⚠️ [ConnectionMonitor] Error unsubscribing:', error);
      }
    });
    this.clientListeners = [];
    this.logEvent('monitor_stopped', { message: 'Connection monitoring stopped' });
    console.log('🔍 [ConnectionMonitor] Monitoring stopped');
  }

  /**
   * Log a connection event
   */
  logEvent(type: string, details: any, includeStackTrace = false): void {
    const event: ConnectionEvent = {
      timestamp: new Date().toISOString(),
      type,
      details,
    };

    if (includeStackTrace) {
      event.stackTrace = new Error().stack;
    }

    this.events.push(event);

    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console with prefix
    console.log(`🔍 [ConnectionMonitor] ${type}`, details);
  }

  /**
   * Log connectUser call
   */
  logConnectUser(streamUserId: string, hasToken: boolean, hasApiKey: boolean): void {
    this.logEvent('connectUser.called', {
      streamUserId,
      hasToken,
      hasApiKey,
      timestamp: Date.now(),
    });
  }

  /**
   * Log connectUser success
   */
  logConnectUserSuccess(streamUserId: string, response: any): void {
    this.logEvent('connectUser.success', {
      streamUserId,
      hasResponse: !!response,
      hasMe: !!response?.me,
      totalUnreadCount: response?.me?.total_unread_count,
      userID: response?.me?.id,
    });
  }

  /**
   * Log connectUser error
   */
  logConnectUserError(streamUserId: string, error: any): void {
    this.logEvent('connectUser.error', {
      streamUserId,
      error: error?.message || String(error),
      stackTrace: error?.stack,
    }, true);
  }

  /**
   * Log disconnectUser call
   */
  logDisconnectUser(): void {
    try {
      const client = streamChatService.getClient();
      const userID = streamChatService.getCurrentUserId();
      this.logEvent('disconnectUser.called', {
        userID,
        hasClient: !!client,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.logEvent('disconnectUser.called', {
        error: error?.message || String(error),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Log disconnectUser success
   */
  logDisconnectUserSuccess(): void {
    this.logEvent('disconnectUser.success', {
      timestamp: Date.now(),
    });
  }

  /**
   * Log profile switch
   */
  logProfileSwitch(fromProfile: string, toProfile: string, companyId?: string): void {
    try {
      const client = streamChatService.getClient();
      const userID = streamChatService.getCurrentUserId();
      const isConnected = streamChatService.isConnected();
      const connectionState = (client as any)?.connectionState;
      
      this.logEvent('profile.switch', {
        fromProfile,
        toProfile,
        companyId,
        currentUserID: userID,
        isConnected,
        connectionState,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this.logEvent('profile.switch', {
        fromProfile,
        toProfile,
        companyId,
        error: error?.message || String(error),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Log token access attempt
   */
  logTokenAccess(operation: string, success: boolean, error?: any): void {
    try {
      const client = streamChatService.getClient();
      const userID = streamChatService.getCurrentUserId();
      const isConnected = streamChatService.isConnected();
      
      this.logEvent('token.access', {
        operation,
        success,
        userID,
        isConnected,
        error: error?.message || (error ? String(error) : undefined),
        timestamp: Date.now(),
      }, !!error);
    } catch (error: any) {
      this.logEvent('token.access', {
        operation,
        success: false,
        error: error?.message || String(error),
        timestamp: Date.now(),
      }, true);
    }
  }

  /**
   * Log channel operation
   */
  logChannelOperation(operation: string, channelId: string, success: boolean, error?: any): void {
    try {
      const client = streamChatService.getClient();
      const userID = streamChatService.getCurrentUserId();
      const isConnected = streamChatService.isConnected();
      
      this.logEvent('channel.operation', {
        operation,
        channelId,
        success,
        userID,
        isConnected,
        error: error?.message || (error ? String(error) : undefined),
        timestamp: Date.now(),
      }, !!error);
    } catch (error: any) {
      this.logEvent('channel.operation', {
        operation,
        channelId,
        success: false,
        error: error?.message || String(error),
        timestamp: Date.now(),
      }, true);
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 20): ConnectionEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get all events
   */
  getAllEvents(): ConnectionEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): ConnectionEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get connection state snapshot
   */
  getConnectionStateSnapshot(): any {
    try {
      const client = streamChatService.getClient();
      const userID = streamChatService.getCurrentUserId();
      const isConnected = streamChatService.isConnected();
      const connectionState = (client as any)?.connectionState;
      const connectionStateFromMonitor = streamChatService.getConnectionState();
      
      return {
        timestamp: new Date().toISOString(),
        userID,
        isConnected,
        connectionState,
        connectionStateFromMonitor,
        hasClient: !!client,
        activeChannels: client ? Object.keys(client.activeChannels || {}).length : 0,
      };
    } catch (error: any) {
      return {
        timestamp: new Date().toISOString(),
        error: error?.message || String(error),
        hasClient: false,
      };
    }
  }

  /**
   * Print summary of recent events
   */
  printSummary(): void {
    console.log('\n🔍 [ConnectionMonitor] ===== CONNECTION SUMMARY =====');
    console.log(`Total events: ${this.events.length}`);
    
    const recentEvents = this.getRecentEvents(10);
    console.log('\n📋 Recent Events:');
    recentEvents.forEach((event, index) => {
      console.log(`${index + 1}. [${event.timestamp}] ${event.type}:`, event.details);
    });

    const stateSnapshot = this.getConnectionStateSnapshot();
    console.log('\n📊 Current State:');
    console.log(JSON.stringify(stateSnapshot, null, 2));

    const errorEvents = this.getEventsByType('connectUser.error')
      .concat(this.getEventsByType('token.access').filter(e => !e.details.success))
      .concat(this.getEventsByType('channel.operation').filter(e => !e.details.success));
    
    if (errorEvents.length > 0) {
      console.log('\n❌ Errors:');
      errorEvents.slice(-5).forEach((event, index) => {
        console.log(`${index + 1}. [${event.timestamp}] ${event.type}:`, event.details);
      });
    }

    console.log('\n🔍 [ConnectionMonitor] ===== END SUMMARY =====\n');
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      events: this.events,
      currentState: this.getConnectionStateSnapshot(),
    }, null, 2);
  }
}

// Export singleton instance
const streamChatConnectionMonitor = new StreamChatConnectionMonitor();
export default streamChatConnectionMonitor;
