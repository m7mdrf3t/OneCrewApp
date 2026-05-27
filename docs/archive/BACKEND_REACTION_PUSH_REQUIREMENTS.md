# Backend Implementation Requirements: Reaction Push Notifications

This document lists what the **backend must implement** to send a push notification when a user reacts to a message, and how to validate it step‑by‑step.

---

## Goal

When **User B reacts** to **User A’s message**, **User A** receives a **push notification**.  
Tapping the notification opens the correct chat conversation.

The mobile app already supports reaction push payloads with:

- `type: "reaction_added"` (recommended)
- `type: "reaction.new"` or `type: "message_reaction"` (accepted)

---

## Where to implement (backend)

You can trigger reaction pushes using **either** of these paths:

### Option A — Stream Webhook (recommended)

1. Enable **Stream webhook** for `reaction.new`.
2. Backend receives the event.
3. Backend sends a push to the **message author**.

**Pros:** Works even if reactions come from any client.  
**Cons:** Requires webhook verification + event handling.

### Option B — Reaction API endpoint

1. Backend handles `addReaction` call.
2. After storing reaction, backend sends a push to the **message author**.

**Pros:** Simple, stays inside existing API.  
**Cons:** Only works if all reactions go through your backend.

---

## Required backend capabilities

### 1) Identify the target user (recipient)

When a reaction happens, determine:

- **Message ID** (reacted message)
- **Message author** (recipient)
- **Conversation / channel**

### 2) Resolve recipient’s device tokens

- **Android:** FCM token  
- **iOS:** if you use FCM for iOS, still FCM token  
- Tokens should already be stored from the app’s push token registration

### 3) Send push via FCM

Use the backend’s **FCM service account key** to send to:

- **`token`** (single device), or
- **`tokens`** (multiple devices)

Include a payload that the app can open:

```json
{
  "notification": {
    "title": "Mina reacted to your message",
    "body": "👍 on \"Nice work\""
  },
  "data": {
    "type": "reaction_added",
    "conversation_id": "user_user-abc123",
    "message_id": "msg-123",
    "reaction_type": "like",
    "reactor_id": "user-456",
    "reactor_name": "Mina"
  }
}
```

If you only have Stream channel info, you can send:

```json
{
  "data": {
    "type": "reaction.new",
    "channel_id": "onecrew_abc123",
    "cid": "messaging:onecrew_abc123",
    "message_id": "msg-123",
    "reaction_type": "like"
  }
}
```

The app will navigate to the chat using:
`conversation_id` → `channel_id` → `cid`.

---

## Environment variables (backend)

You should already have:

- `FCM_SERVICE_ACCOUNT_KEY` (base64 or JSON; valid + unexpired)
- `USE_FCM_FOR_IOS=true` (if iOS pushes go through FCM)

If you use Stream webhook:

- `STREAM_API_SECRET` (for verifying webhook signatures if you implement verification)

---

## Step‑by‑step implementation plan (backend)

### Step 1 — Decide trigger source

Choose **A** (Stream webhook) or **B** (reaction API).

### Step 2 — Add event handling logic

#### A) Stream webhook:

1. Create endpoint:
   ```
   POST /api/webhooks/stream
   ```
2. Verify signature (optional but recommended).
3. Listen for `reaction.new` events.
4. Extract:
   - `message.id`
   - `message.user.id` (recipient)
   - `reaction.user.id` (reactor)
   - `channel_id`, `cid`
5. Send push to message author using FCM.

#### B) Reaction endpoint:

1. In `addReaction` backend handler:
   - Get message info and author
   - Send push to message author

### Step 3 — Store or reuse push tokens

- Ensure you already store tokens from `registerDeviceToken` (FCM/APNs).
- Use the most recent token(s) for the recipient.

### Step 4 — Send FCM push

- Use the FCM Admin SDK or HTTP v1 endpoint.
- Include the payload above.

### Step 5 — Log and monitor

- Log success + failure from FCM.
- Log which message ID and user ID was targeted.

---

## Testing checklist (step‑by‑step)

### 1) Confirm push tokens exist

- User A must have logged in and registered a token
- Confirm in backend logs or DB

### 2) Trigger a reaction

- User B reacts to User A’s message

### 3) Verify push delivery

- User A should receive the push while app is backgrounded
- Tap notification → opens chat to the correct conversation

### 4) Validate logs

- Confirm FCM returned success (no invalid_grant)
- Confirm correct message ID / conversation ID

---

## Status markers (so we can do this together)

When you’re ready, reply with:

```
STEP 1 DONE
```

and we will proceed one step at a time.

