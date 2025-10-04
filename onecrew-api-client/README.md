# OneCrew API Client

A comprehensive TypeScript client library for the OneCrew Backend API, designed specifically for Expo/React Native applications.

## Features

- 🔐 **Complete Authentication System** - Login, signup, token management, and secure storage
- 📱 **Expo/React Native Optimized** - Uses Expo SecureStore for secure token storage
- 🎯 **TypeScript First** - Full type safety with comprehensive type definitions
- 🔄 **Automatic Retry Logic** - Built-in retry mechanism for failed requests
- ⚡ **Request/Response Interceptors** - Easy to extend and customize
- 🛡️ **Error Handling** - Comprehensive error handling with user-friendly messages
- 📊 **Pagination Support** - Built-in support for paginated responses
- 🔍 **Search & Discovery** - Advanced search capabilities across all entities

## Installation

```bash
npm install onecrew-api-client
# or
yarn add onecrew-api-client
```

## Quick Start

```typescript
import OneCrewApi from 'onecrew-api-client';

// Initialize the API client
const api = new OneCrewApi('https://your-api-domain.com');

// Initialize auth state (loads stored tokens)
await api.initialize();

// Login
try {
  const authResponse = await api.auth.login({
    email: 'user@example.com',
    password: 'password123'
  });
  console.log('Logged in:', authResponse.user.name);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

## Authentication

### Login
```typescript
const authResponse = await api.auth.login({
  email: 'user@example.com',
  password: 'password123'
});
```

### Signup
```typescript
const authResponse = await api.auth.signup({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  category: 'talent',
  primary_role: 'actor'
});
```

### Check Authentication Status
```typescript
if (api.auth.isAuthenticated()) {
  const user = api.auth.getCurrentUser();
  console.log('Current user:', user?.name);
}
```

### Logout
```typescript
await api.auth.logout();
```

## User Management

### Get Users
```typescript
// Get all users with pagination
const usersResponse = await api.getUsers({
  page: 1,
  limit: 20,
  search: 'john',
  category: 'talent'
});

console.log('Users:', usersResponse.data);
console.log('Total pages:', usersResponse.pagination.totalPages);
```

### Get User by ID
```typescript
const userResponse = await api.getUserById('user-id-here');
if (userResponse.success) {
  console.log('User:', userResponse.data);
}
```

### Update Profile
```typescript
const updatedUser = await api.auth.updateProfile({
  bio: 'Updated bio',
  location_text: 'New York, NY'
});
```

## Project Management

### Get Projects
```typescript
const projectsResponse = await api.getProjects({
  page: 1,
  limit: 10,
  status: 'active',
  type: 'film'
});
```

### Create Project
```typescript
const newProject = await api.createProject({
  title: 'My New Film',
  description: 'A short film about...',
  type: 'film',
  start_date: '2024-01-01',
  budget: 50000,
  one_day_shoot: false
});
```

### Join Project
```typescript
await api.joinProject('project-id', 'director');
```

## Team Management

### Get Teams
```typescript
const teamsResponse = await api.getTeams({
  page: 1,
  limit: 10,
  search: 'production'
});
```

### Create Team
```typescript
const newTeam = await api.createTeam({
  name: 'Production Team Alpha',
  description: 'Our main production team'
});
```

### Join Team
```typescript
await api.joinTeam({
  team_id: 'team-id',
  role: 'producer'
});
```

## Communication

### Get Conversations
```typescript
const conversationsResponse = await api.getConversations({
  page: 1,
  limit: 20
});
```

### Send Message
```typescript
await api.sendMessage('conversation-id', {
  content: 'Hello everyone!',
  type: 'text'
});
```

### Create Conversation
```typescript
const conversation = await api.createConversation(
  ['user-id-1', 'user-id-2'],
  'Project Discussion'
);
```

## Search

### Search Users
```typescript
const searchResults = await api.searchUsers({
  q: 'director',
  category: 'crew',
  location: 'Los Angeles',
  skills: ['cinematography', 'editing'],
  page: 1,
  limit: 20
});
```

### Global Search
```typescript
const globalResults = await api.globalSearch('action film', {
  page: 1,
  limit: 10
});

console.log('Users:', globalResults.data.users);
console.log('Projects:', globalResults.data.projects);
console.log('Teams:', globalResults.data.teams);
```

### Search Suggestions
```typescript
const suggestions = await api.getSearchSuggestions('direct');
// Returns: [{ type: 'user', text: 'Director Name', ... }, ...]
```

## File Upload

```typescript
const uploadResponse = await api.uploadFile({
  uri: 'file://path/to/image.jpg',
  type: 'image/jpeg',
  name: 'profile-picture.jpg'
});

console.log('File uploaded:', uploadResponse.data.url);
```

## Error Handling

The API client provides comprehensive error handling:

```typescript
try {
  const response = await api.getUsers();
} catch (error) {
  if (error.statusCode === 401) {
    // Handle unauthorized
    await api.auth.logout();
  } else if (error.statusCode === 403) {
    // Handle forbidden
    console.log('Access denied');
  } else if (error.message.includes('Network')) {
    // Handle network errors
    console.log('Check your internet connection');
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

## Configuration

### Custom Timeout and Retries
```typescript
const api = new OneCrewApi('https://api.example.com', 15000, 5);
// timeout: 15 seconds, retries: 5
```

### Custom Headers
```typescript
// Headers are automatically managed, but you can add custom ones:
const response = await api.getUsers({}, {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

## TypeScript Support

The library is fully typed. Import types as needed:

```typescript
import { 
  User, 
  Project, 
  Team, 
  ApiResponse, 
  PaginatedResponse,
  SearchParams 
} from 'onecrew-api-client';
```

## React Native Integration

### With React Context
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import OneCrewApi from 'onecrew-api-client';

const ApiContext = createContext<OneCrewApi | null>(null);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api] = useState(() => new OneCrewApi('https://your-api-domain.com'));
  
  useEffect(() => {
    api.initialize();
  }, [api]);
  
  return (
    <ApiContext.Provider value={api}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return api;
};
```

### Usage in Components
```typescript
import React, { useEffect, useState } from 'react';
import { useApi } from './ApiContext';
import { User } from 'onecrew-api-client';

const UserProfile: React.FC = () => {
  const api = useApi();
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const loadUser = async () => {
      if (api.auth.isAuthenticated()) {
        setUser(api.auth.getCurrentUser());
      }
    };
    loadUser();
  }, [api]);
  
  return (
    <View>
      {user && <Text>Welcome, {user.name}!</Text>}
    </View>
  );
};
```

## License

MIT

## Support

For issues and questions, please contact the OneCrew development team.
