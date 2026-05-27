# Push Notifications for Message Reactions

This document explains how to send push notifications when **a user reacts to a message**, and how the app will handle the tap to open the correct chat.

---

## What the app expects

The app now supports **reaction push payloads** in `App.tsx`:

- `type: "reaction_added"` (recommended backend type)
- or `type: "reaction.new"` (Stream webhook style)
- or `type: "message_reaction"` (alternate)

It will open the chat when **any** of these are present, using:

- `conversation_id` (preferred), or
- `channel_id`, or
- `cid` (e.g. `"messaging:onecrew_xxx"`)

---

## Recommended payload shape

Send a push with a `data` payload like:

```json
{
  "type": "reaction_added",
  "conversation_id": "user_user-abc123",
  "message_id": "msg-123",
  "reaction_type": "like",
  "reactor_id": "user-456",
  "reactor_name": "Mina"
}
```

If you only have Stream channel info, use:

```json
{
  "type": "reaction.new",
  "channel_id": "onecrew_abc123",
  "cid": "messaging:onecrew_abc123",
  "message_id": "msg-123",
  "reaction_type": "like"
}
```

The app will navigate to the chat using `conversation_id` or `channel_id`/`cid`.

---

## How to trigger the push (backend)

### Option A — Stream webhook (recommended)

1. In **Stream Dashboard → Webhooks**, enable **reaction.new** events.
2. Point the webhook to your backend endpoint.
3. When your backend receives a `reaction.new` event:
   - Identify the **message author** (recipient for the notification).
   - Look up the recipient’s device tokens (FCM for Android, FCM for iOS if you use FCM for iOS).
   - Send a push notification via your backend’s FCM service account.
   - Include the payload fields above.

### Option B — Backend reaction endpoint

If your backend already handles `addReaction()`:

1. After storing the reaction, trigger a push to the message author.
2. Use the payload fields above so the app opens the correct conversation.

---

## Notes

- **Stream does not send reaction pushes by default.**
  You must implement this in your backend (via webhook or reaction endpoint).
- **No app changes needed** beyond this document; the navigation handler already supports reaction payloads.
- **Push test:** Trigger a reaction while the target user is offline and verify they receive a push and it opens the correct chat.
