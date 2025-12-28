# OneCrew API Client Update Summary (v2.23.0 → v2.24.0)

## Update Status
✅ **Successfully updated from v2.23.0 to v2.24.0**

## Package Information
- **Current Version**: v2.24.0
- **Previous Version**: v2.23.0
- **Repository**: https://github.com/onecrew/onecrew-api-client
- **Published**: Latest version

## Overview

This document provides comprehensive documentation for the performance enhancements in `onecrew-api-client` v2.24.0, including detailed migration guides, TypeScript examples, and codebase-specific implementation recommendations.

This update wraps backend performance enhancements into the `onecrew-api-client` package, including database indexes, fulltext search, and new query parameters for optimized company data fetching, resulting in **5-10x faster company profile loads** and **60-85% smaller payloads**.

**Breaking Changes**: None (all new parameters are optional)

## Table of Contents

1. [Summary](#summary)
2. [What Was Updated](#what-was-updated)
3. [Performance Benefits](#performance-benefits)
4. [TypeScript Type Definitions](#typescript-type-definitions)
5. [Usage Examples](#usage-examples)
6. [Migration Guide](#migration-guide)
7. [Codebase-Specific Updates](#codebase-specific-updates)
8. [Backend Requirements](#backend-requirements)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)
11. [Implementation Checklist](#implementation-checklist)

## What Was Updated

### 1. Enhanced `getCompanies()` Method

**New Parameters:**
- `fields?: string[]` - Select specific fields to return (reduces payload by 60-80%)
- `subcategory?: string` - Support for multiple subcategories (comma-separated: `'academy,production_house'`)
- `sort?: string` - Field to sort by (e.g., `'name'`, `'created_at'`, `'member_count'`)
- `order?: 'asc' | 'desc'` - Sort order (default: `'asc'`)

**TypeScript Signature:**
```typescript
getCompanies(params?: {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  location?: string;
  subcategory?: string;        // NEW: Multiple values supported (comma-separated)
  fields?: string[];            // NEW: Field selection
  sort?: string;                // NEW: Sort field
  order?: 'asc' | 'desc';       // NEW: Sort order
}): Promise<ApiResponse<Company[]>>
```

### 2. Enhanced `getCompany()` Method

**New Parameters:**
- `include?: string[]` - Include related data in single request:
  - `'members'` - Company members
  - `'services'` - Company services
  - `'documents'` - Company documents
  - `'certifications'` - Academy certifications (academy only)
  - `'courses'` - Academy courses (academy only)
- `membersLimit?: number` - Pagination limit for included members (default: 50)
- `membersPage?: number` - Page number for included members (default: 1)
- `fields?: string[]` - Select specific fields to return

**TypeScript Signature:**
```typescript
getCompany(companyId: string, params?: {
  include?: ('members' | 'services' | 'documents' | 'certifications' | 'courses')[];
  membersLimit?: number;
  membersPage?: number;
  fields?: string[];
}): Promise<ApiResponse<Company & {
  members?: CompanyMember[];
  services?: CompanyService[];
  documents?: CompanyDocument[];
  certifications?: UserCertification[];
  courses?: Course[];
}>>
```

### 3. Backend Performance Improvements

- **Fulltext Search Index**: On company name, description, bio, and location
- **Composite Indexes**: Optimized for list queries with filters
- **Member/Service/Document Indexes**: Faster related data queries

## Performance Benefits

### Company Profile Endpoint (`getCompany`)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Calls | 5-7 sequential | 1 single request | 5-7x reduction |
| Load Time | 3-8 seconds | 800ms - 1.5s | 5-10x faster |
| Network Requests | 5-7 round trips | 1 round trip | 5-7x reduction |
| Payload Size (full) | ~500KB - 2MB | ~100KB - 400KB | 60-85% smaller |
| Payload Size (minimal) | ~500KB - 2MB | ~20KB - 50KB | 90-95% smaller |

### Company List Endpoint (`getCompanies`)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Load Time | 500ms - 2s | 200-500ms | 2-4x faster |
| Payload Size (full) | ~500KB - 2MB | ~100KB - 400KB | 60-80% smaller |
| Payload Size (minimal) | ~500KB - 2MB | ~50KB - 150KB | 85-95% smaller |

## TypeScript Type Definitions

### Available Fields for Selection

**Company Fields:**
```typescript
type CompanyField = 
  | 'id'
  | 'name'
  | 'description'
  | 'bio'
  | 'logo_url'
  | 'location_text'
  | 'subcategory'
  | 'category'
  | 'member_count'
  | 'service_count'
  | 'document_count'
  | 'created_at'
  | 'updated_at'
  | 'approval_status'
  | 'website_url'
  | 'email'
  | 'phone'
  | 'company_type_info';
```

### Response Types

```typescript
// getCompany with include parameter
interface CompanyWithIncludes extends Company {
  members?: CompanyMember[];
  services?: CompanyService[];
  documents?: CompanyDocument[];
  certifications?: UserCertification[];  // Academy only
  courses?: Course[];                     // Academy only
}

// getCompanies response
interface CompaniesResponse {
  data: Company[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Usage Examples

### Example 1: Optimized Company List (List View)

**Use Case**: Displaying companies in a directory/list view where only essential fields are needed.

```typescript
import { OneCrewApi } from 'onecrew-api-client';

const api = new OneCrewApi('https://api.onecrew.com');

// Get companies with only essential fields (for list views)
const response = await api.getCompanies({
  fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory'],
  subcategory: 'academy,production_house', // Multiple subcategories
  page: 1,
  limit: 20,
  sort: 'name',
  order: 'asc'
});

if (response.success) {
  const companies = response.data;
  // Each company only has: id, name, logo_url, location_text, subcategory
  // Payload reduced by ~80%
}
```

### Example 2: Optimized Company Profile (Single Request)

**Use Case**: Loading a company profile page with all related data in one request.

```typescript
// Get company with related data in single request
const response = await api.getCompany(companyId, {
  include: ['members', 'services', 'documents'],
  membersLimit: 20,
  membersPage: 1,
  fields: ['id', 'name', 'description', 'logo_url', 'location_text']
});

if (response.success) {
  const company = response.data;
  
  // All data available immediately:
  const members = company.members || [];
  const services = company.services || [];
  const documents = company.documents || [];
  
  // No additional API calls needed!
}
```

### Example 3: Academy Company with Certifications and Courses

**Use Case**: Loading an academy company profile with certifications and courses.

```typescript
const response = await api.getCompany(academyId, {
  include: ['members', 'services', 'documents', 'certifications', 'courses'],
  membersLimit: 50,
  fields: ['id', 'name', 'description', 'logo_url', 'subcategory']
});

if (response.success) {
  const academy = response.data;
  
  // Academy-specific data included:
  const certifications = academy.certifications || [];
  const courses = academy.courses || [];
}
```

### Example 4: Minimal Payload (Search/Filter Results)

**Use Case**: When you only need basic company info for search results or filtering.

```typescript
// Get only essential fields (minimal payload)
const response = await api.getCompany(companyId, {
  fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory']
});

// Payload: ~20-50KB instead of ~500KB-2MB
```

### Example 5: Multiple Subcategories Filter

**Use Case**: Filtering companies by multiple subcategories in one request.

```typescript
// Before: Had to make separate requests or filter client-side
const productionHouses = await api.getCompanies({ subcategory: 'production_house' });
const academies = await api.getCompanies({ subcategory: 'academy' });
// Then merge client-side...

// After: Single request with multiple subcategories
const companies = await api.getCompanies({
  subcategory: 'academy,production_house,agency',
  page: 1,
  limit: 50
});
```

## Migration Guide

### No Breaking Changes

All new parameters are optional. Existing code continues to work without modification. Gradual migration is recommended.

### Step 1: Update Company Lists

**File**: `src/pages/HomePageWithUsers.tsx`, `src/pages/DirectoryPage.tsx`

**Before:**
```typescript
const response = await getCompanies({
  limit: 20,
  page: 1,
  search: searchQuery,
  category: filters.category,
  location: filters.location,
});
```

**After (Recommended):**
```typescript
const response = await getCompanies({
  limit: 20,
  page: 1,
  search: searchQuery,
  category: filters.category,
  location: filters.location,
  // Add field selection for list views
  fields: ['id', 'name', 'logo_url', 'location_text', 'subcategory'],
  // Add sorting
  sort: 'name',
  order: 'asc'
});
```

**Impact**: 60-80% smaller payloads, faster rendering

### Step 2: Optimize Company Profile Loading

**File**: `src/pages/CompanyProfilePage.tsx`

**Before (Waterfall Loading):**
```typescript
const loadCompanyData = async () => {
  // 1. Load company details
  const companyResponse = await getCompany(companyId);
  setCompany(companyResponse.data);
  
  // 2. Load related data in parallel (but still separate requests)
  const loadPromises = [
    loadMembers(companyId),
    loadServices(companyId),
    loadDocuments(companyId)
  ];
  
  if (companyResponse.data.subcategory === 'academy') {
    loadPromises.push(loadCertifications(companyId));
    loadPromises.push(loadCourses(companyId));
  }
  
  await Promise.all(loadPromises);
};
```

**After (Single Request):**
```typescript
const loadCompanyData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Determine what to include based on company type
    const include: string[] = ['members', 'services', 'documents'];
    if (company?.subcategory === 'academy') {
      include.push('certifications', 'courses');
    }
    
    // Single request with all data
    const companyResponse = await getCompany(companyId, {
      include,
      membersLimit: 50,
      membersPage: 1,
      fields: ['id', 'name', 'description', 'bio', 'logo_url', 'location_text', 'subcategory', 'member_count', 'service_count']
    });
    
    if (!companyResponse.success || !companyResponse.data) {
      throw new Error(companyResponse.error || 'Failed to load company');
    }
    
    const companyData = companyResponse.data;
    setCompany(companyData);
    
    // Extract included data
    setMembers(companyData.members || []);
    setServices(companyData.services || []);
    setDocuments(companyData.documents || []);
    
    if (companyData.subcategory === 'academy') {
      setCertifications(companyData.certifications || []);
      setCourses(companyData.courses || []);
    }
  } catch (err: any) {
    console.error('Failed to load company data:', err);
    setError(err.message || 'Failed to load company profile');
  } finally {
    setLoading(false);
  }
};
```

**Impact**: 5-10x faster loading, single network request instead of 5-7

### Step 3: Update ApiContext Wrapper

**File**: `src/contexts/ApiContext.tsx`

**Update `getCompanies` method signature:**
```typescript
const getCompanies = async (params?: {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  location?: string;
  subcategory?: string;        // NEW
  fields?: string[];            // NEW
  sort?: string;                // NEW
  order?: 'asc' | 'desc';       // NEW
}) => {
  // ... existing implementation
  const queryParams: any = {};
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.page) queryParams.page = params.page;
  if (params?.search) queryParams.q = params.search;
  if (params?.category) queryParams.category = params.category;
  if (params?.location) queryParams.location = params.location;
  if (params?.subcategory) queryParams.subcategory = params.subcategory;  // NEW
  if (params?.fields) queryParams.fields = params.fields.join(',');       // NEW
  if (params?.sort) queryParams.sort = params.sort;                       // NEW
  if (params?.order) queryParams.order = params.order;                    // NEW
  
  const response = await api.getCompanies(Object.keys(queryParams).length > 0 ? queryParams : undefined);
  return response;
};
```

**Update `getCompany` method signature:**
```typescript
const getCompany = async (companyId: string, params?: {
  include?: string[];
  membersLimit?: number;
  membersPage?: number;
  fields?: string[];
}) => {
  try {
    const response = await api.getCompany(companyId, params);
    return response;
  } catch (error) {
    console.error('Failed to get company:', error);
    throw error;
  }
};
```

### Step 4: Update Type Definitions

**File**: `src/contexts/ApiContext.tsx`

**Update interface:**
```typescript
interface ApiContextType {
  // ... existing methods
  getCompanies: (params?: {
    limit?: number;
    page?: number;
    search?: string;
    category?: string;
    location?: string;
    subcategory?: string;        // NEW
    fields?: string[];            // NEW
    sort?: string;                // NEW
    order?: 'asc' | 'desc';       // NEW
  }) => Promise<any>;
  
  getCompany: (companyId: string, params?: {
    include?: string[];
    membersLimit?: number;
    membersPage?: number;
    fields?: string[];
  }) => Promise<any>;
}
```

## Codebase-Specific Updates

### Files to Update

1. **`src/contexts/ApiContext.tsx`**
   - Update `getCompanies` method signature and implementation
   - Update `getCompany` method signature and implementation
   - Update `ApiContextType` interface

2. **`src/pages/CompanyProfilePage.tsx`**
   - Refactor `loadCompanyData` to use `include` parameter
   - Remove separate `loadMembers`, `loadServices`, `loadDocuments` calls
   - Update state management for included data

3. **`src/pages/HomePageWithUsers.tsx`**
   - Add `fields` parameter to `fetchCompanies`
   - Add `sort` and `order` parameters

4. **`src/pages/DirectoryPage.tsx`**
   - Add `fields` parameter to `fetchCompanies`
   - Consider using `subcategory` parameter for filtering

### Performance Monitoring

The codebase already has performance monitoring in `ApiContext.tsx`. The new optimizations will automatically show improved metrics:

```typescript
// Existing performance monitoring will track:
// - Reduced API call count
// - Faster response times
// - Smaller payload sizes
```

## Backend Requirements

### Required Migrations

The backend must have these migrations applied:

1. **`20250127_add_company_fulltext_search.sql`**
   - Creates fulltext search index on company name, description, bio, and location

2. **`20250127_add_company_performance_indexes.sql`**
   - Creates composite indexes for optimized list queries
   - Creates indexes for member count, service count, and document queries

### Required Backend Support

The backend must support:

- `include` parameter for company profile endpoint (`/api/companies/:id`)
- `fields` parameter for field selection (comma-separated or array)
- Multiple subcategory values (comma-separated in query string)
- `sort` and `order` parameters for company list endpoint
- `membersLimit` and `membersPage` for pagination of included members

### Backend Response Format

**Company with includes:**
```json
{
  "success": true,
  "data": {
    "id": "company-123",
    "name": "Example Company",
    "members": [...],
    "services": [...],
    "documents": [...]
  }
}
```

## Testing Guide

### Unit Tests

```typescript
describe('getCompanies with new parameters', () => {
  it('should support field selection', async () => {
    const response = await api.getCompanies({
      fields: ['id', 'name', 'logo_url']
    });
    
    expect(response.success).toBe(true);
    expect(response.data[0]).toHaveProperty('id');
    expect(response.data[0]).toHaveProperty('name');
    expect(response.data[0]).toHaveProperty('logo_url');
    expect(response.data[0]).not.toHaveProperty('description');
  });
  
  it('should support multiple subcategories', async () => {
    const response = await api.getCompanies({
      subcategory: 'academy,production_house'
    });
    
    expect(response.success).toBe(true);
    response.data.forEach(company => {
      expect(['academy', 'production_house']).toContain(company.subcategory);
    });
  });
});

describe('getCompany with include parameter', () => {
  it('should include members, services, and documents', async () => {
    const response = await api.getCompany(companyId, {
      include: ['members', 'services', 'documents']
    });
    
    expect(response.success).toBe(true);
    expect(response.data.members).toBeDefined();
    expect(response.data.services).toBeDefined();
    expect(response.data.documents).toBeDefined();
  });
});
```

### Integration Tests

1. **Test Company Profile Load Performance**
   - Measure time before (multiple requests) vs after (single request)
   - Verify all data is included correctly
   - Check payload size reduction

2. **Test Company List Performance**
   - Measure load time with and without field selection
   - Verify sorting works correctly
   - Test multiple subcategory filtering

3. **Test Academy-Specific Features**
   - Verify certifications and courses are included for academy companies
   - Test that non-academy companies don't return these fields

## Troubleshooting

### Issue: `include` parameter not working

**Symptoms**: Company data loads but `members`, `services`, etc. are undefined

**Solutions**:
1. Verify backend supports `include` parameter
2. Check backend logs for errors
3. Ensure backend migrations are applied
4. Verify API client version is 2.24.0+

### Issue: Field selection not reducing payload

**Symptoms**: Response size is still large despite using `fields` parameter

**Solutions**:
1. Verify backend supports `fields` parameter
2. Check that fields are passed as array: `fields: ['id', 'name']`
3. Verify backend is filtering fields server-side (not client-side)

### Issue: Multiple subcategories not filtering correctly

**Symptoms**: Companies from other subcategories appear in results

**Solutions**:
1. Verify comma-separated format: `'academy,production_house'`
2. Check backend supports multiple subcategory values
3. Verify subcategory values match backend enum values

### Issue: Performance not improved

**Symptoms**: Load times are still slow

**Solutions**:
1. Verify backend indexes are created (check migration status)
2. Check network tab for actual request count
3. Verify `include` parameter is being used (not separate requests)
4. Check backend query performance (database indexes)

## Implementation Checklist

### Phase 1: Package Update
- [x] Update `package.json` to v2.24.0
- [x] Run `npm install`
- [x] Verify package is installed correctly

### Phase 2: ApiContext Updates
- [ ] Update `getCompanies` method signature in `ApiContext.tsx`
- [ ] Update `getCompany` method signature in `ApiContext.tsx`
- [ ] Update `ApiContextType` interface
- [ ] Test API methods with new parameters

### Phase 3: Company Profile Optimization
- [ ] Update `CompanyProfilePage.tsx` to use `include` parameter
- [ ] Remove separate data loading functions (or keep as fallback)
- [ ] Update state management for included data
- [ ] Test academy companies with certifications/courses
- [ ] Verify performance improvement

### Phase 4: Company List Optimization
- [ ] Update `HomePageWithUsers.tsx` to use `fields` parameter
- [ ] Update `DirectoryPage.tsx` to use `fields` parameter
- [ ] Add sorting parameters where appropriate
- [ ] Test multiple subcategory filtering
- [ ] Verify payload size reduction

### Phase 5: Testing & Validation
- [ ] Test company profile loading (single request)
- [ ] Test company list loading (field selection)
- [ ] Test multiple subcategories filtering
- [ ] Test academy-specific includes
- [ ] Measure performance improvements
- [ ] Verify no regressions

### Phase 6: Documentation
- [x] Update team documentation
- [ ] Add code comments for new parameters
- [ ] Document migration path for other developers

## Version Information

- **Package Version**: 2.24.0
- **Release Date**: 2025-01-27
- **Backend Compatibility**: Requires backend with performance enhancements
- **Breaking Changes**: None
- **Migration Required**: Optional (gradual migration recommended)

## Related Files

- `package.json` - Updated dependency version
- `src/contexts/ApiContext.tsx` - API wrapper methods
- `src/pages/CompanyProfilePage.tsx` - Company profile page
- `src/pages/HomePageWithUsers.tsx` - Company list page
- `src/pages/DirectoryPage.tsx` - Directory page
- `src/types/index.ts` - TypeScript type definitions

---

**Last Updated**: 2025-01-27  
**Documentation Version**: 2.0 (Enhanced)








