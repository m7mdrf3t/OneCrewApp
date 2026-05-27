import { rateLimiter, CacheTTL } from '../utils/rateLimiter';

interface UseNewsMethodsParams {
  api: any;
  getAccessToken: () => string;
}

export function useNewsMethods({
  api,
  getAccessToken,
}: UseNewsMethodsParams) {
  const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
  const getPublishedNews = async (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest' }) => {
    const cacheKey = `published-news-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    Fetching published news...', filters);
        const response = await api.getPublishedNews(filters);
        console.log('    Published news fetched successfully:', response.data?.pagination?.total || 0, 'posts');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch published news:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // News posts change when published/updated - 5min TTL with persistence
  };

  const getNewsPostBySlug = async (slug: string) => {
    const cacheKey = `news-post-${slug}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    Fetching news post by slug:', slug);
        const response = await api.getNewsPostBySlug(slug);
        console.log('    News post fetched successfully');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch news post:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM, persistent: true }); // Individual news posts change when edited - 5min TTL with persistence
  };

  const getNewsCategories = async () => {
    const cacheKey = 'news-categories';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    Fetching news categories...');
        const response = await api.getNewsCategories();
        console.log('    News categories fetched successfully:', response.data?.length || 0, 'categories');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch news categories:', error);
        throw error;
      }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // News categories are static reference data - 1hr TTL with persistence
  };

  const getNewsTags = async () => {
    const cacheKey = 'news-tags';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    Fetching news tags...');
        const response = await api.getNewsTags();
        console.log('    News tags fetched successfully:', response.data?.length || 0, 'tags');
        return response;
      } catch (error: any) {
        console.error('  Failed to fetch news tags:', error);
        throw error;
      }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // News tags are static reference data - 1hr TTL with persistence
  };

  // News Admin methods (admin only)
  const getAdminNewsPosts = async (filters?: { category?: string; tags?: string[]; search?: string; page?: number; limit?: number; sort?: 'newest' | 'oldest'; status?: 'draft' | 'published' }) => {
    const cacheKey = `admin-news-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    [Admin] Fetching news posts...', filters);
        const response = await api.getAdminNewsPosts(filters);
        console.log('    [Admin] News posts fetched successfully');
        return response;
      } catch (error: any) {
        console.error('  [Admin] Failed to fetch news posts:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: false });
  };

  const getAdminNewsPostById = async (id: string) => {
    const cacheKey = `admin-news-${id}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('    [Admin] Fetching news post by ID:', id);
        const response = await api.getAdminNewsPostById(id);
        console.log('    [Admin] News post fetched successfully');
        return response;
      } catch (error: any) {
        console.error('  [Admin] Failed to fetch news post:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: false });
  };

  const createNewsPost = async (data: any) => {
    try {
      console.log('    [Admin] Creating news post...');
      const response = await api.createNewsPost(data);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern('admin-news');
        console.log('    [Admin] News post created successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to create news post');
    } catch (error: any) {
      console.error('  [Admin] Failed to create news post:', error);
      throw error;
    }
  };

  const updateNewsPost = async (id: string, data: any) => {
    try {
      console.log('    [Admin] Updating news post:', id);
      const response = await api.updateNewsPost(id, data);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('    [Admin] News post updated successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to update news post');
    } catch (error: any) {
      console.error('  [Admin] Failed to update news post:', error);
      throw error;
    }
  };

  const deleteNewsPost = async (id: string) => {
    try {
      console.log('    [Admin] Deleting news post:', id);
      const response = await api.deleteNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('    [Admin] News post deleted successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to delete news post');
    } catch (error: any) {
      console.error('  [Admin] Failed to delete news post:', error);
      throw error;
    }
  };

  const publishNewsPost = async (id: string) => {
    try {
      console.log('    [Admin] Publishing news post:', id);
      const response = await api.publishNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('    [Admin] News post published successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to publish news post');
    } catch (error: any) {
      console.error('  [Admin] Failed to publish news post:', error);
      throw error;
    }
  };

  const unpublishNewsPost = async (id: string) => {
    try {
      console.log('    [Admin] Unpublishing news post:', id);
      const response = await api.unpublishNewsPost(id);
      if (response.success) {
        // Invalidate news caches
        await rateLimiter.clearCacheByPattern('published-news');
        await rateLimiter.clearCacheByPattern(`admin-news-${id}`);
        console.log('    [Admin] News post unpublished successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to unpublish news post');
    } catch (error: any) {
      console.error('  [Admin] Failed to unpublish news post:', error);
      throw error;
    }
  };

  const uploadNewsPhoto = async (file: any, filename?: string) => {
    try {
      console.log('    [Admin] Uploading news photo...');
      const response = await api.uploadNewsPhoto(file, filename);
      if (response.success) {
        console.log('    [Admin] News photo uploaded successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to upload news photo');
    } catch (error: any) {
      console.error('  [Admin] Failed to upload news photo:', error);
      throw error;
    }
  };

  const uploadNewsThumbnail = async (file: any, filename?: string) => {
    try {
      console.log('    [Admin] Uploading news thumbnail...');
      const response = await api.uploadNewsThumbnail(file, filename);
      if (response.success) {
        console.log('    [Admin] News thumbnail uploaded successfully');
        return response;
      }
      throw new Error(response.error || 'Failed to upload news thumbnail');
    } catch (error: any) {
      console.error('  [Admin] Failed to upload news thumbnail:', error);
      throw error;
    }
  };

  // News like methods
  const likeNewsPost = async (postId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to like posts');
      }

      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const response = await fetch(`${baseUrl}/api/news/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Invalidate news caches to ensure fresh data
        await rateLimiter.clearCacheByPattern('published-news-');
        await rateLimiter.clearCacheByPattern(`news-post-${postId}`);
        console.log('    News post liked successfully');
        return data;
      }

      throw new Error(data.error || data.message || 'Failed to like news post');
    } catch (error: any) {
      console.error('  Failed to like news post:', error);
      throw error;
    }
  };

  const unlikeNewsPost = async (postId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to unlike posts');
      }

      const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
      const response = await fetch(`${baseUrl}/api/news/${postId}/like`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Invalidate news caches to ensure fresh data
        await rateLimiter.clearCacheByPattern('published-news-');
        await rateLimiter.clearCacheByPattern(`news-post-${postId}`);
        console.log('    News post unliked successfully');
        return data;
      }

      throw new Error(data.error || data.message || 'Failed to unlike news post');
    } catch (error: any) {
      console.error('  Failed to unlike news post:', error);
      throw error;
    }
  };

  // Get unread conversation count using lightweight endpoint

  return {
    getPublishedNews,
    getNewsPostBySlug,
    getNewsCategories,
    getNewsTags,
    getAdminNewsPosts,
    getAdminNewsPostById,
    createNewsPost,
    updateNewsPost,
    deleteNewsPost,
    publishNewsPost,
    unpublishNewsPost,
    uploadNewsPhoto,
    uploadNewsThumbnail,
    likeNewsPost,
    unlikeNewsPost,
  };
}
