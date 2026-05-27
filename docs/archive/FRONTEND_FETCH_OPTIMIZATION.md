# Frontend Fetch Optimization - Prevent Unnecessary Double Fetching

## Issues Found

### 1. ⚠️ CompanyProfilePage - Unnecessary Cache Clearing

**File:** `src/pages/CompanyProfilePage.tsx` (line 169-179)

**Problem:** Always clears cache before fetching, forcing a fetch every time even if data is fresh.

**Current Code:**
```typescript
queryFn: async () => {
  // Always clear rate-limiter cache to ensure fresh data
  await rateLimiter.clearCacheByPattern(`company-${companyId}`);
  const coreCompanyResponse = await getCompany(companyId);
  // ...
}
```

**Issue:** This clears cache on every query, even when React Query already has cached data. The cache should only be cleared when `refreshKey` changes (user explicitly refreshes).

**Fix:** Only clear cache when refreshKey changes, not on every fetch.

---

### 2. ⚠️ CompanyEditPage - Unnecessary Fetch on Mount

**File:** `src/pages/CompanyEditPage.tsx` (line 196-237)

**Problem:** Always fetches company data on mount, even if we already have complete company data from props.

**Current Code:**
```typescript
useEffect(() => {
  const loadCompany = async () => {
    const response = await getCompany(company.id, {...});
    // ...
  };
  loadCompany();
}, [company.id]);
```

**Issue:** If `company` prop already has all the fields needed for editing, we don't need to fetch again.

**Fix:** Check if we already have required fields before fetching.

---

### 3. ⚠️ AccountSwitcherModal - Fetches on Every Visibility Change

**File:** `src/components/AccountSwitcherModal.tsx` (line 58-62)

**Problem:** Fetches companies every time modal becomes visible.

**Current Code:**
```typescript
useEffect(() => {
  if (visible && user?.id) {
    loadCompanies();
  }
}, [visible, user?.id]);
```

**Issue:** If companies are already loaded and user hasn't changed, we don't need to fetch again.

**Fix:** Add a check to see if companies are already loaded.

---

### 4. ✅ StreamChatProvider - Already Optimized

**File:** `src/components/StreamChatProvider.tsx`

**Status:** Already optimized - skips token fetch if already connected to correct user (line 119-142).

---

### 5. ⚠️ ProfileCompletionPage - Too Many Dependencies

**File:** `src/pages/ProfileCompletionPage.tsx` (line 594)

**Problem:** useEffect has many dependencies that might trigger unnecessary fetches.

**Current Dependencies:**
```typescript
}, [visible, currentUser?.id, routeParams.user?.id, userProp?.id, isGuest, isAuthenticated, getAccessToken, getBaseUrl, fetchedUserDetails, fetchedTalentProfile]);
```

**Issue:** `getAccessToken` and `getBaseUrl` are functions that might be recreated, causing unnecessary re-runs.

**Fix:** Remove function dependencies or memoize them.

---

## Fixes to Apply

### Fix 1: CompanyProfilePage - Conditional Cache Clearing

```typescript
// BEFORE (line 168-179):
queryFn: async () => {
  // Always clear rate-limiter cache to ensure fresh data
  await rateLimiter.clearCacheByPattern(`company-${companyId}`);
  const coreCompanyResponse = await getCompany(companyId);
  // ...
}

// AFTER:
queryFn: async () => {
  // Only clear cache if refreshKey changed (user explicitly refreshed)
  // React Query will handle caching, so we don't need to clear on every fetch
  if (refreshKey > 0) {
    try {
      const { rateLimiter } = await import('../utils/rateLimiter');
      await rateLimiter.clearCacheByPattern(`company-${companyId}`);
      if (__DEV__) {
        console.log(`🧹 [CompanyProfile] Cleared cache due to refreshKey change`);
      }
    } catch (err) {
      console.warn('⚠️ Could not clear cache:', err);
    }
  }
  
  const coreCompanyResponse = await getCompany(companyId);
  // ...
}
```

### Fix 2: CompanyEditPage - Check Before Fetching

```typescript
// BEFORE (line 196-237):
useEffect(() => {
  const loadCompany = async () => {
    const response = await getCompany(company.id, {...});
    // ...
  };
  loadCompany();
}, [company.id]);

// AFTER:
useEffect(() => {
  // Check if we already have all required fields
  const requiredFields = ['name', 'description', 'bio', 'website_url', 'location_text', 
    'address', 'city', 'country', 'email', 'phone', 'establishment_date', 
    'contact_email', 'contact_phone', 'contact_address', 'social_media_links', 
    'subcategory', 'approval_status'];
  
  const hasAllFields = requiredFields.every(field => 
    company[field] !== undefined && company[field] !== null
  );
  
  if (hasAllFields) {
    // Already have all data, just update form
    setCurrentCompany(company);
    setFormData({
      name: company.name || '',
      description: company.description || '',
      // ... rest of fields
    });
    setLoading(false);
    return;
  }
  
  // Only fetch if we're missing required fields
  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await getCompany(company.id, {
        fields: requiredFields
      });
      // ... rest of logic
    } catch (error) {
      console.error('Failed to reload company data:', error);
    } finally {
      setLoading(false);
    }
  };
  loadCompany();
}, [company.id, company.name, company.description]); // Add specific fields to deps
```

### Fix 3: AccountSwitcherModal - Skip If Already Loaded

```typescript
// BEFORE (line 58-62):
useEffect(() => {
  if (visible && user?.id) {
    loadCompanies();
  }
}, [visible, user?.id]);

// AFTER:
useEffect(() => {
  if (visible && user?.id) {
    // Only fetch if companies list is empty or user changed
    if (companies.length === 0 || (user?.id && !companies.some(c => {
      const companyData = getCompanyData(c);
      return companyData?.owner?.id === user.id || 
             (c.role === 'owner' || c.role === 'admin');
    }))) {
      loadCompanies();
    } else {
      console.log('✅ Companies already loaded, skipping fetch');
    }
  }
}, [visible, user?.id]); // Note: companies.length not in deps to avoid loop
```

### Fix 4: ProfileCompletionPage - Remove Function Dependencies

```typescript
// BEFORE (line 594):
}, [visible, currentUser?.id, routeParams.user?.id, userProp?.id, isGuest, isAuthenticated, getAccessToken, getBaseUrl, fetchedUserDetails, fetchedTalentProfile]);

// AFTER:
// Remove getAccessToken and getBaseUrl from dependencies - they're stable functions
}, [visible, currentUser?.id, routeParams.user?.id, userProp?.id, isGuest, isAuthenticated, fetchedUserDetails, fetchedTalentProfile]);
```

---

## Summary of Optimizations

| Component | Issue | Fix | Impact |
|-----------|-------|-----|--------|
| CompanyProfilePage | Always clears cache | Only clear on refreshKey change | ✅ Reduces unnecessary fetches |
| CompanyEditPage | Always fetches on mount | Check if data exists first | ✅ Prevents redundant fetches |
| AccountSwitcherModal | Fetches every visibility | Check if already loaded | ✅ Prevents duplicate fetches |
| ProfileCompletionPage | Too many deps | Remove function deps | ✅ Prevents unnecessary re-runs |
| StreamChatProvider | ✅ Already optimized | N/A | ✅ No changes needed |

---

## Additional Optimizations Already in Place

1. ✅ **getUserByIdDirect** - Cached with deduplication (5 min TTL)
2. ✅ **getStreamChatToken** - Memoized with useCallback
3. ✅ **ProfileDetailPage** - Checks if data exists before fetching
4. ✅ **Rate Limiter** - Caching and request deduplication

---

## Testing Checklist

After applying fixes:

- [ ] CompanyProfilePage - Verify cache is only cleared on refresh
- [ ] CompanyEditPage - Verify doesn't fetch if data already exists
- [ ] AccountSwitcherModal - Verify doesn't fetch if companies already loaded
- [ ] ProfileCompletionPage - Verify doesn't re-fetch unnecessarily
- [ ] Monitor network requests - Should see fewer redundant fetches
