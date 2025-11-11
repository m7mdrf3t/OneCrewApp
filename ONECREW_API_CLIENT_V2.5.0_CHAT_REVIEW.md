# OneCrew API Client v2.5.0 - Chat Feature Review

## Update Status
✅ **Successfully updated from v2.4.0 to v2.5.0**

## Package Information
- **Current Version**: v2.5.0
- **Previous Version**: v2.4.0
- **Repository**: https://github.com/onecrew/onecrew-api-client

## 🆕 New Chat/Messaging Feature (v2.5.0)

Version 2.5.0 introduces a comprehensive chat and messaging system that enables real-time communication between users and companies.

### Available Chat Methods

#### 1. Conversation Management

**`getConversations(params?)`**
- Get all conversations for the current user/company
- Parameters:
  - `page?: number` - Page number for pagination
  - `limit?: number` - Number of conversations per page
- Returns: `PaginatedResponse<ChatConversation[]>`
- Features:
  - Returns conversations sorted by last message time
  - Includes last message preview
  - Shows participant information
  - Supports pagination

**`getConversationById(conversationId: string)`**
- Get detailed information about a specific conversation
- Returns: `ApiResponse<ChatConversation>`
- Features:
  - Full conversation details
  - Participant list
  - Recent messages (if included)
  - Conversation metadata

**`createConversation(request: CreateConversationRequest)`**
- Create a new conversation
- Parameters:
  - `conversation_type: 'user_user' | 'user_company' | 'company_company'`
  - `participant_ids: string[]` - Array of participant IDs
  - `name?: string` - Optional conversation name (for group chats)
- Returns: `ApiResponse<ChatConversation>`
- Features:
  - Automatically handles participant addition
  - Supports different conversation types
  - Can create group conversations with a name

#### 2. Message Management

**`getMessages(conversationId: string, params?)`**
- Get messages from a specific conversation
- Parameters:
  - `conversationId: string` - The conversation ID
  - `params?: { page?: number; limit?: number; before?: string }`
    - `page` - Page number for pagination
    - `limit` - Number of messages per page
    - `before` - Get messages before a specific timestamp
- Returns: `PaginatedResponse<ChatMessage[]>`
- Features:
  - Paginated message history
  - Supports fetching older messages
  - Includes sender information
  - Shows read receipts
  - Includes reply-to message references

**`sendMessage(conversationId: string, messageData: SendChatMessageRequest)`**
- Send a message to a conversation
- Parameters:
  - `conversationId: string` - The conversation ID
  - `messageData:`
    - `content?: string` - Text content of the message
    - `message_type?: 'text' | 'image' | 'file' | 'system'` - Type of message
    - `file_url?: string` - URL for file/image messages
    - `file_name?: string` - Original filename
    - `file_size?: number` - File size in bytes
    - `reply_to_message_id?: string` - ID of message being replied to
- Returns: `ApiResponse<ChatMessage>`
- Features:
  - Supports text, image, and file messages
  - Reply-to functionality
  - File attachment support
  - System messages

### Type Definitions

#### ChatConversation
```typescript
export interface ChatConversation {
  id: string;
  conversation_type: 'user_user' | 'user_company' | 'company_company';
  name?: string; // For group conversations
  last_message_at?: string;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  participants?: ChatParticipant[];
  messages?: ChatMessage[];
}
```

#### ChatMessage
```typescript
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'company';
  sender_id: string;
  sent_by_user_id?: string; // For company messages sent by a user
  content?: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
  sent_at: string;
  edited_at?: string;
  deleted_at?: string;
  sender_user?: User;
  sender_company?: Company;
  sent_by_user?: User;
  reply_to_message?: ChatMessage;
  reads?: ChatMessageRead[];
}
```

#### ChatParticipant
```typescript
export interface ChatParticipant {
  id: string;
  conversation_id: string;
  participant_type: 'user' | 'company';
  participant_id: string;
  joined_at: string;
  left_at?: string;
  last_read_at?: string;
  muted_until?: string;
  created_at: string;
  deleted_at?: string;
  user?: User;
  company?: Company;
}
```

#### ChatMessageRead
```typescript
export interface ChatMessageRead {
  id: string;
  message_id: string;
  participant_type: 'user' | 'company';
  participant_id: string;
  read_at: string;
}
```

### Conversation Types

The chat system supports three types of conversations:

1. **`user_user`** - Direct messages between two users
2. **`user_company`** - Messages between a user and a company
3. **`company_company`** - Messages between two companies

### Message Types

1. **`text`** - Standard text message
2. **`image`** - Image attachment
3. **`file`** - File attachment (documents, etc.)
4. **`system`** - System-generated messages (e.g., "User joined conversation")

### Key Features

#### 1. Multi-Participant Support
- Conversations can have multiple participants
- Supports group conversations with optional names
- Participant management (join/leave)

#### 2. Read Receipts
- Track which participants have read messages
- `last_read_at` timestamp per participant
- `reads` array on messages showing who read them

#### 3. Message Replies
- Reply to specific messages
- `reply_to_message_id` links messages
- Full reply context available

#### 4. File Attachments
- Support for images and files
- File metadata (name, size, URL)
- Separate handling for different file types

#### 5. Message Editing & Deletion
- Messages can be edited (`edited_at` timestamp)
- Messages can be soft-deleted (`deleted_at` timestamp)
- Maintains message history

#### 6. Typing Indicators
- Support for typing indicators (via `ChatTypingIndicator` type)
- Real-time typing status

#### 7. Muting Conversations
- Participants can mute conversations (`muted_until` timestamp)
- Temporary or permanent muting

## Implementation Status

### ✅ Completed
- [x] Package updated to v2.5.0
- [x] Chat methods added to `ApiContext.tsx`
- [x] Type definitions reviewed
- [x] Method implementations with caching

### ⏳ Pending Implementation

#### UI Components Needed
1. **Conversation List Page**
   - Display all conversations
   - Show last message preview
   - Unread message indicators
   - Search/filter conversations
   - Sort by recent activity

2. **Chat Interface**
   - Message display with sender info
   - Message input with send button
   - File/image attachment support
   - Reply-to message display
   - Read receipts
   - Typing indicators
   - Message editing/deletion
   - Scroll to load older messages

3. **Conversation Creation**
   - Start new conversation from user profile
   - Select participants
   - Choose conversation type
   - Group conversation naming

4. **Integration Points**
   - "Message" button on profile pages (already exists in `ProfileDetailPage.tsx`)
   - Navigation to chat from various screens
   - Notification integration for new messages

### Current State

#### Existing Code
- `CommunicationComponent.tsx` exists but uses mock data
- `handleStartChat` function in `App.tsx` navigates to 'chat' page
- Profile pages have "Message" button that calls `onStartChat`

#### What Needs to Be Done
1. Replace mock data in `CommunicationComponent.tsx` with real API calls
2. Create conversation list page/screen
3. Implement real-time message updates (if available via Supabase)
4. Add file/image upload functionality
5. Implement message reply UI
6. Add read receipt indicators
7. Add typing indicators
8. Handle conversation creation flow

## Code Examples

### Getting Conversations
```typescript
const { getConversations } = useApi();

// Get all conversations
const response = await getConversations({ page: 1, limit: 20 });
if (response.success) {
  const conversations = response.data.data;
  const pagination = response.data.pagination;
}
```

### Creating a Conversation
```typescript
const { createConversation } = useApi();

// Start a conversation with a user
const response = await createConversation({
  conversation_type: 'user_user',
  participant_ids: [otherUserId]
});

if (response.success) {
  const conversation = response.data;
  // Navigate to chat screen
}
```

### Getting Messages
```typescript
const { getMessages } = useApi();

// Get messages for a conversation
const response = await getMessages(conversationId, {
  page: 1,
  limit: 50
});

if (response.success) {
  const messages = response.data.data;
  // Display messages in chat UI
}
```

### Sending a Message
```typescript
const { sendMessage } = useApi();

// Send a text message
const response = await sendMessage(conversationId, {
  content: 'Hello!',
  message_type: 'text'
});

// Send a reply
const response = await sendMessage(conversationId, {
  content: 'This is a reply',
  message_type: 'text',
  reply_to_message_id: originalMessageId
});

// Send an image
const response = await sendMessage(conversationId, {
  message_type: 'image',
  file_url: imageUrl,
  file_name: 'photo.jpg',
  file_size: 1024000
});
```

## Integration with Existing Features

### Notification Integration
- New messages trigger `message_received` notifications
- Can use existing notification system to alert users
- Real-time updates via Supabase subscriptions

### Profile Integration
- "Message" button already exists on profile pages
- Need to implement the actual chat flow
- Should check if conversation exists or create new one

### Project Integration
- Could add project-specific conversations
- Team communication within projects
- Task-related messaging

## Next Steps

### Phase 1: Basic Chat Implementation
1. Create `ConversationsListPage.tsx`
2. Create `ChatPage.tsx` for individual conversations
3. Update `CommunicationComponent.tsx` to use real API
4. Implement conversation creation flow
5. Basic message sending/receiving

### Phase 2: Enhanced Features
1. File/image upload and attachment
2. Message replies
3. Read receipts
4. Message editing/deletion
5. Typing indicators

### Phase 3: Real-Time Updates
1. Supabase integration for real-time messages
2. Real-time typing indicators
3. Online status indicators
4. Push notifications for new messages

### Phase 4: Advanced Features
1. Message search
2. Conversation search
3. Message reactions (if supported)
4. Group conversation management
5. Conversation archiving

## Breaking Changes
- ✅ **No breaking changes** - This is a non-breaking update
- All existing functionality continues to work
- Chat features are additive

## Summary

Version 2.5.0 adds a **comprehensive chat/messaging system** with:

- ✅ Full conversation management (create, list, get details)
- ✅ Message sending and retrieval
- ✅ Support for text, image, and file messages
- ✅ Reply-to functionality
- ✅ Read receipts
- ✅ Multi-participant conversations
- ✅ User-to-user, user-to-company, and company-to-company messaging
- ✅ Message editing and deletion
- ✅ Typing indicators support
- ✅ Conversation muting

The chat feature is **ready for implementation** and can significantly enhance user communication within the OneCrew platform.

---

**Ready to implement?** Start with Phase 1 to get basic chat functionality working, then progressively add enhanced features.

