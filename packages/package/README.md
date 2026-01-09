# OneCrew API Client

A TypeScript/JavaScript client library for the OneCrew Backend API, designed for Expo and React Native applications.

## Installation

```bash
npm install onecrew-api-client
```

## Quick Start

```typescript
import { OneCrewApi } from 'onecrew-api-client';

// Initialize the API client
const api = new OneCrewApi('https://your-api-url.com');

// Initialize authentication
await api.initialize();

// Example: Login and manage user details
await api.auth.login({ 
  email: 'user@example.com', 
  password: 'password' 
});

// Create user details
const userDetails = await api.createUserDetails({
  gender: 'female',
  birthday: '1998-05-15', // Date string in ISO format (YYYY-MM-DD)
  nationality: 'American',
  height_cm: 165,
  weight_kg: 58,
  skin_tone: 'medium',
  hair_color: 'brown',
  willing_to_travel: true
});

// Get user details
const details = await api.getUserDetails();
console.log('User details:', details.data);

// Example: Managing talent profile with dropdowns
const [hairColors, skinTones, profile] = await Promise.all([
  api.getAvailableHairColors(),
  api.getAvailableSkinTones(),
  api.getTalentProfile()
]);

// Create dropdown options with current selection
const hairColorOptions = hairColors.data.map(option => ({
  id: option.id,
  name: option.name,
  selected: option.id === profile.data.hair_color_id
}));

const skinToneOptions = skinTones.data.map(option => ({
  id: option.id,
  name: option.name,
  selected: option.id === profile.data.skin_tone_id
}));

// Update talent profile
await api.updateTalentProfile({
  hair_color_id: 'selected-hair-color-id',
  skin_tone_id: 'selected-skin-tone-id',
  eye_color: 'brown',
  height_cm: 175,
  weight_kg: 70
});
```

## Features

- 🔐 **Authentication**: JWT token management with secure storage
- 👥 **User Management**: Get, update, and manage user profiles
- 📋 **User Details**: Complete user profile details management
- 🎭 **Talent Profile**: Comprehensive talent profile management
- 🛠️ **Skills Management**: Add, remove, and manage user skills
- 🎯 **Abilities**: Manage abilities with proficiency levels
- 🌍 **Languages**: Multi-language support with proficiency levels
- 🖼️ **Portfolio**: Media portfolio management (images/videos)
- 🎬 **Project Management**: Create, join, and manage film projects
- 👥 **Team Management**: Create and manage teams
- 💬 **Communication**: Real-time messaging powered by StreamChat with reactions, threading, search, and moderation
- 🔔 **Push Notifications**: iOS and Android push notification support
- 🔍 **Search**: Advanced search across users, projects, and teams
- 📁 **File Upload**: Upload files and media
- 📱 **React Native Ready**: Optimized for Expo and React Native

## API Methods

### User Management
- `getUsers(params?)` - Get all users with filters
- `getUserById(userId)` - Get user by ID
- `getUserByIdDirect(userId)` - Direct user endpoint
- `updateUserProfile(updates)` - Update current user profile (supports category and primary_role with validation)
- `deleteUser()` - Delete current user

### User Details Management
- `getUserDetails(userId?)` - Get user details (current user or by ID)
- `createUserDetails(details)` - Create user details
- `updateUserDetails(updates)` - Update current user's details
- `updateUserDetailsById(userId, updates)` - Update specific user's details
- `patchUserDetails(updates)` - Partial update of current user's details
- `deleteUserDetails(userId?)` - Delete user details

### Talent Profile Management
- `getTalentProfile()` - Get current user's talent profile
- `updateTalentProfile(updates)` - Update talent profile
- `patchTalentProfile(updates)` - Partial update of talent profile
- `getAvailableHairColors()` - Get all available hair colors for dropdowns
- `getAvailableSkinTones()` - Get all available skin tones for dropdowns

### Skills Management
- `getAvailableSkills()` - Get all available skills
- `getUserSkills()` - Get user's current skills
- `addUserSkill(skillId)` - Add skill to user profile
- `removeUserSkill(skillId)` - Remove skill from user profile

### Abilities Management
- `getAvailableAbilities()` - Get all available abilities
- `getUserAbilities()` - Get user's current abilities
- `addUserAbility(abilityId, proficiency)` - Add ability with proficiency (1-5)
- `updateUserAbility(abilityId, proficiency)` - Update ability proficiency
- `removeUserAbility(abilityId)` - Remove ability from user profile

### Languages Management
- `getAvailableLanguages()` - Get all available languages
- `getUserLanguages()` - Get user's current languages
- `addUserLanguage(languageId, level)` - Add language with proficiency level
- `removeUserLanguage(languageId)` - Remove language from user profile

### Portfolio Management
- `getUserPortfolio()` - Get user's portfolio items
- `addPortfolioItem(item)` - Add image/video to portfolio
- `updatePortfolioItem(itemId, updates)` - Update portfolio item
- `removePortfolioItem(itemId)` - Remove portfolio item

### Project Management
- `getProjects(params?)` - Get all projects
- `getProjectById(projectId)` - Get project by ID
- `createProject(projectData)` - Create new project
- `updateProject(projectId, updates)` - Update project
- `getMyProjects(params?)` - Get user's projects (supports `include_deleted` parameter)
- `getDeletedProjects(params?)` - Get user's deleted projects only
- `deleteProject(projectId)` - Soft delete a project
- `restoreProject(projectId)` - Restore a soft-deleted project
- `joinProject(projectId, role?)` - Join a project
- `leaveProject(projectId)` - Leave a project

### Team Management
- `getTeams(params?)` - Get all teams
- `getTeamById(teamId)` - Get team by ID
- `createTeam(teamData)` - Create new team
- `joinTeam(teamData)` - Join a team
- `leaveTeam(teamId)` - Leave a team

### Communication
- `getConversations(params?)` - Get user conversations
- `createConversation(participantIds, name?)` - Create conversation
- `getMessages(conversationId, params?)` - Get conversation messages
- `sendMessage(conversationId, messageData)` - Send message

### Chat (StreamChat Integration)

The chat system is powered by StreamChat, providing real-time messaging with advanced features. Use `api.chat.*` for all chat operations.

**Installation:**
```bash
npm install stream-chat
```

**Basic Usage:**
```typescript
// Get StreamChat token
const { token, user_id } = (await api.chat.getStreamChatToken()).data;

// Initialize StreamChat client (for real-time features)
import { StreamChat } from 'stream-chat';
const client = StreamChat.getInstance('YOUR_STREAM_API_KEY');
await client.connectUser({ id: user_id }, token);
```

**Core Chat Methods:**
- `chat.getStreamChatToken()` - Get StreamChat authentication token
- `chat.createConversation(data)` - Create a new conversation
- `chat.getConversations(params?)` - List conversations (supports `profile_type`, `company_id`, `search`)
- `chat.getConversationById(conversationId)` - Get conversation details
- `chat.sendMessage(conversationId, data)` - Send a message
- `chat.getMessages(conversationId, params?)` - Get messages (supports `include`, `sender_type`, pagination)
- `chat.editMessage(messageId, data)` - Edit a message
- `chat.deleteMessage(messageId, conversationId)` - Delete a message
- `chat.markMessageAsRead(messageId, conversationId)` - Mark message as read
- `chat.markAllAsRead(conversationId, messageIds?)` - Mark all messages as read

**Advanced Features:**
- **Reactions**: `addReaction()`, `removeReaction()`, `getReactions()`
- **Threading**: `createThreadReply()`, `getThreadReplies()`
- **Pinning**: `pinMessage()`, `unpinMessage()`, `getPinnedMessages()`
- **Search**: `searchMessages()`, `searchInConversation()`
- **Channel Management**: `updateChannel()`, `addMember()`, `removeMember()`, `getMembers()`
- **Moderation**: `addModerator()`, `banUser()`, `muteUser()`, `flagMessage()`, `getFlaggedMessages()`
- **Translation**: `translateMessage()`

**Examples:**

```typescript
// Profile-scoped conversation lists
const personalConversations = await api.chat.getConversations({ profile_type: 'user' });
const companyConversations = await api.chat.getConversations({ profile_type: 'company' });

// Send message with reply
await api.chat.sendMessage(conversationId, {
  content: 'Hello!',
  message_type: 'text',
  reply_to_message_id: 'parent-message-id'
});

// Add reaction
await api.chat.addReaction(messageId, {
  reaction_type: 'like',
  conversation_id: conversationId
});

// Search messages
const results = await api.chat.searchMessages({
  query: 'project deadline',
  conversation_id: conversationId,
  limit: 20
});
```

**Real-time Features (StreamChat Client SDK):**
```typescript
// Watch channel for real-time updates
const channel = client.channel('messaging', conversationId);
await channel.watch();

// Listen for new messages
channel.on('message.new', (event) => {
  console.log('New message:', event.message);
});

// Typing indicators
channel.keystroke(); // User is typing
channel.stopTyping(); // User stopped typing
```

For complete documentation, see:
- [StreamChat Client Guide](./STREAMCHAT_CLIENT_GUIDE.md)
- [StreamChat Quick Reference](./STREAMCHAT_QUICK_REFERENCE.md)

### Push Notifications
- `pushNotifications.registerDeviceToken(token, platform, deviceId?, appVersion?)` - Register device token for push notifications
- `pushNotifications.unregisterDeviceToken(token)` - Unregister device token
- `pushNotifications.getDeviceTokens()` - Get user's registered device tokens

**Example:**
```typescript
// Register device token after login
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Get push token (Expo)
const { data: token } = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-project-id'
});

// Register with backend
await api.pushNotifications.registerDeviceToken(
  token,
  Platform.OS === 'ios' ? 'ios' : 'android',
  'device-id-123',
  '1.0.0'
);

// Unregister on logout
await api.pushNotifications.unregisterDeviceToken(token);
```

See [CLIENT_PUSH_NOTIFICATION_INTEGRATION.md](../CLIENT_PUSH_NOTIFICATION_INTEGRATION.md) for complete integration guide.

### Search
- `searchUsers(params)` - Search users
- `searchProjects(params)` - Search projects
- `searchTeams(params)` - Search teams
- `globalSearch(query, params?)` - Global search
- `getSearchSuggestions(query)` - Get search suggestions

### File Upload
- `uploadFile(file)` - Upload file

## Examples

### User Profile Management with Category-Role Validation

```typescript
// Update role only (must match current category)
// If user is 'crew', role must be a crew role (director, producer, etc.)
// If user is 'talent', role must be a talent role (actor, singer, etc.)
await api.updateUserProfile({
  primary_role: 'director' // Must match user's category
});

// Update category and role together (must match)
// Switch from crew to talent
await api.updateUserProfile({
  category: 'talent',
  primary_role: 'actor' // Must be a talent role
});

// Switch from talent to crew
await api.updateUserProfile({
  category: 'crew',
  primary_role: 'producer' // Must be a crew role
});

// Update basic profile fields (no validation)
await api.updateUserProfile({
  name: 'New Name',
  bio: 'Updated bio',
  location_text: 'New Location',
  phone: '+1234567890'
});

// Custom roles work for any category
await api.updateUserProfile({
  primary_role: 'custom_role_code' // Custom roles bypass category validation
});
```

**Note:** The API validates that roles match user categories. If validation fails, you'll receive a clear error message explaining the issue.

### Talent Profile Management

```typescript
// Get talent profile
const talentProfile = await api.getTalentProfile();
console.log('Talent profile:', talentProfile.data);

// Update talent profile
const updatedProfile = await api.updateTalentProfile({
  height_cm: 175,
  weight_kg: 70,
  eye_color: 'brown',
  travel_ready: true,
  union_member: false
});
```

### Skills Management

```typescript
// Get available skills
const availableSkills = await api.getAvailableSkills();
console.log('Available skills:', availableSkills.data);

// Get user's current skills
const userSkills = await api.getUserSkills();
console.log('User skills:', userSkills.data);

// Add a skill to user profile
const skillToAdd = availableSkills.data[0];
const addedSkill = await api.addUserSkill(skillToAdd.id);
console.log('Added skill:', addedSkill.data);

// Remove a skill from user profile
await api.removeUserSkill(skillToAdd.id);
```

### Abilities Management

```typescript
// Get available abilities
const availableAbilities = await api.getAvailableAbilities();
console.log('Available abilities:', availableAbilities.data);

// Add ability with proficiency level (1-5)
const abilityToAdd = availableAbilities.data[0];
const addedAbility = await api.addUserAbility(abilityToAdd.id, 4);
console.log('Added ability:', addedAbility.data);

// Update ability proficiency
await api.updateUserAbility(abilityToAdd.id, 5);
```

### Languages Management

```typescript
// Get available languages
const availableLanguages = await api.getAvailableLanguages();
console.log('Available languages:', availableLanguages.data);

// Add language with proficiency level
const languageToAdd = availableLanguages.data[0];
const addedLanguage = await api.addUserLanguage(languageToAdd.id, 'native');
console.log('Added language:', addedLanguage.data);
```

### Portfolio Management

```typescript
// Get user's portfolio
const portfolio = await api.getUserPortfolio();
console.log('Portfolio items:', portfolio.data);

// Add portfolio item
const newItem = await api.addPortfolioItem({
  kind: 'image',
  url: 'https://example.com/image.jpg',
  caption: 'My headshot',
  sort_order: 1
});
console.log('Added portfolio item:', newItem.data);

// Update portfolio item
await api.updatePortfolioItem(newItem.data.id, {
  caption: 'Updated headshot caption',
  sort_order: 2
});
```

### Account Deletion with Grace Period

```typescript
// Request account deletion (requires password confirmation)
const deletionRequest = await api.requestAccountDeletion('your-password');
console.log('Deletion requested');
console.log('Expiration date:', deletionRequest.data?.expirationDate);
console.log('Days remaining:', deletionRequest.data?.daysRemaining);

// Check deletion status
const status = await api.getAccountDeletionStatus();
if (status.data?.isPending) {
  console.log('Account deletion pending');
  console.log('Days remaining:', status.data.daysRemaining);
}

// Restore account within grace period
if (status.data?.isPending && status.data.daysRemaining > 0) {
  await api.restoreAccount();
  console.log('Account restored successfully');
}
```

## Configuration

```typescript
const api = new OneCrewApi(
  'https://your-api-url.com', // Base URL
  30000, // Timeout in milliseconds (optional)
  3 // Number of retries (optional)
);
```

## Authentication

The client automatically handles JWT token storage and refresh:

```typescript
// Login
const authResponse = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Check if user is authenticated
const isAuthenticated = await api.auth.isAuthenticated();

// Logout
await api.auth.logout();
```

### Google Sign-In (Supabase OAuth)

Google sign-in now uses Supabase OAuth. You must first authenticate with Supabase, then send the access token to the backend:

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Option 1: Using signInWithOAuth (redirect flow)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'yourapp://auth/callback'
  }
});

// After OAuth completes, get the session
const { data: { session } } = await supabase.auth.getSession();

// Send Supabase access token to backend
if (session) {
  const authResponse = await api.auth.signInWithGoogle(
    session.access_token,
    'crew', // category (required for new users)
    'director' // primary_role (optional)
  );
}

// Option 2: Using signInWithIdToken (if using Google Sign-In SDK)
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: googleIdToken
});

if (data.session) {
  await api.auth.signInWithGoogle(data.session.access_token, 'crew');
}
```

**Note:** Make sure Google OAuth is configured in your Supabase Dashboard (Authentication > Providers > Google).

### Apple Sign-In (Supabase OAuth)

Apple sign-in uses Supabase OAuth. You must first authenticate with Supabase, then send the access token to the backend:

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Option 1: Using signInWithOAuth (redirect flow)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: 'yourapp://auth/callback'
  }
});

// After OAuth completes, get the session
const { data: { session } } = await supabase.auth.getSession();

// Send Supabase access token to backend
if (session) {
  const authResponse = await api.auth.signInWithApple(
    session.access_token,
    'crew', // category (required for new users)
    'director' // primary_role (optional)
  );
}

// Option 2: Using signInWithIdToken (if using native Apple Sign-In SDK)
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: appleIdToken,
  nonce: rawNonce
});

if (data.session) {
  await api.auth.signInWithApple(data.session.access_token, 'crew');
}
```

**Note:** Make sure Apple OAuth is configured in your Supabase Dashboard (Authentication > Providers > Apple). You'll need an Apple Developer account and Service ID setup.

## Error Handling

All methods return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Example usage
const response = await api.getUserById('user-id');
if (response.success) {
  console.log('User data:', response.data);
} else {
  console.error('Error:', response.error);
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions for all API responses and request parameters.

## License

MIT

## Support

For support and questions, please contact the OneCrew team.