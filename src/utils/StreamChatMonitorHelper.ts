/**
 * StreamChat Monitor Helper
 * 
 * Helper functions to access the connection monitor from the console
 * for debugging purposes.
 */

import streamChatConnectionMonitor from './StreamChatConnectionMonitor';

// Expose monitor to global scope for console access
if (typeof global !== 'undefined') {
  (global as any).streamChatMonitor = {
    /**
     * Print summary of connection events
     */
    summary: () => {
      streamChatConnectionMonitor.printSummary();
    },
    
    /**
     * Get recent events
     */
    recent: (count = 20) => {
      const events = streamChatConnectionMonitor.getRecentEvents(count);
      console.log(`\n🔍 [Monitor] Recent ${events.length} events:`);
      events.forEach((event, index) => {
        console.log(`${index + 1}. [${event.timestamp}] ${event.type}:`, event.details);
      });
      return events;
    },
    
    /**
     * Get events by type
     */
    byType: (type: string) => {
      const events = streamChatConnectionMonitor.getEventsByType(type);
      console.log(`\n🔍 [Monitor] Events of type "${type}": ${events.length}`);
      events.forEach((event, index) => {
        console.log(`${index + 1}. [${event.timestamp}]:`, event.details);
      });
      return events;
    },
    
    /**
     * Get current connection state
     */
    state: () => {
      const state = streamChatConnectionMonitor.getConnectionStateSnapshot();
      console.log('\n🔍 [Monitor] Current Connection State:');
      console.log(JSON.stringify(state, null, 2));
      return state;
    },
    
    /**
     * Export all events as JSON
     */
    export: () => {
      const json = streamChatConnectionMonitor.exportEvents();
      console.log('\n🔍 [Monitor] Exported Events (JSON):');
      console.log(json);
      return json;
    },
    
    /**
     * Get all events
     */
    all: () => {
      return streamChatConnectionMonitor.getAllEvents();
    },
    
    /**
     * Clear events (useful for testing)
     */
    clear: () => {
      // Note: This doesn't exist in the monitor, but we can log a message
      console.log('⚠️ [Monitor] Clear not implemented. Events are automatically limited to last 100.');
    },
  };
  
  console.log('🔍 [Monitor] StreamChat Connection Monitor available in console:');
  console.log('  - streamChatMonitor.summary() - Print summary');
  console.log('  - streamChatMonitor.recent(20) - Get recent events');
  console.log('  - streamChatMonitor.byType("type") - Get events by type');
  console.log('  - streamChatMonitor.state() - Get current state');
  console.log('  - streamChatMonitor.export() - Export as JSON');
  console.log('  - streamChatMonitor.all() - Get all events');
}

export default streamChatConnectionMonitor;
