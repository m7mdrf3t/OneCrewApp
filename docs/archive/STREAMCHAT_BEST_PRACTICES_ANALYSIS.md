# StreamChat Best Practices Analysis & Improvements

## Current Implementation Review

Based on the Stream Chat documentation review, here are the findings and recommended improvements:

## ✅ What We're Doing Well

1. **Presence Tracking**: ✅ Using `presence: true` when watching channels
2. **Channel Watching**: ✅ Properly watching channels with state
3. **Event Listeners**: ✅ Listening to message and channel events
4. **Connection Verification**: ✅ Verifying SDK readiness before use
5. **Error Handling**: ✅ Handling token errors gracefully

## ❌ Missing Best Practices

### 1. Connection Event Listeners (CRITICAL)

**Issue**: We're not listening to client-level `connection.changed` and `connection.recovered` events.

**Documentation Reference**: [Events - Connection Events](https://getstream.io/chat/docs/react-native/event_object/#connection-events)

**Current State**: 
- Only listening to `connection.changed` at channel level in ChatPage
- No client-level connection monitoring

**Best Practice**:
```typescript
// Listen to connection changes at client level
client.on("connection.changed", (e) => {
  if (e.online) {
    console.log("✅ StreamChat: Connection is up!");
    // Re-sync state, refresh channels, etc.
  } else {
    console.log("⚠️ StreamChat: Connection is down!");
    // Show offline indicator, queue operations, etc.
  }
});

client.on("connection.recovered", () => {
  console.log("✅ StreamChat: Connection recovered!");
  // Re-sync all state, refresh unread counts, etc.
});
```

**Impact**: 
- Better connection state management
- Automatic recovery handling
- Better user experience during network issues

---

### 2. Unread Counts - Initial Fetch (IMPORTANT)

**Issue**: We're manually calculating unread counts via `queryChannels`, but we should get initial counts from `connectUser` response.

**Documentation Reference**: [Unread Counts](https://getstream.io/chat/docs/react-native/unread/#reading-unread-counts)

**Current State**:
- `connectUser` response is not being used
- Unread counts calculated manually via `queryChannels`

**Best Practice**:
```typescript
// Step 1: Get initial unread counts when connecting
const user = await client.connectUser({ id: "myid" }, token);

console.log(user.me.total_unread_count); // total unread messages
console.log(user.me.unread_channels); // number of channels with unread messages
console.log(user.me.unread_threads); // number of unread threads

// Step 2: Listen to events for real-time updates
client.on((event) => {
  if (event.total_unread_count !== undefined) {
    console.log("Unread count:", event.total_unread_count);
  }
  if (event.unread_channels !== undefined) {
    console.log("Unread channels:", event.unread_channels);
  }
});
```

**Impact**:
- Faster initial unread count (no need to query all channels)
- More accurate counts
- Better performance

---

### 3. Event Listener Cleanup (IMPORTANT)

**Issue**: Event listeners may not be properly cleaned up, causing memory leaks.

**Documentation Reference**: [Events - Stop Listening](https://getstream.io/chat/docs/react-native/event_object/#stop-listening-for-events)

**Current State**:
- Some listeners are cleaned up, but not all
- Client-level listeners may persist after disconnect

**Best Practice**:
```typescript
// Store subscription references
const connectionListener = client.on("connection.changed", handler);
const unreadListener = client.on((event) => { /* ... */ });

// Cleanup when done
connectionListener.unsubscribe();
unreadListener.unsubscribe();
```

**Impact**:
- Prevents memory leaks
- Better performance
- Prevents duplicate event handlers

---

### 4. Connection State Management (IMPORTANT)

**Issue**: We're using custom connection checks instead of relying on SDK's connection events.

**Documentation Reference**: [Events - Connection Events](https://getstream.io/chat/docs/react-native/event_object/#connection-events)

**Current State**:
- Manual `isConnected()` checks
- Polling connection state
- Custom verification logic

**Best Practice**:
```typescript
// Use SDK's connection state
let isOnline = false;

client.on("connection.changed", (e) => {
  isOnline = e.online;
  // Update UI, enable/disable features, etc.
});
```

**Impact**:
- More reliable connection state
- Less polling/checking
- Better performance

---

### 5. Unread Count Event Listeners (IMPORTANT)

**Issue**: We're manually calculating unread counts instead of listening to events.

**Documentation Reference**: [Unread Counts](https://getstream.io/chat/docs/react-native/unread/#reading-unread-counts)

**Current State**:
- Manual `queryChannels` to calculate unread
- Polling-based updates

**Best Practice**:
```typescript
// Listen to events that update unread counts
client.on("message.new", () => {
  // Unread count will be in the event
});

client.on("notification.mark_read", (event) => {
  // event.total_unread_count is updated
  // event.unread_channels is updated
});

client.on("notification.message_new", (event) => {
  // event.total_unread_count is updated
  // event.unread_channels is updated
});
```

**Impact**:
- Real-time updates
- No need to query channels
- Better performance

---

## Recommended Implementation Plan

### Phase 1: Connection Event Listeners (High Priority)

**File**: `src/services/StreamChatService.ts`

Add connection event listeners:
1. Listen to `connection.changed` 
2. Listen to `connection.recovered`
3. Store connection state
4. Provide connection state getter

### Phase 2: Unread Counts from connectUser (High Priority)

**File**: `src/services/StreamChatService.ts` and `src/components/StreamChatProvider.tsx`

1. Capture `connectUser` response
2. Extract initial unread counts
3. Pass to ApiContext
4. Use as initial value instead of calculating

### Phase 3: Event-Based Unread Updates (Medium Priority)

**File**: `src/contexts/ApiContext.tsx`

1. Listen to unread count events
2. Update state from events
3. Reduce manual `queryChannels` calls
4. Keep manual calculation as fallback

### Phase 4: Proper Event Cleanup (Medium Priority)

**Files**: All files with event listeners

1. Store all listener references
2. Cleanup on disconnect
3. Cleanup on component unmount
4. Prevent duplicate listeners

---

## Implementation Details

### 1. StreamChatService - Connection Events

```typescript
class StreamChatService {
  private connectionListeners: Array<{ unsubscribe: () => void }> = [];
  private isOnline: boolean = false;

  private async _connectUser(...) {
    // ... existing code ...
    
    await client.connectUser(streamUser, token);
    
    // Set up connection event listeners
    this.setupConnectionListeners(client);
    
    // ... rest of code ...
  }

  private setupConnectionListeners(client: StreamChat) {
    // Clean up existing listeners
    this.cleanupConnectionListeners();

    // Listen to connection changes
    const connectionChangedListener = client.on("connection.changed", (e) => {
      this.isOnline = e.online;
      console.log(`💬 [StreamChat] Connection ${e.online ? 'UP' : 'DOWN'}`);
    });

    // Listen to connection recovery
    const connectionRecoveredListener = client.on("connection.recovered", () => {
      this.isOnline = true;
      console.log('✅ [StreamChat] Connection recovered');
    });

    this.connectionListeners = [
      connectionChangedListener,
      connectionRecoveredListener,
    ];
  }

  private cleanupConnectionListeners() {
    this.connectionListeners.forEach(listener => listener.unsubscribe());
    this.connectionListeners = [];
  }

  getConnectionState(): { isOnline: boolean } {
    return { isOnline: this.isOnline };
  }

  async disconnectUser() {
    // ... existing code ...
    this.cleanupConnectionListeners();
    this.isOnline = false;
    // ... rest of code ...
  }
}
```

### 2. StreamChatService - Capture connectUser Response

```typescript
private async _connectUser(...) {
  // ... existing code ...
  
  const response = await client.connectUser(streamUser, token);
  
  // Capture initial unread counts from response
  const initialUnreadCounts = {
    total_unread_count: response.me?.total_unread_count || 0,
    unread_channels: response.me?.unread_channels || 0,
    unread_threads: response.me?.unread_threads || 0,
  };
  
  console.log('💬 [StreamChat] Initial unread counts:', initialUnreadCounts);
  
  // Store for later use (can be accessed via getter)
  this.initialUnreadCounts = initialUnreadCounts;
  
  // ... rest of code ...
}

getInitialUnreadCounts() {
  return this.initialUnreadCounts || {
    total_unread_count: 0,
    unread_channels: 0,
    unread_threads: 0,
  };
}
```

### 3. ApiContext - Event-Based Unread Updates

```typescript
// In calculateStreamChatUnreadCount or separate effect
useEffect(() => {
  if (!streamChatService.isConnected()) return;

  const client = streamChatService.getClient();
  
  // Listen to events that update unread counts
  const handleUnreadUpdate = (event: any) => {
    if (event.total_unread_count !== undefined) {
      setUnreadCount(event.total_unread_count);
    }
    if (event.unread_channels !== undefined) {
      // Update unread channels count if needed
    }
  };

  // Listen to relevant events
  const listeners = [
    client.on("message.new", handleUnreadUpdate),
    client.on("notification.mark_read", handleUnreadUpdate),
    client.on("notification.message_new", handleUnreadUpdate),
    client.on("notification.mark_unread", handleUnreadUpdate),
  ];

  return () => {
    listeners.forEach(listener => listener.unsubscribe());
  };
}, [isAuthenticated, streamChatService.isConnected()]);
```

---

## Testing Checklist

After implementing improvements:

- [ ] Connection events fire correctly
- [ ] Connection recovery works
- [ ] Initial unread counts are accurate
- [ ] Unread counts update in real-time from events
- [ ] Event listeners are cleaned up properly
- [ ] No memory leaks (check with React DevTools)
- [ ] Performance is improved (less queryChannels calls)
- [ ] Works correctly during profile switches
- [ ] Works correctly during network issues

---

## Priority Order

1. **Connection Event Listeners** - Critical for connection state management
2. **Unread Counts from connectUser** - Improves initial load performance
3. **Event-Based Unread Updates** - Reduces unnecessary queries
4. **Event Cleanup** - Prevents memory leaks

---

## Notes

- These improvements follow Stream Chat's official best practices
- They should improve performance and reliability
- They align with the SDK's intended usage patterns
- They should reduce the "tokens not set" errors by better connection management
