import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../contexts/ApiContext';

type NewsDetailRouteProp = RouteProp<RootStackParamList, 'newsDetail'>;

interface NewsDetailPageProps {
  slug?: string;
  post?: any;
  onBack?: () => void;
  isDark?: boolean;
}

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  photo_url?: string;
  thumbnail_url?: string;
  author?: string;
  published_at?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

const NewsDetailPage: React.FC<NewsDetailPageProps> = ({ slug: slugProp, post: initialPostProp, onBack: onBackProp, isDark }) => {
  const navigation = useNavigation();
  const route = useRoute<NewsDetailRouteProp>();
  const { getNewsPostBySlug } = useApi();
  
  // Get params from route or props (route takes precedence for React Navigation)
  const slug = route.params?.slug || slugProp;
  const initialPost = route.params?.post || initialPostProp;
  
  const [post, setPost] = useState<NewsPost | null>(initialPost || null);
  const [isLoading, setIsLoading] = useState(!initialPost && !!slug);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const darkMode = isDark ?? (colorScheme === 'dark');
  const { width } = useWindowDimensions();
  
  // Use navigation.goBack() if available, otherwise use onBack prop
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (onBackProp) {
      onBackProp();
    }
  };

  useEffect(() => {
    const loadPost = async () => {
      if (!slug || initialPost) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await getNewsPostBySlug(slug);
        
        if (response.success && response.data) {
          setPost(response.data);
          // Update header title when post loads
          navigation.setOptions({ title: response.data.title || 'News' });
        } else {
          setError(response.error || 'Failed to load post');
        }
      } catch (err: any) {
        console.error('Failed to load news post:', err);
        setError(err.message || 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [slug, initialPost, getNewsPostBySlug, navigation]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: darkMode ? '#0b0b0b' : '#f4f4f5' }]}>
        <ActivityIndicator size="large" color={darkMode ? '#fff' : '#000'} />
        <Text style={[styles.loadingText, { color: darkMode ? '#9ca3af' : '#4b5563' }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: darkMode ? '#0b0b0b' : '#f4f4f5' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={darkMode ? '#9ca3af' : '#4b5563'} />
        <Text style={[styles.errorText, { color: darkMode ? '#9ca3af' : '#4b5563' }]}>
          {error || 'Post not found'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: darkMode ? '#1f2937' : '#e5e7eb' }]}
          onPress={handleBack}
        >
          <Text style={[styles.retryButtonText, { color: darkMode ? '#fff' : '#000' }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#0b0b0b' : '#f4f4f5' }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image */}
        {(post.photo_url || post.thumbnail_url) && (
          <Image
            source={{ uri: post.photo_url || post.thumbnail_url }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* Content */}
        <View style={[styles.content, { backgroundColor: darkMode ? '#0e1113' : '#fff' }]}>
          {/* Category Badge */}
          {post.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: darkMode ? '#fff' : '#000' }]}>
            {post.title}
          </Text>

          {/* Meta Info */}
          <View style={styles.meta}>
            {post.author && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color={darkMode ? '#6b7280' : '#9ca3af'} />
                <Text style={[styles.metaText, { color: darkMode ? '#6b7280' : '#9ca3af' }]}>
                  {post.author}
                </Text>
              </View>
            )}
            {post.published_at && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={darkMode ? '#6b7280' : '#9ca3af'} />
                <Text style={[styles.metaText, { color: darkMode ? '#6b7280' : '#9ca3af' }]}>
                  {formatDate(post.published_at)}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: darkMode ? '#1f2937' : '#f3f4f6' }]}
                >
                  <Text style={[styles.tagText, { color: darkMode ? '#9ca3af' : '#6b7280' }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <View style={styles.excerptContainer}>
              <RenderHTML
                contentWidth={width - 80} // Account for padding (20 * 2) + content padding (20 * 2)
                source={{ html: post.excerpt }}
                baseStyle={{
                  color: darkMode ? '#d1d5db' : '#4b5563',
                  fontSize: 18,
                  lineHeight: 28,
                  fontStyle: 'italic',
                }}
                tagsStyles={{
                  p: { marginBottom: 12, marginTop: 0 },
                  strong: { fontWeight: 'bold' },
                  em: { fontStyle: 'italic' },
                }}
              />
            </View>
          )}

          {/* Body */}
          {post.body && (
            <View style={styles.bodyContainer}>
              <RenderHTML
                contentWidth={width - 80} // Account for padding (20 * 2) + content padding (20 * 2)
                source={{ html: post.body }}
                baseStyle={{
                  color: darkMode ? '#e5e7eb' : '#1f2937',
                  fontSize: 16,
                  lineHeight: 26,
                }}
                tagsStyles={{
                  p: { marginBottom: 16, marginTop: 0 },
                  strong: { fontWeight: 'bold', color: darkMode ? '#fff' : '#000' },
                  em: { fontStyle: 'italic' },
                  h1: { 
                    fontSize: 28, 
                    fontWeight: 'bold', 
                    marginBottom: 16, 
                    marginTop: 0,
                    color: darkMode ? '#fff' : '#000'
                  },
                  h2: { 
                    fontSize: 24, 
                    fontWeight: 'bold', 
                    marginBottom: 14, 
                    marginTop: 0,
                    color: darkMode ? '#fff' : '#000'
                  },
                  h3: { 
                    fontSize: 20, 
                    fontWeight: 'bold', 
                    marginBottom: 12, 
                    marginTop: 0,
                    color: darkMode ? '#fff' : '#000'
                  },
                  ul: { marginBottom: 16, marginTop: 0 },
                  ol: { marginBottom: 16, marginTop: 0 },
                  li: { marginBottom: 8 },
                  blockquote: {
                    borderLeftWidth: 4,
                    borderLeftColor: darkMode ? '#3b82f6' : '#3b82f6',
                    paddingLeft: 16,
                    marginLeft: 0,
                    marginBottom: 16,
                    fontStyle: 'italic',
                  },
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: -40,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#111827',
  },
  content: {
    padding: 20,
    borderRadius: 0,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  excerptContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  excerpt: {
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  bodyContainer: {
    marginTop: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
  },
});

export default NewsDetailPage;

