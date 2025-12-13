# Push Notifications & Firebase iOS Setup Review

## Review Date: 2025-01-27
## Current Status: Using Expo Push Notifications

---

## Executive Summary

**Current Implementation**: ✅ Using Expo Push Notifications (`expo-notifications`)
**Firebase Integration**: ❌ Not configured
**iOS APNs Setup**: ⚠️ Partially configured (missing entitlements)

The app currently uses **Expo's Push Notification service**, which is simpler but has limitations. This document reviews the current setup and provides guidance for migrating to **Firebase Cloud Messaging (FCM)** for iOS, which offers more control and better backend integration.

---

## Current Implementation Analysis

### ✅ What's Working

1. **PushNotificationService.ts** - Well-structured service class
   - Handles permission requests
   - Token registration and storage
   - Notification listeners (received & response)
   - Badge management
   - Error handling

2. **Expo Notifications Plugin** - Configured in `app.json`
   ```json
   [
     "expo-notifications",
     {
       "icon": "./assets/icon.png",
       "color": "#000000",
       "sounds": [],
       "mode": "production"
     }
   ]
   ```

3. **Token Registration** - Integrated in `ApiContext.tsx`
   - Registers token after login
   - Clears token on logout
   - Backend endpoint: `/api/users/${userId}/push-token`

4. **App Integration** - Properly initialized in `App.tsx`
   - Notification listeners set up
   - Handles notification taps
   - Navigation handling

### ⚠️ Current Limitations

1. **iOS Entitlements Missing**
   - `OneCrew.entitlements` file is **empty**
   - Missing `aps-environment` entitlement (required for iOS push notifications)
   - This will prevent push notifications from working on iOS standalone builds

2. **Expo Push Token Limitations**
   - Tokens are Expo-specific (format: `ExponentPushToken[...]`)
   - Requires Expo's push notification service as intermediary
   - Less direct control over notification delivery
   - Backend must use Expo's API to send notifications

3. **No Firebase Integration**
   - No `GoogleService-Info.plist` file
   - No Firebase SDK installed
   - Cannot use Firebase Cloud Messaging directly

---

## Firebase Cloud Messaging (FCM) for iOS

### Why Consider Firebase FCM?

**Advantages:**
- ✅ Direct integration with backend (no Expo intermediary)
- ✅ More control over notification payloads
- ✅ Better analytics and delivery tracking
- ✅ Supports rich notifications (images, actions, etc.)
- ✅ Works seamlessly with Firebase backend services
- ✅ Can send notifications directly from backend without Expo API

**Disadvantages:**
- ❌ More complex setup (requires Firebase project)
- ❌ Requires APNs certificate/key configuration
- ❌ Additional native dependencies
- ❌ More configuration steps

### Current vs Firebase Comparison

| Feature | Expo Push Notifications | Firebase FCM |
|---------|------------------------|---------------|
| Setup Complexity | Simple | Moderate |
| Token Format | `ExponentPushToken[...]` | FCM Token (long string) |
| Sending Method | Expo API or backend | Direct from backend |
| iOS APNs | Handled by Expo | Manual configuration |
| Rich Notifications | Limited | Full support |
| Analytics | Basic | Advanced |
| Backend Integration | Requires Expo API | Direct HTTP/Admin SDK |

---

## Current iOS Configuration Issues

### 1. Missing Entitlements ⚠️

**File**: `ios/OneCrew/OneCrew.entitlements`
**Current State**: Empty
**Required**: Push notification entitlements

**Fix Required**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string> <!-- Change to "production" for App Store builds -->
  </dict>
</plist>
```

### 2. Info.plist Configuration ✅

**Status**: Properly configured
- Bundle identifier: `com.minaezzat.onesteps`
- URL schemes configured
- Permission descriptions present

### 3. AppDelegate.swift ⚠️

**Current State**: Basic Expo setup
**For Firebase**: Would need Firebase initialization

---

## Migration Path: Expo → Firebase FCM

### Option 1: Keep Expo (Recommended for Simplicity)

**Pros:**
- ✅ Already implemented
- ✅ Minimal changes needed
- ✅ Works with current backend

**Required Fixes:**
1. Add `aps-environment` to entitlements
2. Configure APNs in Apple Developer Portal
3. Upload APNs key to Expo (via EAS)

**Steps:**
1. **Fix Entitlements** (see above)
2. **Configure APNs in Apple Developer:**
   - Create APNs Authentication Key (.p8 file)
   - Note Key ID and Team ID
3. **Upload to Expo:**
   ```bash
   eas credentials
   # Select iOS → Push Notifications → Add new
   # Upload .p8 file and enter Key ID & Team ID
   ```
4. **Rebuild app:**
   ```bash
   eas build --platform ios
   ```

### Option 2: Migrate to Firebase FCM (More Control)

**Pros:**
- ✅ Direct backend integration
- ✅ Better for production scale
- ✅ More features and control

**Cons:**
- ❌ More setup complexity
- ❌ Requires Firebase project
- ❌ Need to update backend

**Implementation Steps:**

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or use existing
3. Add iOS app with bundle ID: `com.minaezzat.onesteps`
4. Download `GoogleService-Info.plist`

#### Step 2: Configure APNs in Firebase

1. **Get APNs Authentication Key:**
   - Apple Developer Portal → Certificates, Identifiers & Profiles → Keys
   - Create new key with "Apple Push Notifications service (APNs)"
   - Download `.p8` file
   - Note Key ID and Team ID

2. **Upload to Firebase:**
   - Firebase Console → Project Settings → Cloud Messaging
   - Under "Apple app configuration" → Upload `.p8` file
   - Enter Key ID and Team ID

#### Step 3: Install Firebase Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**Note**: Since you're using Expo, you'll need to use `expo-build-properties` or eject to bare workflow for native Firebase modules.

#### Step 4: Add GoogleService-Info.plist

1. Place `GoogleService-Info.plist` in `ios/OneCrew/`
2. Add to Xcode project (drag into project navigator)
3. Ensure it's added to target

#### Step 5: Update iOS Entitlements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>development</string>
  </dict>
</plist>
```

#### Step 6: Update AppDelegate.swift

```swift
import Expo
import React
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  // ... existing code ...

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()
    
    // ... existing Expo setup ...
    
    // Request notification permissions
    UNUserNotificationCenter.current().delegate = self
    let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
    UNUserNotificationCenter.current().requestAuthorization(
      options: authOptions,
      completionHandler: { _, _ in }
    )
    application.registerForRemoteNotifications()
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // Handle APNs token
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }
  
  // Handle notification received in foreground
  public override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([[.alert, .sound, .badge]])
  }
  
  // Handle notification tap
  public override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}
```

#### Step 7: Update PushNotificationService.ts

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PushNotificationService {
  // ... existing code ...

  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get FCM token instead of Expo token
      const token = await messaging().getToken();
      console.log('📱 FCM token:', token);

      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      this.token = token;

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        console.log('📱 FCM token refreshed:', newToken);
        await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, newToken);
        this.token = newToken;
        // Re-register with backend
        // await registerPushToken(newToken, userId);
      });

      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  // Handle background notifications
  setupBackgroundMessageHandler() {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📨 Message handled in background:', remoteMessage);
    });
  }

  // Handle foreground notifications
  addNotificationReceivedListener(
    listener: (notification: any) => void
  ) {
    return messaging().onMessage(async remoteMessage => {
      console.log('📨 Notification received in foreground:', remoteMessage);
      listener(remoteMessage);
    });
  }
}
```

#### Step 8: Update Backend Integration

Backend needs to send notifications via Firebase Admin SDK instead of Expo API:

```javascript
// Backend example (Node.js)
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPushNotification(fcmToken, title, body, data) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data,
    token: fcmToken,
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
```

---

## Recommendation

### For Current State: Fix Expo Implementation

**Immediate Actions:**
1. ✅ Add `aps-environment` to `OneCrew.entitlements`
2. ✅ Configure APNs in Apple Developer Portal
3. ✅ Upload APNs key to Expo via EAS
4. ✅ Rebuild iOS app

**This will make Expo push notifications work on iOS.**

### For Future: Consider Firebase Migration

**When to Migrate:**
- Need direct backend control
- Want advanced notification features
- Scaling to high volume
- Need better analytics

**Migration Complexity:** Medium-High
**Estimated Time:** 2-3 days

---

## Testing Checklist

### Expo Push Notifications
- [ ] Entitlements file has `aps-environment`
- [ ] APNs key uploaded to Expo
- [ ] App rebuilt with EAS
- [ ] Test on physical iOS device
- [ ] Verify token registration
- [ ] Send test notification via Expo API
- [ ] Verify notification received
- [ ] Test notification tap handling

### Firebase FCM (if migrating)
- [ ] Firebase project created
- [ ] `GoogleService-Info.plist` added
- [ ] APNs key uploaded to Firebase
- [ ] Firebase SDK installed
- [ ] AppDelegate updated
- [ ] PushNotificationService updated
- [ ] Test FCM token generation
- [ ] Send test notification via Firebase Console
- [ ] Verify notification received
- [ ] Test background/foreground handling

---

## Current Code Locations

### Key Files
- **Service**: `src/services/PushNotificationService.ts`
- **Integration**: `src/contexts/ApiContext.tsx` (lines 6176-6208)
- **App Setup**: `App.tsx` (lines 116-229)
- **iOS Config**: `ios/OneCrew/OneCrew.entitlements` (⚠️ needs fix)
- **iOS Config**: `ios/OneCrew/Info.plist` (✅ OK)
- **iOS Code**: `ios/OneCrew/AppDelegate.swift` (basic setup)

### Backend Endpoint
- **Token Registration**: `POST /api/users/${userId}/push-token`
- **Current Payload**: `{ push_token: string, platform: 'ios' | 'android' }`

---

## Next Steps

1. **Immediate (Expo Fix):**
   - [ ] Fix entitlements file
   - [ ] Configure APNs in Apple Developer
   - [ ] Upload APNs key to Expo
   - [ ] Rebuild and test

2. **Future (Firebase Migration - Optional):**
   - [ ] Evaluate if Firebase benefits justify migration
   - [ ] Create Firebase project
   - [ ] Follow migration steps above
   - [ ] Update backend to use Firebase Admin SDK
   - [ ] Test thoroughly

---

## Resources

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging iOS Setup](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Apple Push Notifications Guide](https://developer.apple.com/documentation/usernotifications)
- [EAS Credentials Management](https://docs.expo.dev/app-signing/managed-credentials/)

---

**Document Created**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Status**: Review Complete

