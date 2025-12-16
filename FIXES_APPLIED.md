# Fixes Applied - Backend Compatibility

## Date: 2025-01-27

## Issues Fixed

### ✅ 1. Token Registration Payload Updated

**File**: `src/contexts/ApiContext.tsx`

**Changes**:
- Changed field name from `push_token` to `token` (matches backend expectations)
- Added `device_id` field (generates and stores a unique device identifier)
- Added `app_version` field (retrieved from `expo-constants`)

**New Payload Format**:
```json
{
  "token": "fcm_token_here",
  "platform": "ios" | "android",
  "device_id": "ios-1234567890-abc123",
  "app_version": "1.0.0"
}
```

**Implementation Details**:
- Device ID is generated once and stored in AsyncStorage (`@onecrew:device_id`)
- App version is retrieved from `Constants.expoConfig?.version`
- Falls back to `Constants.manifest?.version` or `"1.0.0"` if not available

---

### ✅ 2. Token Refresh Auto Re-registration

**Files**: 
- `src/services/PushNotificationService.ts`
- `src/contexts/ApiContext.tsx`

**Changes**:
- Added `onTokenRefreshCallback` mechanism to `PushNotificationService`
- Callback is automatically called when FCM token refreshes
- Callback is set up when user logs in (both regular and Google sign-in)
- Callback is cleared when user logs out

**Flow**:
1. User logs in → Callback is registered
2. FCM token refreshes → Callback is triggered
3. Callback calls `registerPushToken()` automatically
4. Token is re-registered with backend
5. User logs out → Callback is cleared

**Methods Added**:
- `setOnTokenRefreshCallback(callback: (token: string) => void)`
- `clearTokenRefreshCallback()`

---

### ✅ 3. Fixed TypeScript Linter Errors

**File**: `src/services/PushNotificationService.ts`

**Issue**: `Platform.Version` can be `string | number`, causing type errors

**Fix**: Added type checking and conversion:
```typescript
const androidVersion = typeof Platform.Version === 'number' 
  ? Platform.Version 
  : parseInt(String(Platform.Version), 10);
```

---

## Code Changes Summary

### `src/contexts/ApiContext.tsx`

1. **Updated `registerPushToken` function**:
   - Added device ID generation/storage
   - Added app version retrieval
   - Changed `push_token` to `token`
   - Added `device_id` and `app_version` to payload

2. **Added token refresh callback setup**:
   - Set up callback in both login functions (regular and Google)
   - Callback automatically re-registers token when it refreshes
   - Clears callback on logout

### `src/services/PushNotificationService.ts`

1. **Added callback mechanism**:
   - `onTokenRefreshCallback` property
   - `setOnTokenRefreshCallback()` method
   - `clearTokenRefreshCallback()` method
   - Automatic callback invocation on token refresh

2. **Fixed TypeScript errors**:
   - Proper handling of `Platform.Version` type

---

## Testing Checklist

Before testing, verify:

- [ ] API endpoint is correct (`/api/users/${userId}/push-token`)
- [ ] Backend accepts the new payload format:
  - `token` (not `push_token`)
  - `platform`
  - `device_id`
  - `app_version`

### Test Scenarios

1. **Initial Token Registration**:
   - [ ] Login to app
   - [ ] Check logs for "📱 Registering FCM token with backend"
   - [ ] Verify backend receives correct payload format
   - [ ] Check backend logs for successful registration

2. **Token Refresh**:
   - [ ] Wait for token refresh (or trigger manually if possible)
   - [ ] Check logs for "📱 Token refreshed, re-registering with backend..."
   - [ ] Verify backend receives updated token
   - [ ] Check backend logs for successful re-registration

3. **Logout**:
   - [ ] Logout from app
   - [ ] Verify callback is cleared
   - [ ] Verify token is cleared

---

## Backend Compatibility

### Expected Backend Endpoint

**URL**: `POST /api/users/{userId}/push-token`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

**Request Body**:
```json
{
  "token": "fcm_token_string",
  "platform": "ios" | "android",
  "device_id": "unique_device_identifier",
  "app_version": "1.0.0"
}
```

**Response**: Should return success status (200 OK)

---

## Notes

1. **Device ID**: Currently uses a simple generated identifier. If you need a more robust solution (e.g., using device hardware ID), consider:
   - `react-native-device-info` package
   - `expo-device` with additional methods
   - Native modules for device identification

2. **App Version**: Retrieved from Expo constants. If you need a different version source, update the code accordingly.

3. **Token Refresh**: Happens automatically when:
   - App is restored on a new device
   - App is reinstalled
   - Firebase rotates tokens for security
   - App data is cleared

---

## Status

✅ **All fixes applied and ready for testing**

The app now:
- Sends correct payload format to backend
- Automatically re-registers tokens on refresh
- Handles logout properly
- Has no linter errors

**Next Step**: Test with backend to verify everything works correctly.








