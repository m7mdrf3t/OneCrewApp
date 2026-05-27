# 🚨 URGENT Backend Fix - Company ID in Channel Creation

## Critical Issue

**When Salt Academy (new company) sends a message to Amrg, the message appears as coming from "Creative spaces" instead.**

This is because the backend `createConversation` endpoint is using the **user ID** (the person who created the company) instead of the **company ID** when creating channels.

## Quick Fix (Frontend Already Updated)

The frontend now passes `company_id` in the request body when on a company profile. The backend needs to use it:

### Backend Code Change Required

**File:** `src/domains/chat/controllers/chatController.ts` (or wherever `createConversation` is)

**Current Code (WRONG):**
```typescript
export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name } = req.body;
    const userId = req.user.sub; // ❌ This is the USER ID, not company ID!
    
    // Uses user ID as initiator - WRONG for company profiles
    const streamChannelId = `${conversation_type}-${userId}-${otherParticipantId}`;
  }
};
```

**Fixed Code (CORRECT):**
```typescript
export const createConversation = async (req, res, next) => {
  try {
    const { conversation_type, participant_ids, name, company_id } = req.body;
    
    // CRITICAL: Use company_id from request if provided (company profile)
    // Otherwise use user.sub (user profile)
    const initiatorId = company_id || req.user.sub;
    const isCompanyProfile = !!company_id;
    
    console.log('🔍 [createConversation] Initiator determination:', {
      company_id_from_request: company_id,
      user_sub: req.user.sub,
      initiatorId,
      isCompanyProfile,
    });
    
    // Get ALL participant IDs (including initiator)
    const allParticipantIds = [...new Set([...participant_ids, initiatorId])];
    const otherParticipantId = allParticipantIds.find(id => id !== initiatorId);
    
    // Generate channel ID with correct initiator
    const streamChannelId = `${conversation_type}-${initiatorId}-${otherParticipantId}`;
    
    console.log('🔍 [createConversation] Channel ID generation:', {
      conversation_type,
      initiatorId,
      initiatorType: isCompanyProfile ? 'company' : 'user',
      otherParticipantId,
      streamChannelId,
    });
    
    // ... rest of implementation (sync users, create channel, etc.)
  }
};
```

## Why This Happens

1. User creates company (Salt Academy)
2. User switches to company profile
3. Frontend connects StreamChat as `onecrew_company_{salt_academy_id}` ✅
4. But when creating conversation, backend uses `req.user.sub` which is the **user ID** ❌
5. Channel is created with user ID as initiator
6. Messages appear from wrong sender

## Testing

After implementing:

1. Create new company: "Salt Academy"
2. Switch to Salt Academy profile
3. Send message to user "Amrg"
4. **Verify:**
   - Message shows as from "Salt Academy" ✅
   - NOT from "Creative spaces" or user name ✅
   - Channel ID includes Salt Academy's ID ✅

## Backend Logs to Check

After fix, you should see:
```
🔍 [createConversation] Initiator determination:
  company_id_from_request: "salt_academy_id"
  user_sub: "user_id"
  initiatorId: "salt_academy_id" ✅
  isCompanyProfile: true

🔍 [createConversation] Channel ID generation:
  initiatorId: "salt_academy_id" ✅
  initiatorType: "company"
  streamChannelId: "user_company-salt_academy_id-user_id"
```

## Priority: 🔴 CRITICAL

This is causing messages to appear from wrong companies, which is a critical UX issue.

## Related: New Companies Not Showing in Admin Portal

This is a separate issue. Check:
- Company creation sets `approval_status: 'pending'`
- Admin portal queries include pending companies
- Company visibility respects approval status

