# OneCrew API Client - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Installation

```bash
# In your Expo/React Native project
npm install onecrew-api-client
```

### 2. Basic Setup

```typescript
import OneCrewApi from 'onecrew-api-client';

// Initialize the API client
const api = new OneCrewApi('https://your-onecrew-api.com');
await api.initialize();
```

### 3. Authentication

```typescript
// Login
const authResponse = await api.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Check if user is logged in
if (api.auth.isAuthenticated()) {
  const user = api.auth.getCurrentUser();
  console.log('Welcome,', user?.name);
}
```

### 4. Make API Calls

```typescript
// Get users
const usersResponse = await api.getUsers({ page: 1, limit: 10 });

// Get projects
const projectsResponse = await api.getProjects({ status: 'active' });

// Search
const searchResults = await api.searchUsers({ q: 'director' });
```

### 5. React Context Setup (Optional)

```typescript
import { ApiProvider, useApi } from 'onecrew-api-client/examples/ApiContext';

// Wrap your app
<ApiProvider baseUrl="https://your-onecrew-api.com">
  <YourApp />
</ApiProvider>

// Use in components
const { api, isAuthenticated, user } = useApi();
```

## 📱 Complete Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import OneCrewApi from 'onecrew-api-client';

const App = () => {
  const [api] = useState(() => new OneCrewApi('https://your-api.com'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await api.initialize();
    if (api.auth.isAuthenticated()) {
      setUser(api.auth.getCurrentUser());
    }
  };

  const handleLogin = async () => {
    try {
      const authResponse = await api.auth.login({
        email: 'user@example.com',
        password: 'password123'
      });
      setUser(authResponse.user);
    } catch (error) {
      console.error('Login failed:', error.message);
    }
  };

  return (
    <View>
      {user ? (
        <Text>Welcome, {user.name}!</Text>
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
};
```

## 🔧 Configuration

```typescript
// Custom timeout and retries
const api = new OneCrewApi('https://api.com', 15000, 5);

// Custom headers
const response = await api.getUsers({}, {
  headers: { 'X-Custom-Header': 'value' }
});
```

## 📚 Available Methods

### Authentication
- `api.auth.login(credentials)`
- `api.auth.signup(userData)`
- `api.auth.logout()`
- `api.auth.isAuthenticated()`
- `api.auth.getCurrentUser()`

### Users
- `api.getUsers(params)`
- `api.getUserById(id)`
- `api.updateUserProfile(updates)`

### Projects
- `api.getProjects(params)`
- `api.createProject(data)`
- `api.updateProject(id, updates)`
- `api.joinProject(id, role)`

### Teams
- `api.getTeams(params)`
- `api.createTeam(data)`
- `api.joinTeam(data)`

### Search
- `api.searchUsers(params)`
- `api.searchProjects(params)`
- `api.globalSearch(query)`

### Communication
- `api.getConversations(params)`
- `api.sendMessage(conversationId, message)`

## 🛠️ Error Handling

```typescript
try {
  const response = await api.getUsers();
} catch (error) {
  if (error.statusCode === 401) {
    // Handle unauthorized
    await api.auth.logout();
  } else {
    console.error('API Error:', error.message);
  }
}
```

## 📖 Full Documentation

See `README.md` for complete documentation and advanced usage examples.

## 🆘 Need Help?

- Check the examples in the `examples/` folder
- Review the TypeScript types for full API reference
- Contact the OneCrew development team
