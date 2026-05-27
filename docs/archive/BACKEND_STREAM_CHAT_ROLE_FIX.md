# Backend StreamChat Role Fix - CRITICAL

## 🔴 Current Issue

**Error:**
```
StreamChat error code 17: GetOrCreateChannel failed with error: 
"User 'onecrew_company_fe045b7c-b310-4295-87e1-d5ceca66e55d' with role 'user' 
is not allowed to perform action ReadChannel in scope 'messaging'"
```

**Root Cause:**
When upserting companies to StreamChat, the backend is **not setting the `role` field**. Companies are being created with the default role 'user', which doesn't have permission to read channels.

## ✅ The Fix

### Problem Location
**File:** Backend code that calls `streamClient.upsertUsers()`

**Current Code (WRONG):**
```typescript
const usersToUpsert = await Promise.all(
  allParticipantIds.map(async (id) => {
    const dbUser = await User.findById(id);
    const isCompany = dbUser?.category === 'company';
    return {
      id: `onecrew_${isCompany ? 'company' : 'user'}_${id}`,
      name: dbUser?.name || 'User',
      image: dbUser?.image_url || dbUser?.logo_url,
      // ❌ MISSING: role field!
    };
  })
);
```

**Fixed Code (CORRECT):**
```typescript
const usersToUpsert = await Promise.all(
  allParticipantIds.map(async (id) => {
    const dbUser = await User.findById(id);
    const isCompany = dbUser?.category === 'company';
    return {
      id: `onecrew_${isCompany ? 'company' : 'user'}_${id}`,
      name: dbUser?.name || 'User',
      image: dbUser?.image_url || dbUser?.logo_url,
      role: isCompany ? 'admin' : 'user', // ✅ CRITICAL: Set role!
    };
  })
);
```

## 🔍 Where This Needs to Be Fixed

### 1. In `createConversation` endpoint
When upserting users before creating channels:
```typescript
// 4. Upsert users in Stream Chat BEFORE adding to channel
const usersToUpsert = await Promise.all(
  allParticipantIds.map(async (id) => {
    const dbUser = await User.findById(id);
    const isCompany = dbUser?.category === 'company';
    return {
      id: `onecrew_${isCompany ? 'company' : 'user'}_${id}`,
      name: dbUser?.name || 'User',
      image: dbUser?.image_url || dbUser?.logo_url,
      role: isCompany ? 'admin' : 'user', // ✅ ADD THIS
    };
  })
);

await streamClient.upsertUsers(usersToUpsert);
```

### 2. In `getStreamChatToken` endpoint
When creating/upserting the user for token generation:
```typescript
// When profile_type is 'company', upsert with admin role
if (profileType === 'company' && companyId) {
  const company = await Company.findById(companyId);
  await streamClient.upsertUsers([{
    id: `onecrew_company_${companyId}`,
    name: company.name,
    image: company.logo_url,
    role: 'admin', // ✅ CRITICAL: Set role to 'admin'
  }]);
}
```

### 3. In any other place that upserts users
Anywhere `streamClient.upsertUsers()` is called, ensure the `role` field is set:
- Regular users: `role: 'user'`
- Companies: `role: 'admin'` (or `'company'` if your StreamChat config supports it)

## 📋 StreamChat Role Options

StreamChat supports these roles:
- `'user'` - Default role, limited permissions
- `'admin'` - Full permissions, can read/write all channels
- `'guest'` - Limited read-only permissions
- `'anonymous'` - No permissions

**For companies, use `'admin'` role** to ensure they have full permissions.

## 🧪 Testing

After the fix, test:

1. **Create conversation from company profile**
2. **Check StreamChat dashboard** - Company user should have role 'admin'
3. **Try to read channel** - Should work without permission errors

## ⚠️ Important Notes

1. **Role must be set during upsert** - Can't change role after user is created
2. **If company already exists in StreamChat with 'user' role**, you may need to:
   - Delete the user from StreamChat dashboard, OR
   - Use StreamChat API to update the role (if supported)
3. **Token generation** - The token itself doesn't need role info, but the user in StreamChat must have the correct role

## 🚨 Priority

**CRITICAL** - This is blocking all company profile messaging functionality.

The fix is simple: **Add `role: isCompany ? 'admin' : 'user'` to all `upsertUsers()` calls.**

