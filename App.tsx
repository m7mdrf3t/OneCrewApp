import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StatusBar, useColorScheme, Alert, Linking, Platform, InteractionManager } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
// Firebase Messaging is now used instead of expo-notifications
// We'll import it dynamically to avoid errors when native modules aren't ready
import { ensureFirebaseInitialized } from './src/services/FirebaseInitService';

// Context
import { ApiProvider, useApi } from './src/contexts/ApiContext';
import { GlobalModalsProvider } from './src/contexts/GlobalModalsContext';
import { StreamChatProvider } from './src/components/StreamChatProvider';
import pushNotificationService from './src/services/PushNotificationService';
import { queryClient } from './src/services/queryClient';
import { initializeWarningSuppressions } from './src/utils/warningSuppression';

// Navigation
import { AppNavigator } from './src/navigation/AppNavigator';
import { NavigationProvider, navigationRef } from './src/navigation/NavigationContext';
import { RootStackParamList } from './src/navigation/types';

// Android-specific hooks
import { useAndroidBackHandler } from './src/hooks/useAndroidBackHandler';

// Components
import { ErrorBoundary } from './src/components/ErrorBoundary';
import TabBar from './src/components/TabBar';
import SplashScreen from './src/components/SplashScreen';
import SkeletonScreen from './src/components/SkeletonScreen';
import GlobalModals from './src/components/GlobalModals';
import OTAUpdateBanner from './src/components/OTAUpdateBanner';
// Data
import { ProjectCreationData, ProjectDashboardData } from './src/types';

// Platform-specific styles
import { createPlatformStyles } from './src/utils/platformStyles';
import { appCommonStyles } from './App.styles.common';
import { appIosStyles } from './App.styles.ios';
import { appAndroidStyles } from './App.styles.android';


const getActiveRouteName = (state: any): string | null => {
  if (!state?.routes?.length) {
    return null;
  }

  const route = state.routes[state.index ?? 0];
  if (route?.state) {
    return getActiveRouteName(route.state);
  }

  return route?.name ?? null;
};

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout, api, isGuest, getProjectById, updateProject, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus, currentProfileType, activeCompany, isAppBootCompleted, setAppBootCompleted } = useApi();
  const insets = useSafeAreaInsets();
  // Calculate TabBar height: padding (16) + content (~50) + safe area bottom
  const tabBarHeight = 66 + Math.max(insets.bottom, 8);
  const [showSplash, setShowSplash] = useState(true);
  const [showProjectCreation, setShowProjectCreation] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectDashboardData | null>(null);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanyServicesModal, setShowCompanyServicesModal] = useState(false);
  const [selectedCompanyForServices, setSelectedCompanyForServices] = useState<any>(null);
  const [companyProfileRefreshTrigger, setCompanyProfileRefreshTrigger] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [selectedCompanyForInvitation, setSelectedCompanyForInvitation] = useState<any>(null);
  const [showInvitationListModal, setShowInvitationListModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const lastBackPressAtRef = useRef<number>(0);
  const navigationReadyRef = useRef(false);
  const pendingNotificationDataRef = useRef<any>(null);
  const pendingDeepLinkRef = useRef<string | null>(null);
  
  // Guest user tracking state
  const [guestSessionStartTime, setGuestSessionStartTime] = useState<number | null>(null);
  const [guestClickCount, setGuestClickCount] = useState(0);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const guestPromptShownRef = useRef(false);
  const pendingTabChangeRef = useRef<string | null>(null);

  useEffect(() => {
    if (systemColorScheme === 'light' || systemColorScheme === 'dark') {
      setTheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  // Track current route to update active tab
  const [currentRoute, setCurrentRoute] = useState<string>('spot');

  // Chat is opened from Messages; keep the Messages tab highlighted in the tab bar
  const tabBarActiveRoute =
    currentRoute === 'chat' ? 'conversations' : currentRoute;

  const syncRouteState = useCallback((routeName?: string | null) => {
    const nextRoute = routeName || 'spot';
    setCurrentRoute((prev) => (prev === nextRoute ? prev : nextRoute));
  }, []);

  // Navigation function - uses React Navigation
  const navigateTo = useCallback((pageName: string, data: any = null) => {
    console.log('🧭 Navigating to:', pageName, data);
    
    // Map legacy page names to React Navigation routes
    const routeMap: Record<string, keyof RootStackParamList> = {
      'spot': 'spot',
      'home': 'home',
      'projects': 'projects',
      'wall': 'wall',
      'profile': 'profile',
      'myProfile': 'myProfile',
      'profileCompletion': 'profileCompletion',
      'companyProfile': 'companyProfile',
      'companyRegistration': 'companyRegistration',
      'projectDetail': 'projectDetail',
      'newProject': 'newProject',
      'newProjectEasy': 'newProjectEasy',
      'details': 'details',
      'academyDetail': 'academyDetail',
      'legalDetail': 'legalDetail',
      'sectionServices': 'sectionServices',
      'directory': 'directory',
      'chat': 'chat',
      'conversations': 'conversations',
      'settings': 'settings',
      'changePassword': 'changePassword',
      'accountDeletion': 'accountDeletion',
      'privacyPolicy': 'privacyPolicy',
      'support': 'support',
      'agenda': 'agenda',
      'allAgenda': 'allAgenda',
      'bookingRequests': 'bookingRequests',
      'weeklySchedule': 'weeklySchedule',
      'coursesManagement': 'coursesManagement',
      'courseEdit': 'courseEdit',
      'courseDetail': 'courseDetail',
      'publicCourses': 'publicCourses',
      'companyEdit': 'companyEdit',
      'companyMembersManagement': 'companyMembersManagement',
      'newsDetail': 'newsDetail',
    };

    const routeName = routeMap[pageName] as keyof RootStackParamList | undefined;
    if (!routeName || !navigationRef.current) {
      console.warn(`Route not found for page: ${pageName}`);
      return;
    }
    
    // Transform data to match route params
    let params: any = undefined;
    
    if (data) {
      // Handle different data formats
      if (pageName === 'profile' || pageName === 'myProfile') {
        params = { profile: data, user: data };
      } else if (pageName === 'projectDetail') {
        params = { project: data };
      } else if (pageName === 'companyProfile') {
        // Preserve readOnly flag when navigating to company profile
        const companyId = typeof data === 'string' ? data : (data?.companyId || data?.id || data);
        params = { 
          companyId,
          readOnly: data?.readOnly ?? false
        };
      } else if (pageName === 'chat') {
        params = data;
      } else if (pageName === 'sectionServices') {
        params = { sectionKey: data?.key || data };
      } else if (pageName === 'details' || pageName === 'academyDetail' || pageName === 'legalDetail') {
        params = { serviceData: data };
      } else if (pageName === 'courseDetail' || pageName === 'courseEdit' || pageName === 'coursesManagement') {
        params = data;
      } else if (pageName === 'publicCourses') {
        params = { filters: data?.filters || data };
      } else if (pageName === 'newsDetail') {
        params = { slug: data?.slug || data, post: data?.post || data };
      } else {
        params = data;
      }
    }
    
    // Use type assertion for navigation since we've validated routeName exists
    (navigationRef.current as any).navigate(routeName, params);
  }, []);

  // Helper function to handle notification navigation
  const handleNotificationNavigation = useCallback((data: any) => {
    if (data.type === 'company_invitation' && user) {
      setShowNotificationModal(false);
      setShowInvitationListModal(true);
    } else if (data.type === 'project_created' || data.type === 'project_member_added') {
      if (data.project_id && typeof data.project_id === 'string') {
        (async () => {
          try {
            const project = await getProjectById(data.project_id as string);
            if (project) {
              navigateTo('projectDetail', project);
            }
          } catch (error) {
            console.error('Failed to fetch project for navigation:', error);
          }
        })();
      }
    } else if (data.type === 'task_assigned' || data.type === 'task_completed') {
      if (data.project_id && typeof data.project_id === 'string') {
        (async () => {
          try {
            const project = await getProjectById(data.project_id as string);
            if (project) {
              navigateTo('projectDetail', project);
            }
          } catch (error) {
            console.error('Failed to fetch project for navigation:', error);
          }
        })();
      }
    } else if (data.type === 'message_received') {
      if (data.conversation_id && typeof data.conversation_id === 'string') {
        navigateTo('chat', { conversationId: data.conversation_id as string });
      }
    } else if (data.type === 'message.new') {
      // Stream Chat default push payload: type "message.new", channel_id or cid (e.g. "messaging:onecrew_xxx")
      const channelId = typeof data.channel_id === 'string' ? data.channel_id : null;
      const cid = typeof data.cid === 'string' ? data.cid : null;
      const conversationId = channelId || (cid ? cid.replace(/^messaging:/, '') : null);
      if (conversationId) {
        navigateTo('chat', { conversationId });
      }
    } else if (data.type === 'reaction_added' || data.type === 'reaction.new' || data.type === 'message_reaction') {
      // Reaction notification payload (backend or Stream webhook → FCM)
      const channelId = typeof data.channel_id === 'string' ? data.channel_id : null;
      const cid = typeof data.cid === 'string' ? data.cid : null;
      const conversationId =
        (typeof data.conversation_id === 'string' ? data.conversation_id : null) ||
        channelId ||
        (cid ? cid.replace(/^messaging:/, '') : null);
      if (conversationId) {
        navigateTo('chat', { conversationId });
      }
    } else if (data.type === 'company_approved') {
      // Company approval push (admin approved company) – open company profile
      const companyId = typeof data.company_id === 'string' ? data.company_id : null;
      if (companyId) {
        navigateTo('companyProfile', { companyId });
      }
    } else if (data.type === 'news_post' || data.newsPostId || data.slug) {
      // News post push (admin published post) – open post by slug
      const slug =
        (typeof data.slug === 'string' && data.slug) ||
        (typeof data.link_url === 'string' && data.link_url.startsWith('/news/')
          ? data.link_url.replace(/^\/news\/?/, '').split('?')[0]
          : null);
      if (slug) {
        navigateTo('newsDetail', { slug });
      }
    } else if (data.link_url && typeof data.link_url === 'string' && data.link_url.startsWith('/news/')) {
      // Fallback: link_url only (e.g. /news/my-post-slug)
      const slug = data.link_url.replace(/^\/news\/?/, '').split('?')[0];
      if (slug) {
        navigateTo('newsDetail', { slug });
      }
    } else if (data.link_url) {
      // Handle other custom link URLs
      console.log('Navigate to:', data.link_url);
    }
  }, [user, getProjectById, navigateTo]);

  // Parse a deep link URL into a { screen, params } pair, or null if unrecognised.
  const parseDeepLink = useCallback((url: string): { screen: string; params: any } | null => {
    try {
      // Strip the scheme — works for com.minaezzat.onesteps://path?query
      const withoutScheme = url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
      const [pathPart, queryPart] = withoutScheme.split('?');
      const segments = pathPart.split('/').filter(Boolean);

      const query: Record<string, string> = {};
      if (queryPart) {
        queryPart.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        });
      }

      // news/:slug  →  NewsDetailPage
      if (segments[0] === 'news' && segments[1]) {
        return { screen: 'newsDetail', params: { slug: segments[1] } };
      }

      // company/:companyId/course/:courseId  →  CourseDetailPage
      if (segments[0] === 'company' && segments[2] === 'course' && segments[1] && segments[3]) {
        return { screen: 'courseDetail', params: { courseId: segments[3], companyId: segments[1] } };
      }

      // company/:companyId  →  CompanyProfilePage
      if (segments[0] === 'company' && segments[1]) {
        return { screen: 'companyProfile', params: { companyId: segments[1], readOnly: true } };
      }

      // course/:courseId  →  CourseDetailPage
      if (segments[0] === 'course' && segments[1]) {
        return { screen: 'courseDetail', params: { courseId: segments[1], companyId: query.companyId } };
      }

      // courses?company_id=...  →  PublicCoursesPage
      if (segments[0] === 'courses') {
        return { screen: 'publicCourses', params: { filters: { company_id: query.company_id } } };
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // Navigate to a parsed deep link once navigation is ready.
  const flushPendingDeepLink = useCallback(() => {
    const url = pendingDeepLinkRef.current;
    if (!url || !navigationReadyRef.current) return;

    const parsed = parseDeepLink(url);
    if (parsed) {
      pendingDeepLinkRef.current = null;
      navigateTo(parsed.screen, parsed.params);
    }
  }, [parseDeepLink, navigateTo]);

  // Deep link handler
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('🔗 [App] Deep link received:', event.url);

      if (event.url.includes('oauth/callback')) {
        // OAuth service handles this via its own listener
        return;
      }

      const parsed = parseDeepLink(event.url);
      if (!parsed) return;

      if (isAuthenticated && navigationReadyRef.current) {
        navigateTo(parsed.screen, parsed.params);
      } else {
        // Queue it — flushed after the user logs in
        pendingDeepLinkRef.current = event.url;
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 [App] Initial URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, parseDeepLink, navigateTo]);

  // Push notification handlers (Firebase FCM)
  const notificationUnsubscribe = useRef<(() => void) | null>(null);

  const queueNotificationNavigation = useCallback((data: any) => {
    if (!data) {
      return;
    }

    pendingNotificationDataRef.current = data;
  }, []);

  const flushPendingNotificationNavigation = useCallback(() => {
    if (
      !navigationReadyRef.current ||
      showSplash ||
      isLoading ||
      !pendingNotificationDataRef.current
    ) {
      return;
    }

    const data = pendingNotificationDataRef.current;
    pendingNotificationDataRef.current = null;
    handleNotificationNavigation(data);
  }, [handleNotificationNavigation, isLoading, showSplash]);

  useEffect(() => {
    flushPendingNotificationNavigation();
  }, [flushPendingNotificationNavigation]);

  useEffect(() => {
    if (!isAppBootCompleted) {
      return;
    }

    let isCancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeOnNotificationOpened: (() => void) | null = null;

    const setupNotifications = async () => {
      try {
        const firebaseReady = await ensureFirebaseInitialized();
        if (!firebaseReady && __DEV__) {
          console.warn('⚠️ [App] Firebase not initialized - push notifications may not work');
        }
      } catch (firebaseError: any) {
        if (__DEV__) {
          console.warn('⚠️ [App] Firebase init check failed:', firebaseError?.message);
        }
      }
      
      try {
        await pushNotificationService.initialize();
        if (isCancelled) {
          return;
        }
        
        notificationUnsubscribe.current = pushNotificationService.addNotificationReceivedListener(
          (notification) => {
            if (__DEV__) {
              console.log('📨 [App] Notification received in foreground:', notification);
            }
          }
        );
      } catch (error) {
        console.error('❌ [App] Failed to initialize push notifications:', error);
        retryTimeout = setTimeout(async () => {
          try {
            await pushNotificationService.initialize();
            if (isCancelled) {
              return;
            }
            notificationUnsubscribe.current = pushNotificationService.addNotificationReceivedListener(
              (notification) => {
                if (__DEV__) {
                  console.log('📨 [App] Notification received in foreground:', notification);
                }
              }
            );
          } catch (retryError) {
            console.error('❌ [App] Retry failed to initialize push notifications:', retryError);
          }
        }, 3000);
      }
    };

    console.log('📱 [App] Checking for initial notification...');
    pushNotificationService.getInitialNotification().then((response) => {
      if (isCancelled) {
        return;
      }
      if (response) {
        console.log('📱 [App] App opened from notification:', response);
        const data = response.notification.request.content.data;
        console.log('📱 [App] Initial notification data:', data);
        
        if (data) {
          queueNotificationNavigation(data);
          flushPendingNotificationNavigation();
        } else {
          console.warn('⚠️ [App] Initial notification has no data');
        }
      } else {
        console.log('📱 [App] No initial notification found');
      }
    }).catch((error) => {
      console.error('❌ [App] Error getting initial notification:', error);
    });

    const setupNotificationOpenedListener = async () => {
      try {
        const firebaseReady = await ensureFirebaseInitialized();
        if (!firebaseReady || isCancelled) {
          if (__DEV__) {
            console.warn('⚠️ [App] Skipping notification opened listener - Firebase not initialized');
          }
          return;
        }
        
        console.log('📱 [App] Setting up notification opened listener...');
        const messagingModule = require('@react-native-firebase/messaging');
        if (messagingModule) {
          console.log('✅ [App] Messaging module loaded');
          const messaging = messagingModule.default || messagingModule;
          if (messaging && typeof messaging === 'function') {
            console.log('📱 [App] Registering onNotificationOpenedApp listener...');
            unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage: any) => {
              const data = remoteMessage.data || {};
              queueNotificationNavigation(data);
              flushPendingNotificationNavigation();
            });
            console.log('✅ [App] Notification opened listener registered');
          } else {
            console.error('❌ [App] Messaging is not a function. Type:', typeof messaging);
          }
        } else {
          console.error('❌ [App] Messaging module is null or undefined');
        }
      } catch (error: any) {
        if (error?.message?.includes('NativeEventEmitter') || 
            error?.message?.includes('non-null') ||
            error?.message?.includes('requires a non-null') ||
            error?.message?.includes('Cannot read property')) {
          console.warn('⚠️ [App] Native modules not ready (NativeEventEmitter error)');
        } else if (error?.message?.includes('No Firebase App') || 
                   error?.message?.includes('initializeApp')) {
          console.warn('⚠️ [App] Firebase not initialized - add GoogleService-Info.plist and google-services.json. See FIREBASE_SETUP_INSTRUCTIONS.md');
        } else {
          console.error('❌ [App] Could not set up Firebase notification opened listener:', error?.message || error);
          if (error?.stack) {
            console.error('❌ [App] Stack trace:', error.stack.substring(0, 300));
          }
        }
      }
    };

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      setupNotifications();
      setupNotificationOpenedListener();
    });

    return () => {
      isCancelled = true;
      interactionTask.cancel();
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (notificationUnsubscribe.current) {
        pushNotificationService.removeNotificationSubscription(notificationUnsubscribe.current);
      }
      if (unsubscribeOnNotificationOpened) {
        unsubscribeOnNotificationOpened();
      }
    };
  }, [flushPendingNotificationNavigation, isAppBootCompleted, queueNotificationNavigation]);

  useEffect(() => {
    if (!__DEV__ || !isAppBootCompleted || !isAuthenticated) {
      return;
    }

    let isCancelled = false;
    const tokenTimeout = setTimeout(async () => {
      if (!navigationReadyRef.current || isCancelled) {
        return;
      }

      try {
        const storedToken = await pushNotificationService.getStoredToken();
        if (storedToken && storedToken.startsWith('ExponentPushToken')) {
          console.log('⚠️ Found old Expo token, clearing it...');
          await pushNotificationService.clearToken();
        }
        
        await pushNotificationService.registerForPushNotifications();
      } catch (error: any) {
        console.error('❌ Error getting FCM token:', error?.message || error);
        if (error?.stack) {
          console.error('Stack:', error.stack.substring(0, 500));
        }
      }
    }, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(tokenTimeout);
    };
  }, [isAppBootCompleted, isAuthenticated]);

  useEffect(() => {
    if (!isGuest || !guestSessionStartTime || guestPromptShownRef.current) {
      return;
    }

    const elapsed = Date.now() - guestSessionStartTime;
    const remainingMs = Math.max(5 * 60 * 1000 - elapsed, 0);
    const promptTimeout = setTimeout(() => {
      setShowGuestPrompt(true);
      guestPromptShownRef.current = true;
    }, remainingMs);

    return () => clearTimeout(promptTimeout);
  }, [guestSessionStartTime, isGuest]);

  // Flush any deep link that arrived before the user was authenticated
  useEffect(() => {
    if (isAuthenticated && navigationReadyRef.current) {
      flushPendingDeepLink();
    }
  }, [isAuthenticated, flushPendingDeepLink]);

  // Initialize guest session tracking
  useEffect(() => {
    if (isGuest && !guestSessionStartTime) {
      setGuestSessionStartTime(Date.now());
      setGuestClickCount(0);
      guestPromptShownRef.current = false;
    } else if (!isGuest) {
      // Reset tracking when user is no longer a guest
      setGuestSessionStartTime(null);
      setGuestClickCount(0);
      setShowGuestPrompt(false);
      guestPromptShownRef.current = false;
    }
  }, [isGuest, guestSessionStartTime]);

  // Track clicks for guest users
  useEffect(() => {
    if (isGuest && !guestPromptShownRef.current) {
      const handleClick = () => {
        setGuestClickCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 20) {
            setShowGuestPrompt(true);
            guestPromptShownRef.current = true;
          }
          return newCount;
        });
      };

      // Add click listener to document/root view
      // Note: In React Native, we'll track clicks through TouchableOpacity/TouchableHighlight onPress events
      // We'll increment this in handleTabChange and other interaction handlers
      
      return () => {
        // Cleanup if needed
      };
    }
  }, [isGuest]);

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  const handleServiceSelect = useCallback((serviceData: any, sectionKey: string) => {
    if (sectionKey === 'academy') {
      navigateTo('academyDetail', serviceData);
    } else if (sectionKey === 'legal') {
      navigateTo('legalDetail', serviceData);
    } else {
      navigateTo('details', serviceData);
    }
  }, [navigateTo]);

  const handleProfileSelect = useCallback((profileData: any) => {
    console.log('👤 Profile selected:', profileData);
    console.log('👤 Profile ID:', profileData.id);
    
    // Transform real user data to match ProfileDetailPage expectations
    const transformedProfile = {
      ...profileData,
      // Add missing properties with defaults
      stats: profileData.stats || {
        followers: '0',
        projects: 0,
        likes: '0'
      },
      skills: profileData.skills || [],
      bio: profileData.bio || 'No bio available',
      onlineStatus: profileData.onlineStatus || profileData.online_last_seen || 'Last seen recently',
      about: profileData.about || {
        gender: 'unknown'
      }
    };
    console.log('👤 Transformed profile:', transformedProfile);
    navigateTo('profile', transformedProfile);
  }, [navigateTo]);

  const handleProjectSelect = useCallback((projectData: any) => {
    navigateTo('projectDetail', projectData);
  }, [navigateTo]);

  const handleProjectCreated = useCallback((project: any) => {
    console.log('🎬 Project created:', project);
    // Navigate back to projects page
    navigateTo('projects', null);
    // Optionally refresh projects data
  }, [navigateTo]);

  const handleCreateProject = useCallback(async (projectData: ProjectCreationData) => {
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error('You must be logged in to create a project');
      }

      console.log('👤 Creating project for user:', user.id, user.name);
      console.log('📋 Project data:', projectData);

      // Validate cover image is provided
      if (!projectData.coverImageUrl) {
        throw new Error('Cover image is required for project creation');
      }

      // Build project request from form data
      const projectRequest: any = {
        title: projectData.title.trim(),
        description: projectData.description.trim() || undefined,
        type: projectData.type.trim(),
        start_date: projectData.startDate ? new Date(projectData.startDate).toISOString() : undefined,
        end_date: projectData.endDate ? new Date(projectData.endDate).toISOString() : undefined,
        delivery_date: projectData.endDate ? new Date(projectData.endDate).toISOString() : undefined,
        status: projectData.status || 'planning',
        progress: 0,
        cover_image_url: projectData.coverImageUrl,
      };

      // Add location if provided
      if (projectData.location?.trim()) {
        projectRequest.location = projectData.location.trim();
      }

      // Add budget if provided
      if (projectData.budget !== undefined && projectData.budget !== null) {
        projectRequest.budget = projectData.budget;
      }

      console.log('📋 Creating project with data:', projectRequest);

      // Create the project using the API
      const response = await api.createProject(projectRequest);
      const createdProject = response.data || response;
      console.log('✅ Project created successfully:', createdProject);

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      setShowProjectCreation(false);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      throw new Error(error.message || 'Failed to create project. Please try again.');
    }
  }, [api, user, navigateTo]);

  const handleUpdateProject = useCallback((updatedProject: ProjectDashboardData) => {
    setCurrentProject(updatedProject);
  }, []);

  const handleEditProjectDetails = useCallback(() => {
    setShowProjectDetails(true);
  }, []);

  const handleSaveProjectDetails = useCallback(async (updatedProject: any) => {
    try {
      console.log('💾 Saving project details:', updatedProject);
      // Call the API to update the project
      const response = await updateProject(updatedProject.id, updatedProject);
      if (response.success) {
        setSelectedProject(updatedProject);
        console.log('✅ Project details saved successfully');
      } else {
        throw new Error(response.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Failed to save project details:', error);
      throw error;
    }
  }, [updateProject]);

  const handleRefreshProject = useCallback(async () => {
    if (!selectedProject?.id) return;
    
    try {
      console.log('🔄 Refreshing project data for:', selectedProject.id);
      const latestProjectData = await getProjectById(selectedProject.id);
      console.log('✅ Project data refreshed:', latestProjectData);
      setSelectedProject(latestProjectData);
    } catch (error) {
      console.error('❌ Failed to refresh project data:', error);
    }
  }, [selectedProject?.id, getProjectById]);

  // User menu handlers
  const handleUserMenuPress = useCallback(() => {
    setShowUserMenu(true);
  }, []);

  const handleSettings = useCallback(() => {
    navigateTo('settings', null);
  }, [navigateTo]);

  const handleProfileEdit = useCallback(() => {
    if (user) {
      navigateTo('profileCompletion', user);
    }
  }, [navigateTo, user]);

  const handleCreateCompany = useCallback(() => {
    navigateTo('companyRegistration');
  }, [navigateTo]);

  const handleCompanyRegistrationSuccess = useCallback((companyId: string) => {
    // After successful registration, navigate to company profile
    navigateTo('companyProfile', { companyId });
  }, [navigateTo]);

  const handleHelpSupport = useCallback(() => {
    // TODO: Navigate to help/support page
    console.log('Navigate to Help & Support');
  }, []);

  const handleNavigateToSignup = useCallback(() => {
    (navigationRef.current as any)?.navigate('signup');
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    (navigationRef.current as any)?.navigate('login');
  }, []);

  // Prevent guests from accessing profile completion page
  // Note: This will be handled in the ProfileCompletionPage component with React Navigation
  // useEffect(() => {
  //   if (page.name === 'profileCompletion' && isGuest) {
  //     Alert.alert(
  //       'Sign Up Required',
  //       'Create an account to complete your profile.',
  //       [
  //         { text: 'Cancel', style: 'cancel', onPress: handleBack },
  //         { text: 'Sign Up', onPress: () => {
  //           handleBack();
  //           handleNavigateToSignup();
  //         }},
  //         { text: 'Sign In', onPress: () => {
  //           handleBack();
  //           handleNavigateToLogin();
  //         }},
  //       ]
  //     );
  //   }
  // }, [isGuest, handleBack, handleNavigateToSignup, handleNavigateToLogin]);

  const handleNavigateToProjectDetail = useCallback(async (projectData: any) => {
    try {
      console.log('📋 Navigating to project dashboard:', projectData);
      
      // Handle case where projectData contains project object and additional data
      const projectToLoad = projectData.project || projectData;
      const additionalData = projectData.project ? {
        selectedUser: projectData.selectedUser,
        addUserToTask: projectData.addUserToTask,
      } : {};
      
      console.log('📁 Project to load:', projectToLoad);
      console.log('👤 Additional data:', additionalData);
      
      // Fetch the latest project data from the database
      console.log('🔄 Fetching latest project data from database...');
      const latestProjectData = await getProjectById(projectToLoad.id);
      console.log('✅ Latest project data loaded:', latestProjectData);
      
      const finalProjectData = {
        ...latestProjectData,
        ...additionalData,
      };
      console.log('📊 Setting selectedProject with:', {
        hasSelectedUser: !!finalProjectData.selectedUser,
        selectedUser: finalProjectData.selectedUser ? { id: finalProjectData.selectedUser.id, name: finalProjectData.selectedUser.name } : null,
        addUserToTask: finalProjectData.addUserToTask,
        projectId: finalProjectData.id
      });
      setSelectedProject(finalProjectData);
      setShowProjectDashboard(true);
    } catch (error) {
      console.error('Failed to load project details:', error);
      // Fallback to the original project data if database fetch fails
      const projectToLoad = projectData.project || projectData;
      const additionalData = projectData.project ? {
        selectedUser: projectData.selectedUser,
        addUserToTask: projectData.addUserToTask,
      } : {};
      const finalProjectData = {
        ...projectToLoad,
        ...additionalData,
      };
      console.log('📊 Setting selectedProject (fallback) with:', {
        hasSelectedUser: !!finalProjectData.selectedUser,
        selectedUser: finalProjectData.selectedUser ? { id: finalProjectData.selectedUser.id, name: finalProjectData.selectedUser.name } : null,
        addUserToTask: finalProjectData.addUserToTask,
        projectId: finalProjectData.id
      });
      setSelectedProject(finalProjectData);
      setShowProjectDashboard(true);
      Alert.alert('Warning', 'Using cached project data. Some information may be outdated.');
    }
  }, [getProjectById]);

  const handleAddNewProject = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        'Sign Up Required',
        'Create an account to start creating and managing projects.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: handleNavigateToSignup },
          { text: 'Sign In', onPress: handleNavigateToLogin },
        ]
      );
      return;
    }
    navigateTo('newProject', null);
  }, [navigateTo, isGuest, handleNavigateToSignup, handleNavigateToLogin]);

  const handleAddNewProjectEasy = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        'Sign Up Required',
        'Create an account to start creating and managing projects.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: handleNavigateToSignup },
          { text: 'Sign In', onPress: handleNavigateToLogin },
        ]
      );
      return;
    }
    navigateTo('newProjectEasy', null);
  }, [navigateTo, isGuest, handleNavigateToSignup, handleNavigateToLogin]);

  const handleStartChat = useCallback((profile: any) => {
    // Note: Guest checks are handled in ProfileDetailPage, this is called only for authenticated users
    // Navigate to chat page with participant info - ChatPage will handle conversation creation
    navigateTo('chat', { participant: profile });
  }, [navigateTo]);

  // Task management handlers
  const handleCreateTask = useCallback(async (taskData: any, projectId?: string) => {
    try {
      if (projectId) {
        const createdTask = await createTask(projectId, taskData);
        // Project detail page will handle refresh via route params
        return createdTask; // Return the created task
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }, [createTask]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any, projectId?: string) => {
    try {
      await updateTask(taskId, updates);
      // Project detail page will handle refresh via route params
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }, [updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string, projectId?: string) => {
    try {
      await deleteTask(taskId);
      // Project detail page will handle refresh via route params
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, [deleteTask]);

  const handleAssignTask = useCallback(async (projectId: string, taskId: string, assignment: any) => {
    try {
      await assignTaskService(projectId, taskId, assignment);
      // Project detail page will handle refresh via route params
    } catch (error) {
      console.error('Failed to assign task:', error);
      throw error;
    }
  }, [assignTaskService]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, status: any, projectId?: string) => {
    try {
      await updateTaskStatus(taskId, status);
      // Project detail page will handle refresh via route params
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  }, [updateTaskStatus]);

  const handleTabChange = useCallback((newTab: string) => {
    // Track clicks for guest users
    if (isGuest) {
      setGuestClickCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 20 && !guestPromptShownRef.current) {
          setShowGuestPrompt(true);
          guestPromptShownRef.current = true;
        }
        return newCount;
      });
    }

    // Show prompt for guest users accessing projects or Messages pages
    if (isGuest && (newTab === 'projects' || newTab === 'conversations') && !guestPromptShownRef.current) {
      setShowGuestPrompt(true);
      guestPromptShownRef.current = true;
      pendingTabChangeRef.current = newTab; // Store the tab they wanted to navigate to
      return; // Don't navigate yet, wait for user response
    }

    // Navigate to tab using React Navigation
    navigationRef.current?.navigate(newTab as any);
  }, [isGuest]);

  const handleSplashFinished = () => {
    setShowSplash(false);
    // Defer non-critical API work until after the JS splash finishes
    setAppBootCompleted(true);
  };


  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  const isDark = theme === 'dark';

  // Show splash, auth, or onboarding outside of React Navigation
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <SplashScreen onFinished={handleSplashFinished} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <SkeletonScreen showHeader={true} contentCount={5} isDark={isDark} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Main app with React Navigation
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
        <GlobalModalsProvider>
          <AndroidBackHandlerWrapper>
            <View style={styles.appWrapper}>
            <View style={[styles.navigationContainer, { paddingBottom: tabBarHeight }]}>
              <NavigationContainer
                ref={navigationRef}
                linking={{
                  prefixes: ['com.minaezzat.onesteps://', 'onecrew://'],
                  config: {
                    screens: {
                      companyProfile: 'company/:companyId',
                      courseDetail: 'course/:courseId',
                      publicCourses: 'courses',
                      newsDetail: 'news/:slug',
                    },
                  },
                }}
                onStateChange={(state) => {
                  try {
                    const routeName = getActiveRouteName(state);
                    console.log('🧭 Navigation state changed:', routeName || 'spot');
                    syncRouteState(routeName);
                    flushPendingNotificationNavigation();
                  } catch (error) {
                    console.error('❌ Error in onStateChange:', error);
                    syncRouteState('spot');
                  }
                }}
                onReady={() => {
                  navigationReadyRef.current = true;
                  const initialRoute = getActiveRouteName(navigationRef.current?.getRootState());
                  syncRouteState(initialRoute);
                  flushPendingNotificationNavigation();
                  flushPendingDeepLink();
                  console.log('✅ Navigation ready, initial route:', initialRoute || 'spot');
                }}
              >
                <NavigationProvider>
                  <AppNavigator />
                  <GlobalModals />
                </NavigationProvider>
              </NavigationContainer>
            </View>
            <TabBar
              active={tabBarActiveRoute}
              onChange={handleTabChange}
              onProfilePress={() => {
                if (currentProfileType === 'company' && activeCompany?.id) {
                  navigateTo('companyProfile', { companyId: activeCompany.id });
                } else if (user) {
                  navigateTo('myProfile', user);
                }
              }}
            />
          </View>
          </AndroidBackHandlerWrapper>
        </GlobalModalsProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// Wrapper component that uses Android back handler (must be inside GlobalModalsProvider)
const AndroidBackHandlerWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Android back button handler - must be called inside GlobalModalsProvider
  useAndroidBackHandler();
  return <>{children}</>;
};

// Create platform-specific styles
const styles = createPlatformStyles({
  common: appCommonStyles,
  ios: appIosStyles,
  android: appAndroidStyles,
});

// Main App Component with API Provider
const App: React.FC = () => {
  // Initialize warning suppressions once at app startup
  // This ensures warnings from third-party libraries don't clutter the console
  React.useEffect(() => {
    initializeWarningSuppressions();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ApiProvider>
              <StreamChatProvider>
                <AppContent />
              </StreamChatProvider>
            </ApiProvider>
            <OTAUpdateBanner />
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;