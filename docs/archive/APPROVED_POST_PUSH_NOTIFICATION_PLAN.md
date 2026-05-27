# Push Notifications for Approved Posts from Admin Portal

**Goal:** When an admin approves content (company or news post) in the admin portal, the relevant user(s) receive a push notification on the mobile app.

---

## Overview

| Component | Current State | Action Needed |
|-----------|---------------|---------------|
| **Frontend** | FCM + notification handlers exist; `news_post` and `company_approval` flows partially supported | Add `company_approved` handler, ensure backend payloads match |
| **Backend** | Stores push tokens; FCM configured (reactions, messages) | Add push trigger on approval events from admin portal |

---

## 1. What “Approved Post” Means

Two main approval flows from the admin portal:

| Type | Trigger | Recipients |
|------|---------|------------|
| **Company approval** | Admin changes company status `pending` → `approved` | Company owner + admins (users who submitted for approval) |
| **News post approval** | Admin publishes a news post | All app users, or subscribers (depending on product rules) |

This plan covers both. You can implement one or both based on priority.

---

## 2. Backend Plan

### 2.1 Where to Trigger the Push

Identify where the admin portal performs approvals:

1. **Company approval**
   - Endpoint such as `PATCH /api/companies/{id}` or `POST /api/companies/{id}/approve`
   - Or an admin-only API used when admin sets `approval_status: 'approved'`

2. **News post approval**
   - Endpoint such as `POST /api/news/{id}/publish` or `publishNewsPost(id)`
   - Or `PATCH /api/news/{id}` with `published: true`

Add a push notification call right after the approval mutation succeeds.

### 2.2 Push Token Resolution

- Tokens are stored via `POST /api/users/{userId}/push-token`
- For **company approval**: get user IDs of company owner and admins, then resolve their FCM tokens
- For **news post**: decide target (all users vs. a subset), then resolve their FCM tokens from your user/token store

### 2.3 FCM Payloads

Use the same FCM Admin SDK / HTTP v1 flow you use for reactions and chat pushes.

#### Company approval push

```json
{
  "notification": {
    "title": "Company Approved",
    "body": "Your company \"{companyName}\" has been approved."
  },
  "data": {
    "type": "company_approved",
    "company_id": "{companyId}",
    "company_name": "{companyName}"
  }
}
```

#### News post approval push

```json
{
  "notification": {
    "title": "New Article",
    "body": "{postTitle}"
  },
  "data": {
    "type": "news_post",
    "slug": "{postSlug}",
    "newsPostId": "{postId}",
    "title": "{postTitle}"
  }
}
```

### 2.4 Backend Implementation Steps

1. Create a shared `sendPushToUser(userId, payload)` (or similar) that:
   - Looks up FCM tokens for `userId`
   - Sends via FCM Admin SDK
   - Handles invalid tokens (e.g. remove from DB)
   - Logs success/failure

2. Add a `sendPushToUsers(userIds[], payload)` helper for broadcasting to multiple users (e.g. news).

3. For **company approval**:
   - After updating company to `approved`:
     - Get company owner + admins
     - Build `company_approved` payload
     - Call `sendPushToUsers(recipientIds, payload)`

4. For **news post**:
   - After publishing:
     - Decide recipient list (all users, or by segment)
     - Build `news_post` payload with `slug` and `newsPostId`
     - Call `sendPushToUsers(recipientIds, payload)`

5. Add logs and error handling around each push call.

---

## 3. Frontend Plan

### 3.1 Current Support

The app already:

- Registers FCM tokens with the backend
- Handles notification taps (app closed, background, foreground)
- Routes `handleNotificationNavigation` based on `data.type`

| Type | Supported | Action |
|------|-----------|--------|
| `news_post` | ✅ Yes | Navigates to `newsDetail` using `slug` |
| `company_approved` | ❌ No | Add handler |

### 3.2 Add `company_approved` Handler

**Location:** `App.tsx` → `handleNotificationNavigation`

Add a branch for `company_approved`:

```ts
} else if (data.type === 'company_approved') {
  const companyId = typeof data.company_id === 'string' ? data.company_id : null;
  if (companyId) {
    navigateTo('companyProfile', { companyId });
  }
}
```

**Location:** `GlobalModals.tsx` → `handleNotificationPress`

Ensure in-app notification taps also route correctly when `notification.type === 'company_approved'` or `notification.data?.company_id` exists:

```ts
} else if (notification.type === 'company_approved' || notification.data?.company_id) {
  const companyId = notification.data?.company_id;
  if (companyId) {
    navTo('companyProfile', { companyId });
  }
}
```

### 3.3 Backend Notification Record (Optional)

If the backend also creates in-app notification records (e.g. via `/api/notifications`):

- Ensure `type` is `company_approved` or `news_post`
- Ensure `data` includes `company_id` / `slug` / `newsPostId` for routing
- The app will then show these in the NotificationModal and route on tap via `handleNotificationPress`

### 3.4 Navigation Flow Summary

| Notification Type | Navigate To | Required Data |
|-------------------|-------------|---------------|
| `company_approved` | `companyProfile` | `company_id` |
| `news_post` | `newsDetail` | `slug` (or `newsPostId` + slug lookup) |

---

## 4. End-to-End Flow

```
[Admin Portal]  →  Admin approves company / publishes news
       ↓
[Backend API]   →  Approval mutation succeeds
       ↓
[Backend]       →  Resolve recipient user IDs
       ↓
[Backend]       →  Look up FCM tokens from DB
       ↓
[Backend]       →  Send FCM push with data.type + routing fields
       ↓
[Device]        →  FCM delivers notification
       ↓
[User taps]     →  App opens → handleNotificationNavigation(data)
       ↓
[App]           →  navigateTo('companyProfile' | 'newsDetail', params)
```

---

## 5. Testing Checklist

### Backend
- [ ] Push tokens are stored for test users
- [ ] Company approval triggers push to company owner/admins
- [ ] News publish triggers push to intended recipients
- [ ] Payload includes `type`, `company_id`/`slug` as expected
- [ ] FCM returns success for valid tokens
- [ ] Invalid tokens are handled (e.g. removed from DB)

### Frontend
- [ ] `company_approved` notification tap opens company profile
- [ ] `news_post` notification tap opens news detail (already supported)
- [ ] Works when app is closed (initial notification)
- [ ] Works when app is in background (onNotificationOpenedApp)
- [ ] Works when app is in foreground (in-app notification tap)

### Integration
- [ ] Full flow: Admin approves company → User receives push → Tap → Company profile
- [ ] Full flow: Admin publishes news → User receives push → Tap → News detail

---

## 6. Files to Modify

### Backend (admin / API service)
- Approval mutation handlers (company approve, news publish)
- New or existing push service / notification module
- User–push-token lookup logic

### Frontend
- `App.tsx` — add `company_approved` branch in `handleNotificationNavigation`
- `src/components/GlobalModals.tsx` — add `company_approved` handling in `handleNotificationPress`

---

## 7. Environment / Dependencies

- Backend: FCM Admin SDK or HTTP v1 (already used for reactions, chat)
- Ensure `FCM_SERVICE_ACCOUNT_KEY` is configured
- Frontend: No new dependencies; uses existing FCM setup
