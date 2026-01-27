# Backend Fix Required - Correct Company ID in Channel Creation

## 🔴 Critical Issue

**Problem:**
When a new company (Salt Academy) sends a message to a user (Amrg), the message appears as coming from a different company (Creative spaces).

**Root Cause:**
The backend `createConversation` endpoint is likely using `req.user.sub` which contains the **user ID** (the person who created the company), not the **company ID** when on a company profile.

## How It Should Work

### When on Company Profile:
1. User switches to company profile (e.g., Salt Academy)
2. Frontend calls `/api/chat/token?profile_type=company&company_id={salt_academy_id}`
3. Backend returns token with `user_id: onecrew_company_{salt_academy_id}`
4. Frontend connects StreamChat as `onecrew_company_{salt_academy_id}`
5. When creating conversation, backend should use **company ID** as initiator

### Current Problem:
- Backend `createConversation` uses `req.user.sub` which is the **user ID** (e.g., `06851aee-9f94-4673-94c5-f1f436f979c3`)
- Should use **company ID** (e.g., Salt Academy's ID)
- This causes messages to appear from wrong company or user

## Required Backend Fix

### Option 1: Use Token Claims (RECOMMENDED)

The backend token endpoint should include the company ID in the token claims when `profile_type=company`:

```typescript
// In /api/chat/token endpoint
if (profile_type === 'company' && company_id) {
  // Verify user is owner/admin of company
  const isAuthorized = await verifyCompanyAccess(userId, companyId);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  // Generate token with company ID in claims
  const token = generateStreamChatToken({
    user_id: `onecrew_company_${companyId}`,
    // Add company_id to token claims for createConversation to use
    company_id: companyId,
    user_id_original: userId, // Original user ID for reference
  });
}
```

Then in `createConversation`:
```typescript
export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name } = req.body;
    
    // CRITICAL: Get initiator ID from token claims
    // If company_id is in token, use it; otherwise use user.sub
    const initiatorId = req.user.company_id || req.user.sub;
    const isCompanyProfile = !!req.user.company_id;
    
    // Get ALL participant IDs (including initiator)
    const allParticipantIds = [...new Set([...participant_ids, initiatorId])];
    
    // Generate channel ID with correct initiator
    const otherParticipantId = allParticipantIds.find(id => id !== initiatorId);
    const streamChannelId = `${conversation_type}-${initiatorId}-${otherParticipantId}`;
    
    // ... rest of implementation
  }
};
```

### Option 2: Check StreamChat User ID

Since StreamChat is already connected with the correct company ID, we can infer it:

```typescript
export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name } = req.body;
    
    // Get the StreamChat user ID from the token
    // This should be onecrew_company_{id} when on company profile
    const streamChatUserId = req.user.stream_chat_user_id || req.user.sub;
    
    // Extract company ID from StreamChat user ID if it's a company
    let initiatorId = req.user.sub; // Default to user ID
    if (streamChatUserId.startsWith('onecrew_company_')) {
      // Extract company ID from StreamChat user ID
      initiatorId = streamChatUserId.replace('onecrew_company_', '');
    } else if (streamChatUserId.startsWith('onecrew_user_')) {
      // Extract user ID from StreamChat user ID
      initiatorId = streamChatUserId.replace('onecrew_user_', '');
    }
    
    // ... rest of implementation
  }
};
```

### Option 3: Pass Company ID in Request Body (Frontend Change)

Frontend could pass the company ID explicitly:

```typescript
// Frontend: src/contexts/ApiContext.tsx
const createConversation = async (request) => {
  const requestData = {
    conversation_type: request.conversation_type,
    participant_ids: request.participant_ids,
    ...(request.name && { name: request.name }),
    // Add company_id if on company profile
    ...(currentProfileType === 'company' && activeCompany?.id && {
      company_id: activeCompany.id
    }),
  };
  return await api.chat.createConversation(requestData);
};
```

Backend:
```typescript
export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name, company_id } = req.body;
    
    // Use company_id from request if provided, otherwise use user.sub
    const initiatorId = company_id || req.user.sub;
    
    // ... rest of implementation
  }
};
```

## Recommended Solution

**Option 1 (Token Claims)** is recommended because:
- ✅ Most secure (company ID verified at token generation)
- ✅ No frontend changes needed
- ✅ Consistent with existing token-based auth
- ✅ Backend has full control

## Testing

After implementing:

1. **Create new company** (Salt Academy)
2. **Switch to company profile**
3. **Send message to user** (Amrg)
4. **Verify:**
   - Message shows as from "Salt Academy" (not "Creative spaces")
   - Channel ID includes Salt Academy's ID
   - User receives message from correct company

## Debugging

Check backend logs for:
```
🔍 [createConversation] Channel ID generation:
  initiatorId: "..." (should be Salt Academy ID, not user ID)
  initiatorType: "company"
  streamChannelId: "user_company-{salt_academy_id}-{user_id}"
```

If `initiatorId` is the user ID instead of company ID, the fix isn't working.

## Related Issue: New Companies Not Showing in Admin Portal

This is a separate backend issue. New companies should:
1. Be created with `approval_status: 'pending'`
2. Show in admin portal for approval
3. Only be visible to owner/admin until approved

Check:
- Company creation endpoint sets `approval_status: 'pending'`
- Admin portal filters companies by `approval_status`
- Company visibility logic respects approval status

