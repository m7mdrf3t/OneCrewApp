# OneCrew API Client Update Summary (v2.3.0 → v2.4.0)

## Update Status
✅ **Successfully updated from v2.3.0 to v2.4.0**

## Package Information
- **Current Version**: v2.4.0
- **Previous Version**: v2.3.0
- **Repository**: https://github.com/onecrew/onecrew-api-client

## 🆕 Key New Features in v2.4.0

### 1. Academy Course Management (NEW - Major Feature)

Version 2.4.0 introduces a comprehensive course management system for academy companies.

#### Course CRUD Operations (Academy Owner/Admin Only)
- `createCourse(companyId, courseData)` - Create a new course
- `getAcademyCourses(companyId, filters?)` - Get courses for an academy with filters
- `getCourseById(courseId, companyId?)` - Get course details by ID
- `updateCourse(companyId, courseId, updates)` - Update a course
- `deleteCourse(companyId, courseId)` - Delete a course

#### Public Course Browsing
- `getPublicCourses(filters?)` - Get public published courses (browse all academies)
  - Filters: category, company_id, page, limit
  - Returns: `CourseWithDetails[]`

#### Course Registration
- `registerForCourse(courseId)` - Register for a course
- `unregisterFromCourse(courseId)` - Unregister from a course
- `getCourseRegistrations(courseId)` - Get course registrations (academy admin only)
- `getMyRegisteredCourses()` - Get user's registered courses

#### Course Type Definitions
```typescript
export type CourseStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface Course {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  seats?: number;
  available_seats?: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseWithDetails extends Course {
  instructors?: User[];
  registration_count?: number;
  user_registered?: boolean;
}

export interface CourseRegistration {
  id: string;
  course_id: string;
  user_id: string;
  registered_at: string;
  course?: Course;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  seats?: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  status?: CourseStatus;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  seats?: number;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  status?: CourseStatus;
}
```

#### Course Features
- Course management with pricing, seats, poster, dates, duration, and category
- Automatic seat availability tracking
- Course registration with seat management
- Instructor assignment support
- Status-based course visibility (draft courses only visible to admins)
- Public course browsing for published courses

### 2. News/Blog System (NEW - Major Feature)

Version 2.4.0 introduces a comprehensive news/blog system with both public and admin functionality.

#### Public News Methods (No Authentication Required)
- `getPublishedNews(filters?)` - Get published news posts with filtering
  - Filters: category, tags, search, page, limit, sort (newest/oldest)
  - Returns: `PaginatedResponse<NewsPost>`
  
- `getNewsPostBySlug(slug: string)` - Get single news post by slug
  - Returns: `NewsPost`
  
- `getNewsCategories()` - Get all news categories
  - Returns: `string[]`
  
- `getNewsTags()` - Get all news tags
  - Returns: `string[]`

#### Admin News Methods (Admin Only)
- `getAdminNewsPosts(filters?: NewsFilters)` - Get all news posts (including unpublished)
- `getAdminNewsPostById(id: string)` - Get news post by ID
- `createNewsPost(data: CreateNewsPostRequest)` - Create new news post
- `updateNewsPost(id: string, data: UpdateNewsPostRequest)` - Update news post
- `deleteNewsPost(id: string)` - Delete news post
- `publishNewsPost(id: string)` - Publish a news post
- `unpublishNewsPost(id: string)` - Unpublish a news post
- `uploadNewsPhoto(file, filename?)` - Upload news photo
- `uploadNewsThumbnail(file, filename?)` - Upload news thumbnail

#### Type Definitions
```typescript
export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  photo_url?: string;
  thumbnail_url?: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  author_id?: string;
}

export interface CreateNewsPostRequest {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  photo_url?: string;
  thumbnail_url?: string;
}

export interface UpdateNewsPostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  photo_url?: string;
  thumbnail_url?: string;
  published?: boolean;
}

export interface NewsFilters {
  category?: string;
  tags?: string[];
  search?: string;
  published?: boolean;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest';
}
```

## Implementation Plan

### Phase 1: Public News Display (High Priority)
1. **Create News List Page**
   - Display published news posts
   - Support filtering by category and tags
   - Search functionality
   - Pagination

2. **Create News Detail Page**
   - Display full news post content
   - Show related posts
   - Share functionality

3. **Add News Section to Home Page**
   - Show latest news posts
   - Link to full news list

### Phase 2: Admin News Management (Medium Priority)
1. **Admin News Dashboard**
   - List all news posts (published/unpublished)
   - Create/Edit/Delete posts
   - Publish/Unpublish functionality

2. **News Editor**
   - Rich text editor for content
   - Image upload (photo & thumbnail)
   - Category and tag management
   - Preview functionality

### Phase 3: Enhanced Features (Low Priority)
1. **News Categories Page**
   - Browse news by category
   
2. **News Tags Page**
   - Browse news by tags
   
3. **Related News**
   - Show related posts based on category/tags

## Current Implementation Status

### Already Implemented (from previous versions)
- ✅ Social Media Links Management
- ✅ User Contacts Management
- ✅ Portfolio Management
- ✅ Certification System
- ✅ Notification System
- ✅ Company Management
- ✅ Course/Academy Management

### New in v2.4.0
- ❌ **Academy Course Management** - **NOT YET IMPLEMENTED** ⭐ **NEW FEATURE**
- ❌ **News/Blog System** - **NOT YET IMPLEMENTED** ⭐ **NEW FEATURE**

## Next Steps

### Immediate Actions
1. ✅ Package updated to v2.4.0
2. ⏳ Review News type definitions
3. ⏳ Plan UI/UX for news display
4. ⏳ Implement public news browsing

### Implementation Checklist
- [ ] Add News types to `src/types/index.ts`
- [ ] Create `NewsPage.tsx` for listing news
- [ ] Create `NewsDetailPage.tsx` for viewing single post
- [ ] Add news methods to `ApiContext.tsx`
- [ ] Add news section to navigation
- [ ] Implement news filtering and search
- [ ] Add news to home page (optional)
- [ ] Create admin news management (if needed)

## Code Examples

### Fetching Published News
```typescript
const { api } = useApi();

// Get published news with filters
const response = await api.getPublishedNews({
  category: 'industry',
  tags: ['production', 'casting'],
  search: 'film',
  page: 1,
  limit: 10,
  sort: 'newest'
});

if (response.success) {
  const newsPosts = response.data.data;
  const pagination = response.data.pagination;
}
```

### Getting Single News Post
```typescript
const response = await api.getNewsPostBySlug('latest-film-industry-news');
if (response.success) {
  const post = response.data;
}
```

### Getting Categories and Tags
```typescript
const categoriesResponse = await api.getNewsCategories();
const tagsResponse = await api.getNewsTags();
```

## Breaking Changes
- ✅ **No breaking changes** - This is a non-breaking update
- All existing functionality continues to work

## Summary

Version 2.4.0 adds **TWO major new features**:

### 1. Academy Course Management System
- Complete course CRUD operations for academy companies
- Public course browsing across all academies
- Course registration and seat management
- Status-based visibility (draft/published/completed/cancelled)
- Instructor assignment and registration tracking

### 2. News/Blog System
- Public browsing of published news posts
- Admin management of news content
- Rich filtering and search capabilities
- Category and tag organization
- Photo and thumbnail upload support

Both features are **ready for implementation** and can significantly enhance the app's capabilities.

---

**Ready to implement?** Choose which feature to start with:
1. **Academy Course Management** - For academy companies to manage courses
2. **News/Blog System** - For content management and news display
