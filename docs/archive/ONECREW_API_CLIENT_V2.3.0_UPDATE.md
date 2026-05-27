# OneCrew API Client Update Summary (v2.2.0 → v2.3.0)

## Update Status
✅ **Successfully updated from v2.2.0 to v2.3.0** (latest version)

## Package Information
- **Current Version**: v2.3.0
- **Previous Version**: v2.2.0
- **Published**: November 7, 2025
- **Repository**: https://github.com/onecrew/onecrew-api-client

## Key New Features in v2.3.0

### 1. Social Media Links Management (NEW)
**New Methods:**
- `getUserSocialLinks()` - Get user's social media links
- `addSocialLink(platform: string, url: string, isCustom?: boolean)` - Add a social link
- `updateSocialLink(linkId: string, url: string)` - Update a social link
- `deleteSocialLink(linkId: string)` - Delete a social link

**Type Definitions:**
```typescript
export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'custom';

export interface UserSocialLink {
    id: string;
    user_id: string;
    platform: string;
    url: string;
    is_custom: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}
```

**Status**: ✅ **Already Implemented** in our codebase
- Our `ApiContext.tsx` already has these methods implemented
- They use direct API calls to `/api/social-links` endpoints
- The implementation matches the library's interface

### 2. User Contacts Management (NEW)
**New Methods:**
- `getUserContacts()` - Get user's contacts
- `addContact(data: CreateContactRequest)` - Add a contact
- `updateContact(contactId: string, updates: Partial<UserContact>)` - Update a contact
- `deleteContact(contactId: string)` - Delete a contact

**Type Definitions:**
```typescript
export interface UserContact {
    id: string;
    user_id: string;
    name?: string;
    phone?: string;
    email?: string;
    relationship?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface CreateContactRequest {
    name?: string;
    phone?: string;
    email?: string;
    relationship?: string;
    notes?: string;
}
```

**Status**: ❌ **NOT IMPLEMENTED** in our codebase
- No contact management UI
- No contact methods in ApiContext
- Could be useful for talent profiles (agent contacts, etc.)

### 3. User Stats & Engagement (NEW)
**New Methods:**
- `getUserStats(userId: string)` - Get user statistics (likes, followers, media counts)
- `likeUser(userId: string)` - Like a user
- `unlikeUser(userId: string)` - Unlike a user
- `getUserLikesCount(userId: string)` - Get user's total likes count
- `hasUserLiked(userId: string)` - Check if current user liked this user
- `getUserFollowersCount(userId: string)` - Get user's followers count

**Type Definitions:**
```typescript
export interface UserStats {
    likes_count: number;
    followers_count: number;
    media_count: number;
    albums_count: number;
}
```

**Status**: ❌ **NOT IMPLEMENTED** in our codebase
- No like/unlike functionality
- No user stats display
- Could enhance user profiles with engagement metrics

### 4. Media Management Service (NEW)
**New Service:**
- `media` - MediaService instance for managing user media and albums

**New Methods (via MediaService):**
- Media management methods (likely `getUserMedia()`, `addMedia()`, etc.)
- Album management methods (likely `getUserAlbums()`, `createAlbum()`, etc.)

**Type Definitions:**
```typescript
export type MediaType = 'video' | 'image' | 'audio';
export type PrivacyLevel = 'public' | 'private' | 'team_only';

export interface UserMedia {
    id: string;
    user_id: string;
    media_type: MediaType;
    title?: string;
    description?: string;
    file_url: string;
    file_size?: number;
    duration?: number;
    thumbnail_url?: string;
    privacy: PrivacyLevel;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface UserAlbum {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    cover_media_id?: string;
    privacy: PrivacyLevel;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    media_count?: number;
    media?: UserMedia[];
}
```

**Status**: ❌ **NOT IMPLEMENTED** in our codebase
- We currently use `UserPortfolio` for images/videos
- New media service provides more advanced features (albums, privacy levels, etc.)
- Could replace or enhance current portfolio system

### 5. News/Posts System (NEW)
**New Methods:**
- `getPublishedNews(filters?)` - Get published news posts (public)
- `getNewsPostBySlug(slug: string)` - Get news post by slug (public)
- `getNewsCategories()` - Get all news categories (public)
- `getNewsTags()` - Get all news tags (public)
- `getAdminNewsPosts(filters?)` - Get all news posts (admin only)
- `createNewsPost(data)` - Create news post (admin only)
- `updateNewsPost(id, data)` - Update news post (admin only)
- `deleteNewsPost(id)` - Delete news post (admin only)
- `publishNewsPost(id)` - Publish news post (admin only)
- `unpublishNewsPost(id)` - Unpublish news post (admin only)
- `uploadNewsPhoto(file)` - Upload news photo (admin only)
- `uploadNewsThumbnail(file)` - Upload news thumbnail (admin only)

**Type Definitions:**
```typescript
export interface NewsPost {
    id: string;
    title: string;
    slug: string;
    author: string;
    excerpt?: string;
    body: string;
    photo_url?: string;
    thumbnail_url?: string;
    status: 'draft' | 'published';
    published_at?: string;
    // ... more fields
}

export interface NewsFilters {
    category?: string;
    tags?: string[];
    search?: string;
    status?: 'draft' | 'published';
    page?: number;
    limit?: number;
    sort?: 'newest' | 'oldest';
}
```

**Status**: ❌ **NOT IMPLEMENTED** in our codebase
- No news/blog functionality
- Could be useful for industry news, announcements, etc.

### 6. Quick Company Creation (NEW)
**New Method:**
- `quickCreateCompany(companyData)` - Create company without profile completeness requirement

**Status**: ⚠️ **PARTIALLY IMPLEMENTED**
- We have `createCompany()` method
- `quickCreateCompany()` bypasses profile completeness check
- Could be useful for faster company registration

## Comparison with Current Implementation

### ✅ Already Implemented (Using Direct API Calls)
1. **Social Media Links** - We implemented these using direct `fetch` calls to `/api/social-links`
   - Our implementation matches the library's interface
   - We can optionally migrate to use library methods for consistency

### ❌ Not Implemented (New Features Available)
1. **User Contacts Management** - No implementation
2. **User Stats & Engagement** - No implementation
3. **Media Service** - We use portfolio, but new media service is more advanced
4. **News/Posts System** - No implementation
5. **Quick Company Creation** - Not used

## Breaking Changes Analysis

### ✅ No Breaking Changes
- All new features are additive
- Existing functionality remains unchanged
- Type definitions are backward compatible

## Recommendations

### High Priority
1. **Review Social Links Implementation**
   - Consider migrating from direct API calls to library methods for consistency
   - Library methods: `api.getUserSocialLinks()`, `api.addSocialLink()`, etc.
   - Our current implementation works but uses direct fetch calls

### Medium Priority
2. **User Stats & Engagement**
   - Implement like/unlike functionality
   - Display user stats (likes, followers) on profiles
   - Add engagement metrics to user cards

3. **Media Service Migration**
   - Evaluate migrating from `UserPortfolio` to new `MediaService`
   - New service supports albums, privacy levels, and more media types
   - Could enhance gallery/portfolio functionality

### Low Priority
4. **User Contacts**
   - Add contact management for talent profiles
   - Useful for agent contacts, emergency contacts, etc.

5. **News System**
   - Consider implementing news/blog section
   - Could show industry news, announcements, etc.

## Migration Notes

1. **Social Links**: Our current implementation works, but we could migrate to library methods:
   ```typescript
   // Current (direct API call)
   const response = await fetch(`${baseUrl}/api/social-links`, {...});
   
   // Library method (optional migration)
   const response = await api.getUserSocialLinks();
   ```

2. **No immediate action required** - The update is non-breaking
3. **New features available** - Can be implemented as needed
4. **Backward compatible** - All existing code continues to work

## Next Steps

1. ✅ **Package updated** - Done (v2.3.0 installed)
2. ⏳ **Review social links implementation** - Consider migrating to library methods
3. 🔧 **Evaluate new features** - Decide which features to implement
4. 🚀 **Implement high-priority features** - User stats, engagement, media service

## Summary

Version 2.3.0 adds significant new functionality:
- ✅ Social media links (already implemented via direct API)
- ❌ User contacts management (new)
- ❌ User stats & engagement (new)
- ❌ Advanced media service (new)
- ❌ News/blog system (new)
- ⚠️ Quick company creation (new option)

The update is **non-breaking** and all existing functionality continues to work. New features can be implemented as needed.

