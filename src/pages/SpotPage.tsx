import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface SpotPageProps {
  isDark: boolean;
  onNavigate?: (page: string, data?: any) => void;
}

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  photo_url?: string;
  thumbnail_url?: string;
  author?: string;
  published_at?: string;
  category?: string;
  tags?: string[];
}

const SpotPage: React.FC<SpotPageProps> = ({ isDark, onNavigate }) => {
  const { getPublishedNews } = useApi();
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNews = async () => {
    try {
      setError(null);
      const response = await getPublishedNews({
        page: 1,
        limit: 20,
        sort: 'newest',
      });

      if (response.success && response.data) {
        // Handle paginated response structure: 
        // { success: true, data: { data: NewsPost[], pagination: {...} } }
        let posts: NewsPost[] = [];
        
        if (response.data.data && Array.isArray(response.data.data)) {
          // Paginated response: { data: [...], pagination: {...} }
          posts = response.data.data;
          console.log('📰 Parsed posts from paginated response:', posts.length);
        } else if (Array.isArray(response.data)) {
          // Direct array response (fallback)
          posts = response.data;
          console.log('📰 Parsed posts from direct array:', posts.length);
        } else {
          console.warn('⚠️ Unexpected response structure:', response.data);
          posts = [];
        }

        if (posts.length > 0) {
          console.log('📰 First post:', posts[0].title);
        } else {
          console.log('📰 No posts found. Total in pagination:', response.data.pagination?.total || 0);
        }
        
        setNewsPosts(posts);
      } else {
        console.error('❌ Response not successful:', {
          success: response.success,
          error: response.error,
          message: response.message,
        });
        setError(response.error || response.message || 'Failed to load news');
        setNewsPosts([]);
      }
    } catch (err: any) {
      console.error('❌ Failed to load news:', err);
      setError(err.message || 'Failed to load news');
      setNewsPosts([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Clear cache to ensure fresh data
    try {
      const { rateLimiter } = await import('../utils/rateLimiter');
      await rateLimiter.clearCacheByPattern('published-news-');
      console.log('🔄 Cache cleared for news');
    } catch (err) {
      console.warn('⚠️ Could not clear cache:', err);
    }
    loadNews();
  };

  const handleNewsPress = (post: NewsPost) => {
    if (onNavigate) {
      onNavigate('newsDetail', { slug: post.slug, post });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#0b0b0b' : '#f4f4f5' }]}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        <Text style={[styles.loadingText, { color: isDark ? '#9ca3af' : '#4b5563' }]}>
          Loading news...
        </Text>
      </View>
    );
  }

  if (error && newsPosts.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#0b0b0b' : '#f4f4f5' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={isDark ? '#9ca3af' : '#4b5563'} />
        <Text style={[styles.errorText, { color: isDark ? '#9ca3af' : '#4b5563' }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]}
          onPress={loadNews}
        >
          <Text style={[styles.retryButtonText, { color: isDark ? '#fff' : '#000' }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? '#0b0b0b' : '#f4f4f5' }]} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? '#fff' : '#000'}
        />
      }
    >
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: isDark ? '#1f2937' : '#fef2f2' }]}>
          <Ionicons name="warning-outline" size={20} color={isDark ? '#fbbf24' : '#ef4444'} />
          <Text style={[styles.errorBannerText, { color: isDark ? '#fbbf24' : '#ef4444' }]}>
            {error}
          </Text>
        </View>
      )}
      
      {newsPosts.length === 0 ? (
        <View style={[styles.centerContent, styles.emptyState]}>
          <Ionicons name="newspaper-outline" size={64} color={isDark ? '#374151' : '#9ca3af'} />
          <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            No published news available
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
            Posts may be in draft status.{'\n'}Please publish them in the admin panel.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {newsPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.card, { backgroundColor: isDark ? '#0e1113' : '#fff', shadowColor: isDark ? '#000' : '#000' }]}
              onPress={() => handleNewsPress(post)}
              activeOpacity={0.7}
            >
              {(post.photo_url || post.thumbnail_url) && (
                <Image 
                  source={{ uri: post.photo_url || post.thumbnail_url }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
              )}
              <View style={styles.content}>
                {post.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{post.category}</Text>
                  </View>
                )}
                <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]} numberOfLines={2}>
                  {post.title}
                </Text>
                {(post.excerpt || post.body) && (
                  <Text style={[styles.summary, { color: isDark ? '#9ca3af' : '#4b5563' }]} numberOfLines={3}>
                    {post.excerpt || (post.body ? post.body.substring(0, 150) + '...' : '')}
                  </Text>
                )}
                <View style={styles.footer}>
                  {post.author && (
                    <Text style={[styles.author, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                      {post.author}
                    </Text>
                  )}
                  {post.published_at && (
                    <Text style={[styles.date, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                      {formatDate(post.published_at)}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
  },
  emptyState: {
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: 16,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
  },
  author: {
    fontSize: 14,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
  },
});

export default SpotPage;


