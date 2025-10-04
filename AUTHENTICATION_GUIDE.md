# OneCrew Authentication & API Integration Guide

This guide explains how to use the authentication system and API integration that has been added to the OneCrew React Native app.

## 🔐 Authentication System

### Features Implemented

- **Login Page** - Email/password authentication
- **Signup Page** - User registration with category and role selection
- **Forgot Password** - Password reset via email
- **Reset Password** - New password creation with token validation
- **Onboarding** - Welcome flow for new users
- **API Context** - Centralized authentication state management
- **Secure Storage** - Token storage using Expo SecureStore

### Authentication Flow

1. **App Launch** → Splash Screen → Check Authentication Status
2. **Not Authenticated** → Login Page
3. **New User Signup** → Signup Page → Onboarding → Main App
4. **Existing User Login** → Main App
5. **Password Reset** → Forgot Password → Email → Reset Password → Login

## 🚀 Getting Started

### 1. Install Dependencies

The required dependencies have been added to `package.json`:

```bash
npm install
```

### 2. API Configuration

Update the API base URL in `App.tsx`:

```typescript
<ApiProvider baseUrl="https://your-onecrew-api.com">
  <SafeAreaProvider>
    <AppContent />
  </SafeAreaProvider>
</ApiProvider>
```

### 3. Environment Setup

Create a `.env` file for environment variables:

```env
ONECREW_API_URL=https://api.onecrew.com
ONECREW_API_TIMEOUT=15000
ONECREW_API_RETRIES=3
```

## 📱 Authentication Pages

### Login Page (`src/pages/LoginPage.tsx`)

**Features:**
- Email and password input with validation
- Show/hide password toggle
- Form validation with error messages
- Loading states during authentication
- Navigation to signup and forgot password

**Usage:**
```typescript
<LoginPage
  onNavigateToSignup={() => setAuthPage('signup')}
  onNavigateToForgotPassword={() => setAuthPage('forgot-password')}
  onLoginSuccess={() => setAuthPage(null)}
/>
```

### Signup Page (`src/pages/SignupPage.tsx`)

**Features:**
- Complete user registration form
- Category selection (Crew, Talent, Company)
- Role selection based on category
- Password confirmation
- Form validation

**Usage:**
```typescript
<SignupPage
  onNavigateToLogin={() => setAuthPage('login')}
  onSignupSuccess={() => setShowOnboarding(true)}
/>
```

### Forgot Password Page (`src/pages/ForgotPasswordPage.tsx`)

**Features:**
- Email input for password reset
- Success state with resend option
- Navigation back to login

**Usage:**
```typescript
<ForgotPasswordPage
  onNavigateToLogin={() => setAuthPage('login')}
  onNavigateToResetPassword={(email) => setResetToken(token)}
/>
```

### Reset Password Page (`src/pages/ResetPasswordPage.tsx`)

**Features:**
- New password input with confirmation
- Password strength requirements
- Token validation
- Success handling

**Usage:**
```typescript
<ResetPasswordPage
  token={resetToken}
  onNavigateToLogin={() => setAuthPage('login')}
  onResetSuccess={() => setAuthPage('login')}
/>
```

### Onboarding Page (`src/pages/OnboardingPage.tsx`)

**Features:**
- Multi-step welcome flow
- Progress indicators
- Skip option
- Feature highlights

**Usage:**
```typescript
<OnboardingPage
  onComplete={() => setShowOnboarding(false)}
  onSkip={() => setShowOnboarding(false)}
/>
```

## 🔧 API Context (`src/contexts/ApiContext.tsx`)

### Features

- **Centralized State Management** - Authentication state across the app
- **API Client Integration** - OneCrew API client with all services
- **Error Handling** - Global error management
- **Loading States** - Loading indicators for async operations
- **Token Management** - Automatic token storage and refresh

### Usage

```typescript
import { useApi } from '../contexts/ApiContext';

const MyComponent = () => {
  const { 
    api, 
    isAuthenticated, 
    user, 
    isLoading, 
    error,
    login, 
    signup, 
    logout 
  } = useApi();

  // Use authentication methods
  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <View>
      {isAuthenticated ? (
        <Text>Welcome, {user?.name}!</Text>
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
};
```

## 🌐 API Integration

### Available Services

The API context provides access to all OneCrew API services:

```typescript
const { api } = useApi();

// Authentication
await api.auth.login({ email, password });
await api.auth.signup({ name, email, password, category, primary_role });
await api.auth.logout();

// Users
const users = await api.getUsers({ page: 1, limit: 10 });
const user = await api.getUserById('user-id');

// Projects
const projects = await api.getProjects({ status: 'active' });
const project = await api.createProject({ title, description, type });

// Teams
const teams = await api.getTeams({ search: 'production' });
const team = await api.createTeam({ name, description });

// Search
const results = await api.searchUsers({ q: 'director', category: 'crew' });
const globalResults = await api.globalSearch('action film');

// Communication
const conversations = await api.getConversations();
await api.sendMessage('conversation-id', { content: 'Hello!' });
```

### Example: HomePage with API Integration

See `src/pages/HomePageWithAPI.tsx` for an example of how to integrate real API calls:

```typescript
const HomePageWithAPI = () => {
  const { api, isAuthenticated } = useApi();
  const [userStats, setUserStats] = useState({ totalUsers: 0, totalProjects: 0 });

  useEffect(() => {
    if (isAuthenticated) {
      loadUserStats();
    }
  }, [isAuthenticated]);

  const loadUserStats = async () => {
    try {
      const [usersResponse, projectsResponse] = await Promise.all([
        api.getUsers({ limit: 1 }),
        api.getProjects({ limit: 1 }),
      ]);
      
      setUserStats({
        totalUsers: usersResponse.pagination?.total || 0,
        totalProjects: projectsResponse.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Use real data in your components
  return (
    <View>
      <Text>Total Users: {userStats.totalUsers}</Text>
      <Text>Total Projects: {userStats.totalProjects}</Text>
    </View>
  );
};
```

## 🔄 State Management

### Authentication State

The app automatically manages authentication state:

```typescript
// Check if user is authenticated
if (isAuthenticated) {
  // User is logged in
  const currentUser = user;
}

// Check loading state
if (isLoading) {
  // Show loading indicator
}

// Handle errors
if (error) {
  // Show error message
}
```

### Navigation State

The app handles navigation between authenticated and unauthenticated states:

- **Unauthenticated** → Login/Signup pages
- **New User** → Onboarding flow
- **Authenticated** → Main app with all features

## 🛡️ Security Features

### Token Management

- **Secure Storage** - Tokens stored using Expo SecureStore
- **Automatic Refresh** - Token refresh on expiration
- **Logout Cleanup** - Complete token removal on logout

### Error Handling

- **Network Errors** - Graceful handling of connection issues
- **Authentication Errors** - Automatic logout on token expiration
- **Validation Errors** - User-friendly error messages

## 🎨 UI/UX Features

### Form Validation

- **Real-time Validation** - Immediate feedback on input
- **Error Messages** - Clear, actionable error text
- **Loading States** - Visual feedback during async operations

### Responsive Design

- **Keyboard Handling** - Proper keyboard avoidance
- **Safe Areas** - Support for notched devices
- **Theme Support** - Dark/light mode compatibility

## 🚀 Next Steps

### 1. Replace Mock Data

Update existing pages to use real API calls:

```typescript
// Instead of mock data
const projects = MOCK_PROJECTS_DATA;

// Use real API data
const { data: projects } = await api.getProjects({ status: 'active' });
```

### 2. Add Error Boundaries

Implement error boundaries for better error handling:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

### 3. Add Offline Support

Implement offline capabilities:

```typescript
// Check network status
const isOnline = useNetInfo().isConnected;

// Cache data for offline use
if (isOnline) {
  await api.getUsers();
} else {
  // Use cached data
}
```

### 4. Add Push Notifications

Integrate push notifications for real-time updates:

```typescript
// Register for notifications
await Notifications.requestPermissionsAsync();

// Handle notification responses
Notifications.addNotificationResponseReceivedListener(response => {
  // Handle notification tap
});
```

## 📚 API Reference

For complete API documentation, see the OneCrew API Client documentation in `onecrew-api-client/README.md`.

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check API base URL configuration
   - Verify network connectivity
   - Check API server status

2. **Authentication Errors**
   - Verify email/password format
   - Check if user account exists
   - Verify API authentication endpoints

3. **Token Issues**
   - Clear app data and re-login
   - Check token expiration
   - Verify secure storage permissions

### Debug Mode

Enable debug logging:

```typescript
// In ApiContext.tsx
console.log('API Response:', response);
console.log('Auth State:', { isAuthenticated, user });
```

## 📞 Support

For issues and questions:
- Check the API client documentation
- Review error messages in console
- Contact the OneCrew development team

---

**Happy Coding! 🎬✨**
