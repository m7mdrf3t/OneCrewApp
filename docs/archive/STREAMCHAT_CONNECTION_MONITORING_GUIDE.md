# StreamChat Connection Monitoring Guide

## Overview

A comprehensive connection monitoring system has been added to track StreamChat connection events, profile switches, and errors. This helps identify where connection issues occur during profile switches.

## What's Monitored

The monitor tracks:

1. **Connection Events**
   - `connection.changed` - When connection state changes (online/offline)
   - `connection.recovered` - When connection is recovered
   - `client.error` - Client-level errors

2. **User Operations**
   - `connectUser.called` - When connectUser is called
   - `connectUser.success` - When connectUser succeeds
   - `connectUser.error` - When connectUser fails
   - `disconnectUser.called` - When disconnectUser is called
   - `disconnectUser.success` - When disconnectUser succeeds

3. **Profile Switches**
   - `profile.switch` - When switching between user/company profiles
   - Includes current connection state at time of switch

4. **Token Access**
   - `token.access` - When tokens are accessed
   - Success/failure status
   - Operation type

5. **Channel Operations**
   - `channel.operation` - When ChannelList tries to query channels
   - Success/failure status
   - Error details

6. **ChannelList State**
   - `channelList.loading` - When ChannelList is in loading state
   - `channelList.rendering` - When ChannelList is rendered
   - `channelList.ready` - When ChannelList is ready
   - `channelList.timeout` - When ChannelList times out

## How to Use

### Automatic Monitoring

Monitoring starts automatically when `StreamChatProvider` mounts. All events are logged to the console with the `🔍 [ConnectionMonitor]` prefix.

### Console Access

The monitor is exposed to the global scope for easy console access:

```javascript
// In React Native debugger console or browser console

// Print summary of recent events and current state
streamChatMonitor.summary()

// Get recent events (default: 20)
streamChatMonitor.recent(50)

// Get events by type
streamChatMonitor.byType('connectUser.error')
streamChatMonitor.byType('profile.switch')
streamChatMonitor.byType('token.access')

// Get current connection state
streamChatMonitor.state()

// Export all events as JSON
streamChatMonitor.export()

// Get all events
streamChatMonitor.all()
```

## Example Usage During Profile Switch

1. **Start the app** - Monitoring begins automatically

2. **Switch to a company profile** - Watch console for:
   ```
   🔍 [ConnectionMonitor] profile.switch { fromProfile: 'user', toProfile: 'company-xxx', ... }
   🔍 [ConnectionMonitor] disconnectUser.called { ... }
   🔍 [ConnectionMonitor] disconnectUser.success { ... }
   🔍 [ConnectionMonitor] connectUser.called { ... }
   🔍 [ConnectionMonitor] connectUser.success { ... }
   ```

3. **Navigate to Messages** - Watch for:
   ```
   🔍 [ConnectionMonitor] channelList.loading { ... }
   🔍 [ConnectionMonitor] channelList.ready { ... }
   🔍 [ConnectionMonitor] channelList.rendering { ... }
   ```

4. **If error occurs** - Check:
   ```
   🔍 [ConnectionMonitor] channel.operation { operation: 'channelList.query', success: false, error: '...' }
   🔍 [ConnectionMonitor] token.access { operation: 'channelList.query', success: false, ... }
   ```

5. **Print summary** - In console:
   ```javascript
   streamChatMonitor.summary()
   ```

## Understanding the Events

### Event Structure

Each event has:
- `timestamp` - ISO timestamp
- `type` - Event type (e.g., 'connectUser.success')
- `details` - Event-specific data
- `stackTrace` - Stack trace (for errors)

### Key Event Types

#### `connectUser.success`
```json
{
  "streamUserId": "onecrew_company_xxx",
  "hasResponse": true,
  "hasMe": true,
  "totalUnreadCount": 0,
  "userID": "onecrew_company_xxx"
}
```

#### `profile.switch`
```json
{
  "fromProfile": "user",
  "toProfile": "company-xxx",
  "companyId": "xxx",
  "currentUserID": "onecrew_user_yyy",
  "isConnected": true,
  "connectionState": "connected"
}
```

#### `token.access` (Error)
```json
{
  "operation": "channelList.query",
  "success": false,
  "userID": null,
  "isConnected": false,
  "error": "Both secret and user tokens are not set..."
}
```

## Troubleshooting

### Issue: "Both secret and user tokens are not set"

**Check these events in order:**

1. `profile.switch` - Was profile switch logged?
2. `disconnectUser.called` - Was disconnect called?
3. `disconnectUser.success` - Did disconnect complete?
4. `connectUser.called` - Was connectUser called?
5. `connectUser.success` - Did connectUser succeed?
6. `connection.changed` - Did connection state change?
7. `channelList.rendering` - When did ChannelList try to render?
8. `token.access` - When did token access fail?

**Example investigation:**
```javascript
// Get all profile switch events
streamChatMonitor.byType('profile.switch')

// Get all token access failures
streamChatMonitor.byType('token.access').filter(e => !e.details.success)

// Get all connectUser events
streamChatMonitor.byType('connectUser')

// Print full summary
streamChatMonitor.summary()
```

### Issue: Connection lost during profile switch

**Check:**
```javascript
// Get connection state changes
streamChatMonitor.byType('connection.changed')

// Get connection recovery events
streamChatMonitor.byType('connection.recovered')

// Get current state
streamChatMonitor.state()
```

### Issue: ChannelList times out

**Check:**
```javascript
// Get timeout events
streamChatMonitor.byType('channelList.timeout')

// Get all channelList events
streamChatMonitor.byType('channelList')
```

## Best Practices

1. **Monitor during testing** - Keep console open and watch for events
2. **Use summary** - Call `streamChatMonitor.summary()` after reproducing issue
3. **Export events** - Use `streamChatMonitor.export()` to save events for analysis
4. **Filter by type** - Use `byType()` to focus on specific event types
5. **Check timestamps** - Events are timestamped to see timing/sequence

## Event Storage

- Events are stored in memory
- Last 100 events are kept (older events are automatically removed)
- Events persist until app restart
- Use `export()` to save events before restart

## Integration Points

The monitor is integrated into:

1. **StreamChatService** (`src/services/StreamChatService.ts`)
   - `connectUser()` calls
   - `disconnectUser()` calls
   - Connection event listeners

2. **StreamChatProvider** (`src/components/StreamChatProvider.tsx`)
   - Profile switches
   - Connection initialization

3. **ConversationsListPage** (`src/pages/ConversationsListPage.tsx`)
   - ChannelList rendering
   - ChannelList errors
   - Ready state changes

## Example Debugging Session

```javascript
// 1. Reproduce the issue (switch profiles, navigate to messages)

// 2. Get summary
streamChatMonitor.summary()

// 3. Check profile switches
streamChatMonitor.byType('profile.switch')

// 4. Check connection events
streamChatMonitor.byType('connection.changed')

// 5. Check errors
streamChatMonitor.byType('token.access').filter(e => !e.details.success)

// 6. Check ChannelList events
streamChatMonitor.byType('channelList')

// 7. Export for analysis
const json = streamChatMonitor.export()
// Copy JSON and analyze in text editor
```

## Notes

- Monitoring is always active (no need to enable)
- Events are logged to console with `🔍 [ConnectionMonitor]` prefix
- Monitor is exposed globally as `streamChatMonitor` for console access
- All events include timestamps for timing analysis
- Error events include stack traces when available
