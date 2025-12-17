# Server-Side Performance Enhancements for Companies/Academies

## Overview
This document outlines all server-side enhancements needed to dramatically improve loading performance for:
1. **Companies/Academies List** (`GET /api/companies`)
2. **Company/Academy Profile by ID** (`GET /api/companies/:id`)

---

## 1. Companies/Academies List Endpoint (`GET /api/companies`)

### Current Issues

#### 1.1 No Server-Side Grouping
**Problem:** Client-side groups companies by `subcategory` after fetching all data
- **Location:** `DirectoryPage.tsx` lines 366-403
- **Impact:** All 100 companies fetched, then filtered client-side
- **Solution:** Add server-side grouping/filtering

#### 1.2 Missing Query Parameters
**Problem:** Limited filtering options on server
- **Current:** Only supports `limit`, `page`, `search`, `category`, `location`
- **Missing:** `subcategory` filter (production_house, agency, studio, academy, etc.)
- **Impact:** Must fetch all companies, then filter client-side

#### 1.3 No Field Selection
**Problem:** Returns all company fields even when only subset needed
- **Current:** Returns full company objects with all relationships
- **Impact:** Unnecessary data transfer, slower queries
- **Solution:** Add `fields` or `include` parameter

#### 1.4 N+1 Query Problems
**Problem:** Likely fetching related data in loops
- **Potential Issues:**
  - `company_type_info` relationship loaded per company
  - `owner` relationship loaded per company
  - Count queries (`members_count`, `services_count`) executed separately
- **Solution:** Use eager loading/joins

#### 1.5 No Aggregation Endpoint
**Problem:** Client needs to group by subcategory
- **Current:** Returns flat list, client groups by `subcategory`
- **Solution:** Add `group_by=subcategory` parameter or separate endpoint

---

### Recommended Enhancements

#### Enhancement 1.1: Add Subcategory Filtering
```http
GET /api/companies?subcategory=academy&limit=100
GET /api/companies?subcategory=production_house,agency,studio&limit=100
```

**Implementation:**
- Add `subcategory` query parameter (supports comma-separated values)
- Filter at database level before pagination
- Index on `subcategory` column

**Database Index:**
```sql
CREATE INDEX idx_companies_subcategory ON companies(subcategory) WHERE deleted_at IS NULL;
```

---

#### Enhancement 1.2: Server-Side Grouping Endpoint
```http
GET /api/companies/grouped?group_by=subcategory&limit=100
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "Production Houses": [
      { "id": "...", "name": "...", "logo_url": "...", ... }
    ],
    "Agency": [
      { "id": "...", "name": "...", "logo_url": "...", ... }
    ],
    "Academy": [
      { "id": "...", "name": "...", "logo_url": "...", ... }
    ]
  },
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 100,
    "totalPages": 2
  }
}
```

**Benefits:**
- Single query instead of client-side processing
- Reduced data transfer
- Faster response time

---

#### Enhancement 1.3: Field Selection (Sparse Fieldsets)
```http
GET /api/companies?fields=id,name,logo_url,location_text,subcategory,company_type_info&limit=100
```

**Implementation:**
- Accept `fields` parameter (comma-separated)
- Only SELECT requested fields from database
- Reduce payload size by 60-80%

**Example Response:**
```json
{
  "id": "123",
  "name": "Acme Studios",
  "logo_url": "https://...",
  "location_text": "Los Angeles, CA",
  "subcategory": "production_house",
  "company_type_info": {
    "code": "production_house",
    "name": "Production House"
  }
}
```

**Excluded Fields (for list view):**
- `description`, `bio` (large text fields)
- `website_url`, `email`, `phone` (not needed in list)
- `social_media_links` (not needed in list)
- `approval_status`, `approval_reason` (not needed for public list)
- `owner` full object (only need `owner_id` if needed)

---

#### Enhancement 1.4: Optimize Related Data Loading

**Current Problem:**
```sql
-- Likely happening (N+1 queries):
SELECT * FROM companies WHERE ...;
-- Then for each company:
SELECT * FROM company_types WHERE id = company.company_type_id;
SELECT COUNT(*) FROM company_members WHERE company_id = ?;
SELECT COUNT(*) FROM company_services WHERE company_id = ?;
```

**Solution: Use JOINs and Aggregations**
```sql
SELECT 
  c.id,
  c.name,
  c.logo_url,
  c.location_text,
  c.subcategory,
  ct.code as company_type_code,
  ct.name as company_type_name,
  COUNT(DISTINCT cm.user_id) as members_count,
  COUNT(DISTINCT cs.service_id) as services_count
FROM companies c
LEFT JOIN company_types ct ON c.company_type_id = ct.id
LEFT JOIN company_members cm ON c.id = cm.company_id 
  AND cm.invitation_status = 'accepted' 
  AND cm.deleted_at IS NULL
LEFT JOIN company_services cs ON c.id = cs.company_id 
  AND cs.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.approval_status = 'approved'  -- Only show approved companies
GROUP BY c.id, c.name, c.logo_url, c.location_text, c.subcategory, ct.code, ct.name
ORDER BY c.name
LIMIT 100;
```

**Database Indexes:**
```sql
-- Composite index for filtering and sorting
CREATE INDEX idx_companies_list ON companies(approval_status, deleted_at, subcategory, name);

-- Index for members count
CREATE INDEX idx_company_members_count ON company_members(company_id, invitation_status, deleted_at);

-- Index for services count
CREATE INDEX idx_company_services_count ON company_services(company_id, deleted_at);
```

---

#### Enhancement 1.5: Add Caching Layer

**Implementation:**
- Cache approved company listings for 15-30 minutes
- Cache key: `companies:list:{subcategory}:{page}:{limit}`
- Invalidate on company create/update/delete
- Use Redis or in-memory cache

**Cache Strategy:**
```javascript
// Pseudo-code
const cacheKey = `companies:list:${subcategory || 'all'}:${page}:${limit}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const companies = await db.query(...);
await redis.setex(cacheKey, 1800, JSON.stringify(companies)); // 30 min TTL
```

---

#### Enhancement 1.6: Add Pagination Metadata
**Current:** May not return proper pagination info
**Enhancement:** Always return pagination metadata

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 250,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 2. Company/Academy Profile by ID (`GET /api/companies/:id`)

### Current Issues

#### 2.1 Multiple Sequential API Calls (Waterfall Loading)
**Problem:** Client makes 5-7 separate API calls:
1. `GET /api/companies/:id` - Company details
2. `GET /api/companies/:id/members` - Members (50 limit)
3. `GET /api/companies/:id/services` - Services
4. `GET /api/companies/:id/documents` - Documents
5. `GET /api/companies/:id/certifications` - Certifications (if academy)
6. `GET /api/companies/:id/courses` - Courses (if academy)

**Location:** `CompanyProfilePage.tsx` lines 186-208

**Impact:**
- Total load time = sum of all request times
- Network overhead (multiple HTTP requests)
- Slower perceived performance

**Solution:** Add `include` parameter or separate aggregated endpoint

---

#### 2.2 No Conditional Loading
**Problem:** Loads all data even if not needed
- Certifications and courses loaded for all companies (not just academies)
- Documents loaded even if not viewing documents section
- Services loaded even if not viewing services section

**Solution:** Add `include` parameter for selective loading

---

#### 2.3 N+1 Queries in Related Data
**Problem:** Each related endpoint likely has N+1 queries
- Members: Loading user data for each member separately
- Services: Loading service details separately
- Documents: Loading file metadata separately
- Certifications: Loading user and certification type data separately

---

### Recommended Enhancements

#### Enhancement 2.1: Add `include` Parameter
```http
GET /api/companies/:id?include=members,services,documents
GET /api/companies/:id?include=members,services,documents,certifications,courses
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Acme Academy",
    "subcategory": "academy",
    "logo_url": "...",
    "description": "...",
    "members": {
      "data": [
        {
          "user_id": "456",
          "role": "admin",
          "joined_at": "2024-01-01",
          "user": {
            "id": "456",
            "name": "John Doe",
            "email": "john@example.com",
            "image_url": "..."
          }
        }
      ],
      "pagination": {
        "total": 25,
        "page": 1,
        "limit": 50
      }
    },
    "services": [
      {
        "id": "789",
        "service_id": "service_123",
        "service": {
          "id": "service_123",
          "name": "Video Production",
          "description": "..."
        }
      }
    ],
    "documents": [
      {
        "id": "doc_123",
        "document_type": "license",
        "file_url": "...",
        "file_name": "license.pdf"
      }
    ],
    "certifications": [
      {
        "id": "cert_123",
        "user_id": "456",
        "certification_type_id": "type_123",
        "user": {
          "id": "456",
          "name": "John Doe"
        },
        "certification_type": {
          "id": "type_123",
          "name": "Film Production Certificate"
        }
      }
    ],
    "courses": [
      {
        "id": "course_123",
        "title": "Introduction to Film",
        "description": "...",
        "poster_url": "..."
      }
    ]
  }
}
```

**Benefits:**
- Single HTTP request instead of 5-7
- Reduced network latency
- Atomic data loading (all or nothing)
- Faster total load time

---

#### Enhancement 2.2: Optimize Database Queries with JOINs

**Current (Likely N+1):**
```sql
-- Query 1: Get company
SELECT * FROM companies WHERE id = ?;

-- Query 2: Get members (N queries for user data)
SELECT * FROM company_members WHERE company_id = ?;
-- Then for each member:
SELECT * FROM users WHERE id = ?;

-- Query 3: Get services (N queries for service data)
SELECT * FROM company_services WHERE company_id = ?;
-- Then for each service:
SELECT * FROM services WHERE id = ?;
```

**Optimized (Single Query with JOINs):**
```sql
-- Company with members (eager loaded)
SELECT 
  c.*,
  cm.user_id as member_user_id,
  cm.role as member_role,
  cm.joined_at as member_joined_at,
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  u.image_url as user_image_url
FROM companies c
LEFT JOIN company_members cm ON c.id = cm.company_id 
  AND cm.invitation_status = 'accepted'
  AND cm.deleted_at IS NULL
LEFT JOIN users u ON cm.user_id = u.id
WHERE c.id = ?
ORDER BY cm.joined_at ASC
LIMIT 50;

-- Company with services (eager loaded)
SELECT 
  c.*,
  cs.id as company_service_id,
  s.id as service_id,
  s.name as service_name,
  s.description as service_description
FROM companies c
LEFT JOIN company_services cs ON c.id = cs.company_id 
  AND cs.deleted_at IS NULL
LEFT JOIN services s ON cs.service_id = s.id
WHERE c.id = ?;

-- Company with documents
SELECT 
  c.*,
  cd.id as document_id,
  cd.document_type,
  cd.file_url,
  cd.file_name,
  cd.description as document_description
FROM companies c
LEFT JOIN company_documents cd ON c.id = cd.company_id 
  AND cd.deleted_at IS NULL
WHERE c.id = ?
ORDER BY cd.created_at DESC;
```

**Better: Use JSON Aggregation (PostgreSQL)**
```sql
SELECT 
  c.*,
  COALESCE(
    json_agg(
      json_build_object(
        'user_id', cm.user_id,
        'role', cm.role,
        'joined_at', cm.joined_at,
        'user', json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image_url', u.image_url
        )
      )
    ) FILTER (WHERE cm.user_id IS NOT NULL),
    '[]'::json
  ) as members,
  COALESCE(
    json_agg(
      json_build_object(
        'id', cs.id,
        'service', json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description
        )
      )
    ) FILTER (WHERE cs.id IS NOT NULL),
    '[]'::json
  ) as services
FROM companies c
LEFT JOIN company_members cm ON c.id = cm.company_id 
  AND cm.invitation_status = 'accepted'
  AND cm.deleted_at IS NULL
LEFT JOIN users u ON cm.user_id = u.id
LEFT JOIN company_services cs ON c.id = cs.company_id 
  AND cs.deleted_at IS NULL
LEFT JOIN services s ON cs.service_id = s.id
WHERE c.id = ?
GROUP BY c.id;
```

---

#### Enhancement 2.3: Add Pagination for Related Data
**Problem:** Members endpoint returns 50 members, but no pagination metadata
**Solution:** Add pagination to included relationships

```json
{
  "members": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 125,
      "totalPages": 3
    }
  }
}
```

**Query Parameter:**
```http
GET /api/companies/:id?include=members&members_limit=20&members_page=1
```

---

#### Enhancement 2.4: Conditional Includes Based on Company Type
**Problem:** Loads certifications/courses for non-academies
**Solution:** Server automatically excludes based on `subcategory`

```javascript
// Pseudo-code
const includes = req.query.include?.split(',') || [];
const company = await getCompany(id);

// Automatically exclude academy-specific data for non-academies
if (company.subcategory !== 'academy') {
  includes = includes.filter(i => !['certifications', 'courses'].includes(i));
}
```

---

#### Enhancement 2.5: Add Field Selection for Profile
**Problem:** Returns all fields even if not needed
**Solution:** Add `fields` parameter

```http
GET /api/companies/:id?include=members&fields=id,name,logo_url,description,bio,location_text
```

**Use Cases:**
- **List View:** Only need `id`, `name`, `logo_url`, `location_text`
- **Profile View:** Need all fields
- **Edit View:** Need all fields + additional metadata

---

#### Enhancement 2.6: Optimize Image URLs
**Problem:** Full image URLs returned, may be slow to load
**Solution:** 
- Return CDN URLs if available
- Return optimized/thumbnail URLs for list views
- Add `image_size` parameter: `thumbnail`, `small`, `medium`, `large`

```http
GET /api/companies/:id?image_size=thumbnail
```

---

#### Enhancement 2.7: Add Caching for Company Profiles
**Implementation:**
- Cache company profiles for 5-10 minutes
- Cache key: `company:profile:{id}:{include_hash}`
- Invalidate on company update, member add/remove, service add/remove

```javascript
const includeHash = hash(req.query.include || '');
const cacheKey = `company:profile:${id}:${includeHash}`;
```

---

## 3. Database Optimization

### 3.1 Required Indexes

```sql
-- Companies table
CREATE INDEX idx_companies_subcategory ON companies(subcategory) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_approval_status ON companies(approval_status, deleted_at);
CREATE INDEX idx_companies_list ON companies(approval_status, deleted_at, subcategory, name);
CREATE INDEX idx_companies_location ON companies(location_text) WHERE deleted_at IS NULL;

-- Company members
CREATE INDEX idx_company_members_company ON company_members(company_id, invitation_status, deleted_at);
CREATE INDEX idx_company_members_user ON company_members(user_id, invitation_status, deleted_at);

-- Company services
CREATE INDEX idx_company_services_company ON company_services(company_id, deleted_at);
CREATE INDEX idx_company_services_service ON company_services(service_id, deleted_at);

-- Company documents
CREATE INDEX idx_company_documents_company ON company_documents(company_id, deleted_at, document_type);

-- Full-text search (if using PostgreSQL)
CREATE INDEX idx_companies_search ON companies USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_text, '')));
```

### 3.2 Query Optimization

**Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT ... FROM companies WHERE ...;
```

**Monitor slow queries:**
- Log queries taking > 100ms
- Set up query performance monitoring
- Use database query analyzer

---

## 4. API Response Optimization

### 4.1 Response Compression
- Enable gzip/brotli compression
- Reduces payload size by 70-90%
- Especially important for large JSON responses

### 4.2 Remove Null/Undefined Fields
**Current:** May return `null` or `undefined` fields
**Enhancement:** Omit null/undefined fields from response

```json
// Before
{
  "id": "123",
  "name": "Acme",
  "description": null,
  "bio": null,
  "website_url": null
}

// After
{
  "id": "123",
  "name": "Acme"
}
```

---

## 5. Implementation Priority

### Phase 1: Critical (Immediate Impact)
1. ✅ Add `subcategory` filter to companies list
2. ✅ Add `include` parameter to company profile
3. ✅ Fix N+1 queries with JOINs
4. ✅ Add database indexes
5. ✅ Enable response compression

### Phase 2: High Impact (Next Sprint)
6. ✅ Add server-side grouping endpoint
7. ✅ Add field selection (`fields` parameter)
8. ✅ Add pagination metadata
9. ✅ Add caching layer

### Phase 3: Nice to Have (Future)
10. ✅ Add image size optimization
11. ✅ Add full-text search optimization
12. ✅ Add query performance monitoring

---

## 6. Expected Performance Improvements

### Companies List Endpoint
- **Current:** 2-5 seconds for 100 companies
- **After Phase 1:** 500ms - 1 second
- **After Phase 2:** 200-500ms (with caching)

### Company Profile Endpoint
- **Current:** 3-8 seconds (5-7 sequential requests)
- **After Phase 1:** 800ms - 1.5 seconds (single request)
- **After Phase 2:** 300-800ms (with caching)

### Network Transfer Reduction
- **Current:** ~500KB - 2MB per profile load
- **After:** ~100KB - 300KB (60-85% reduction)

---

## 7. Testing Recommendations

1. **Load Testing:**
   - Test with 1000+ companies
   - Test with companies having 100+ members
   - Test concurrent requests (100+ users)

2. **Query Performance:**
   - Monitor query execution time
   - Test with and without indexes
   - Test with various filter combinations

3. **Caching:**
   - Test cache hit/miss rates
   - Test cache invalidation
   - Test cache expiration

---

## 8. Monitoring & Metrics

Track these metrics:
- API response time (p50, p95, p99)
- Database query time
- Cache hit rate
- Payload size
- Error rate
- Concurrent request handling

---

## Summary

The main performance bottlenecks are:
1. **No server-side filtering/grouping** - Client does all processing
2. **Multiple sequential API calls** - Waterfall loading pattern
3. **N+1 query problems** - Inefficient database queries
4. **Missing indexes** - Slow database queries
5. **No caching** - Repeated expensive queries
6. **Over-fetching data** - Returning unnecessary fields

Implementing these enhancements will result in **5-10x performance improvement** for both list and profile endpoints.



