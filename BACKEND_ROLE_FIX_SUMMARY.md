# Backend StreamChat Role Fix - Quick Summary

## The Problem
Companies in StreamChat have role 'user' instead of 'admin', causing permission errors.

## The Fix
Add `role` field when upserting users to StreamChat:

```typescript
// BEFORE (WRONG)
{
  id: `onecrew_company_${companyId}`,
  name: company.name,
  image: company.logo_url,
  // Missing role!
}

// AFTER (CORRECT)
{
  id: `onecrew_company_${companyId}`,
  name: company.name,
  image: company.logo_url,
  role: 'admin', // ✅ ADD THIS
}
```

## Where to Fix

1. **`createConversation` endpoint** - When upserting users before creating channel
2. **`getStreamChatToken` endpoint** - When upserting company for token generation
3. **Any other `upsertUsers()` calls** - Ensure role is set

## Test After Fix

```bash
# Company should now have role 'admin' in StreamChat
# Permission errors should be resolved
```

**That's it!** Just add `role: 'admin'` for companies and `role: 'user'` for regular users.

