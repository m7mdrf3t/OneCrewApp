# Client vs Backend Separation - Firebase Push Notifications

## Overview
This document clarifies what changes belong on the **client side (app)** vs **backend side** for Firebase push notifications.

---

## ✅ CLIENT SIDE (App) - What We Did

### Purpose
The app (client) is responsible for **receiving** notifications and **registering** its device token with the backend.

### Changes Made (Correct ✅)

1. **PushNotificationService.ts**
   - Gets FCM token from Firebase
   - Requests notification permissions
   - Handles token refresh
   - Listens for incoming notifications
   - **Does NOT send notifications** ❌

2. **App.tsx**
   - Handles notification taps
   - Navigates based on notification data
   - Shows notifications in foreground
   - **Does NOT send notifications** ❌

3. **ApiContext.tsx**
   - Registers FCM token with backend via API call
   - Sends token to: `POST /api/users/${userId}/push-token`
   - **Only sends the token, not notifications** ✅

4. **Native Code (iOS/Android)**
   - Initializes Firebase SDK
   - Handles APNs/FCM token registration
   - **Does NOT send notifications** ❌

### What the Client Does:
- ✅ Receives push notifications
- ✅ Gets FCM token from Firebase
- ✅ Sends FCM token to backend (for storage)
- ✅ Handles notification display
- ✅ Handles notification taps/navigation
- ❌ **Does NOT send notifications to other users**

---

## 🔧 BACKEND SIDE - What Needs to Be Done

### Purpose
The backend is responsible for **sending** notifications to users and **storing** FCM tokens.

### Changes Needed (Not Done Yet ⚠️)

1. **Firebase Admin SDK Setup**
   ```javascript
   // Backend only - NOT in the app
   const admin = require('firebase-admin');
   
   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });
   ```

2. **Token Storage**
   - Backend receives FCM tokens via: `POST /api/users/${userId}/push-token`
   - Backend stores tokens in database (associated with user_id)
   - Backend handles token updates when users re-register

3. **Notification Sending Logic**
   ```javascript
   // Backend only - NOT in the app
   async function sendPushNotification(userId, title, body, data) {
     // 1. Get user's FCM token from database
     const user = await getUserById(userId);
     const fcmToken = user.push_token;
     
     // 2. Send via Firebase Admin SDK
     const message = {
       notification: { title, body },
       data: data,
       token: fcmToken,
     };
     
     await admin.messaging().send(message);
   }
   ```

4. **Business Logic**
   - When to send notifications (e.g., new message, task assigned)
   - Which users to notify
   - Notification content
   - **All handled by backend** ✅

### What the Backend Does:
- ✅ Receives FCM tokens from clients
- ✅ Stores FCM tokens in database
- ✅ Sends notifications using Firebase Admin SDK
- ✅ Manages notification business logic
- ✅ Handles notification scheduling/batching
- ❌ **Does NOT receive/display notifications**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT SIDE (App)                        │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  PushNotification│         │   ApiContext     │        │
│  │     Service      │─────────▶│                  │        │
│  │                  │  Token   │  registerPushToken│       │
│  │  - Get FCM token │          │  (POST to backend)│       │
│  │  - Listen for    │          │                  │        │
│  │    notifications │          └────────┬─────────┘       │
│  │  - Handle taps   │                   │                  │
│  └──────────────────┘                   │                  │
│                                          │                  │
│                                          ▼                  │
│                                  ┌──────────────┐          │
│                                  │   Backend    │          │
│                                  │     API      │          │
│                                  └──────────────┘          │
│                                                             │
│  ❌ Does NOT send notifications                             │
│  ✅ Only receives and displays                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   BACKEND SIDE (Server)                     │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐       │
│  │  Token Storage   │         │  Firebase Admin  │       │
│  │   (Database)     │◀─────────│       SDK        │       │
│  │                  │          │                  │       │
│  │  - Store FCM     │          │  - Send          │       │
│  │    tokens        │          │    notifications │       │
│  │  - Associate     │          │  - Manage tokens │       │
│  │    with users    │          │                  │       │
│  └──────────────────┘          └────────┬─────────┘       │
│                                         │                  │
│                                         ▼                  │
│                                  ┌──────────────┐         │
│                                  │   FCM/APNs   │         │
│                                  │   Services   │         │
│                                  └──────────────┘         │
│                                                             │
│  ✅ Sends notifications to clients                         │
│  ❌ Does NOT receive/display notifications                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Status

### ✅ Client Side (App) - COMPLETE
- All client-side changes are done
- App can receive FCM tokens
- App can register tokens with backend
- App can receive and display notifications
- **Properly separated** ✅

### ⚠️ Backend Side - NEEDS WORK
- Backend needs Firebase Admin SDK setup
- Backend needs to update notification sending logic
- Backend needs to handle FCM tokens (instead of Expo tokens)
- **Backend changes are separate and independent**

---

## Key Points

1. **Client and Backend are Independent**
   - Client changes don't require backend changes immediately
   - Backend can be updated separately
   - They communicate via API (`/api/users/${userId}/push-token`)

2. **Token Format Change**
   - **Old**: `ExponentPushToken[...]` (Expo)
   - **New**: `dKx...` (FCM - long alphanumeric string)
   - Backend needs to accept new format

3. **Sending Notifications**
   - **Client**: Never sends notifications ❌
   - **Backend**: Always sends notifications ✅
   - This is correct separation ✅

4. **Receiving Notifications**
   - **Client**: Receives and displays ✅
   - **Backend**: Never receives ❌
   - This is correct separation ✅

---

## Backend Migration Checklist

When updating the backend:

- [ ] Install Firebase Admin SDK: `npm install firebase-admin`
- [ ] Get Firebase service account JSON from Firebase Console
- [ ] Initialize Firebase Admin SDK
- [ ] Update token storage to accept FCM tokens
- [ ] Replace Expo Push API calls with Firebase Admin SDK
- [ ] Update notification sending functions
- [ ] Test sending notifications to FCM tokens
- [ ] Handle both old (Expo) and new (FCM) tokens during migration

---

## Summary

✅ **Client Side Changes (App)**: COMPLETE and properly separated
- Only handles receiving notifications
- Registers tokens with backend
- No business logic for sending

⚠️ **Backend Side Changes**: NEEDS TO BE DONE
- Handles sending notifications
- Stores and manages tokens
- Contains all business logic

**The separation is correct!** The client never sends notifications, and the backend never receives/displays them.


