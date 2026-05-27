# Verification Checklist - Company Profile Messaging Fix

## ✅ All Fixes Applied

### Backend Fixes ✅
1. ✅ Token endpoint reads query parameters (`profile_type`, `company_id`)
2. ✅ Returns correct user ID format (`onecrew_company_...` for companies)
3. ✅ Upserts companies with `role: 'admin'` in StreamChat
4. ✅ Upserts users with `role: 'user'` in StreamChat
5. ✅ Syncs users before adding to channels

### Frontend Fixes ✅
1. ✅ Passes profile parameters when requesting tokens
2. ✅ Reconnects StreamChat when profile changes
3. ✅ Determines conversation type correctly
4. ✅ Improved error handling

## 🧪 Test Steps

### Step 1: Verify Token Endpoint
```bash
# Test company token
curl -X POST "https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app/api/chat/token?profile_type=company&company_id=fe045b7c-b310-4295-87e1-d5ceca66e55d" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  | jq '.data.user_id'
```

**Expected:** `"onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d"`

### Step 2: Test in App

1. **Login as user**
   - StreamChat should connect as: `onecrew_user_06851aee-9f94-4673-94c5-f1f436f979c3`
   - Check logs: `💬 [StreamChatProvider] Token details`

2. **Switch to company profile**
   - StreamChat should reconnect as: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`
   - Check logs: Should see `🔄 [StreamChatProvider] Profile changed, reconnecting...`
   - Verify: `currentStreamUserId` matches `expectedUserId`

3. **Create conversation from company profile**
   - Navigate to a user profile
   - Click "Send Message"
   - Check logs:
     - `💬 [ChatPage] Determining conversation type: {"conversationType": "user_company", ...}`
     - `💬 [ChatPage] StreamChat connection details: {"currentStreamUserId": "onecrew_company_...", ...}`
   - **Should NOT see permission errors**

4. **Verify channel access**
   - Channel should load without errors
   - Should be able to send messages
   - Should see message list

## 🔍 What to Check in Logs

### When Switching to Company Profile:
```
💬 [StreamChatProvider] Fetching token for current profile...
💬 Getting StreamChat token... { profile_type: 'company', company_id: '...' }
✅ StreamChat token retrieved successfully
💬 [StreamChatProvider] Token details: {
  expectedUserId: "onecrew_company_...",
  currentConnectedUserId: "onecrew_user_...",
  needsReconnect: true
}
🔄 [StreamChatProvider] Profile changed, reconnecting...
💬 [StreamChatProvider] Connecting user... { userId: "onecrew_company_...", userType: "company" }
💬 [StreamChatProvider] Connection result: {
  connected: true,
  clientUserId: "onecrew_company_...",
  expectedUserId: "onecrew_company_...",
  match: true
}
```

### When Creating Conversation:
```
💬 [ChatPage] Determining conversation type: {
  conversationType: "user_company",
  currentType: "company",
  participantType: "user"
}
💬 [ChatPage] StreamChat connection details: {
  currentStreamUserId: "onecrew_company_...",
  expectedType: "company",
  expectedPrefix: "onecrew_company_"
}
✅ Conversation created successfully
💬 [ChatPage] Backend returned conversation ID: user_company-...
💬 [ChatPage] Creating channel instance...
✅ [ChatPage] Conversation prepared successfully
```

## ⚠️ If You Still See Permission Errors

### Check 1: Company Role in StreamChat
1. Go to StreamChat Dashboard: https://dashboard.getstream.io/
2. Navigate to **Chat** → **Users**
3. Search for: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`
4. **Verify Role = `admin`** (not `user`)

**If role is still 'user':**
- The company was created before the backend fix
- **Solution:** Delete the company user from StreamChat dashboard, or ask backend to re-sync

### Check 2: Channel Members
1. In StreamChat Dashboard, go to **Chat** → **Channels**
2. Find channel: `user_company-3565728146948a62810a0ae483151108`
3. Check **Members** tab
4. **Verify:** `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d` is in members list

### Check 3: Frontend Connection
Check logs for:
```
💬 [ChatPage] StreamChat connection details: {
  currentStreamUserId: "onecrew_company_...",  // ✅ Should be company
  expectedType: "company",                      // ✅ Should match
}
```

**If `currentStreamUserId` is still `onecrew_user_...`:**
- StreamChatProvider didn't reconnect
- Check if `needsReconnect` was true
- Check if reconnection succeeded

## 🎯 Expected Final State

After all fixes:
- ✅ Company token: `onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d`
- ✅ Company role in StreamChat: `admin`
- ✅ StreamChat connected as company
- ✅ Can read channels without permission errors
- ✅ Can send messages as company

## 📝 Summary

**All fixes are complete:**
1. ✅ Backend sets role correctly
2. ✅ Backend returns correct token
3. ✅ Frontend requests correct token
4. ✅ Frontend reconnects correctly

**If permission errors persist:**
- Check StreamChat dashboard for company role
- Verify company user exists with `role: 'admin'`
- If role is wrong, delete and re-sync the company

The implementation is complete and ready for testing!

