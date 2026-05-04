import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StatusBar, useColorScheme, Alert, ActivityIndicator, Linking, Platform, InteractionManager } from 'react-native';
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
import TabBar from './src/components/TabBar';
import SplashScreen from './src/components/SplashScreen';
import SkeletonScreen from './src/components/SkeletonScreen';
import GlobalModals from './src/components/GlobalModals';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import ResetPasswordPage from './src/pages/ResetPasswordPage';
import VerifyOtpPage from './src/pages/VerifyOtpPage';
import OnboardingPage from './src/pages/OnboardingPage';
import CompanyMembersManagementPage from './src/pages/CompanyMembersManagementPage';

// Data
import { MOCK_PROFILES } from './src/data/mockData';
import { ProjectCreationData, ProjectDashboardData } from './src/types';

// Platform-specific styles
import { createPlatformStyles } from './src/utils/platformStyles';
import { appCommonStyles } from './App.styles.common';
import { appIosStyles } from './App.styles.ios';
import { appAndroidStyles } from './App.styles.android';

const MAIN_TAB_ROUTES = ['home', 'projects', 'spot', 'conversations', 'myProfile', 'profile'] as const;

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
  const { isAuthenticated, user, isLoading, logout, api, isGuest, createGuestSession, getProjectById, updateProject, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus, unreadNotificationCount, unreadConversationCount, currentProfileType, activeCompany, forgotPassword, resendVerificationEmail, isAppBootCompleted, setAppBootCompleted, getCompanyMembers } = useApi();
  const insets = useSafeAreaInsets();
  // Calculate TabBar height: padding (16) + content (~50) + safe area bottom
  const tabBarHeight = 66 + Math.max(insets.bottom, 8);
  const [showSplash, setShowSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [myTeam, setMyTeam] = useState([MOCK_PROFILES[0], MOCK_PROFILES[1]]);
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'verify-email-otp' | 'reset-password' | 'onboarding' | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProjectCreation, setShowProjectCreation] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectDashboardData | null>(null);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyTeam, setShowMyTeam] = useState(false);
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

  // Track current route to update tab and show/hide TabBar
  const [currentRoute, setCurrentRoute] = useState<string>('spot');

  const shouldShowTabBar = useMemo(() => {
    return MAIN_TAB_ROUTES.includes((currentRoute || 'spot') as typeof MAIN_TAB_ROUTES[number]);
  }, [currentRoute]);

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
      'performanceTest': 'performanceTest',
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

  // Deep link handler for OAuth callbacks
  useEffect(() => {
    // Handle deep links when app is opened from a URL
    const handleDeepLink = (event: { url: string }) => {
      console.log('🔗 [App] Deep link received:', event.url);
      
      // Check if it's an OAuth callback
      if (event.url.includes('oauth/callback')) {
        console.log('✅ [App] OAuth callback detected, forwarding to OAuth handler');
        // The OAuth service will handle this via its own listener
        // This is just for logging and potential future handling
      }
    };

    // Set up deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 [App] Initial URL:', url);
        if (url.includes('oauth/callback')) {
          console.log('✅ [App] Initial OAuth callback detected');
          handleDeepLink({ url });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      authPage !== null ||
      showOnboarding ||
      !pendingNotificationDataRef.current
    ) {
      return;
    }

    const data = pendingNotificationDataRef.current;
    pendingNotificationDataRef.current = null;
    handleNotificationNavigation(data);
  }, [authPage, handleNotificationNavigation, isLoading, showOnboarding, showSplash]);

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
        
        const fcmToken = await pushNotificationService.registerForPushNotifications();
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

  // Handle authentication state changes
  useEffect(() => {
    if (!isLoading) {
      // Don't override authPage if user is in OTP verification flow (signupEmail is set)
      // This allows the OTP verification page to stay visible even when isAuthenticated is false
      if (signupEmail && authPage === 'verify-email-otp') {
        console.log('🔒 [App] Preserving verify-email-otp page - user is in OTP verification flow');
        return; // Don't change authPage - user needs to complete OTP verification
      }
      
      if (!isAuthenticated && !isGuest) {
        // Only set to login if we're not already on an auth page (signup, forgot-password, etc.)
        if (!authPage || authPage === null) {
          setAuthPage('login');
        }
      } else if (isAuthenticated && (user?.profile_step === 'onboarding' || user?.profile_completeness === 0)) {
        setShowOnboarding(true);
        setAuthPage(null);
      } else {
        setAuthPage(null);
        setShowOnboarding(false);
      }
    }
  }, [isAuthenticated, isLoading, user, isGuest, signupEmail, authPage]);

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

  const [addProjectToPage, setAddProjectToPage] = useState<((project: any) => void) | null>(null);

  const handleCreateProjectDirect = useCallback(async () => {
    try {
      // Check if user is authenticated
      if (!user) {
        throw new Error('You must be logged in to create a project');
      }

      console.log('👤 Creating project directly for user:', user.id, user.name);

      // Create a simple project with default values
      const projectRequest = {
        title: 'Project 1',
        description: 'New project created',
        type: 'film',
        status: 'planning' as const,
      };

      console.log('📋 Creating simple project with data:', projectRequest);

      // Create the project using the API
      const createdProject = await api.createProject(projectRequest);
      console.log('✅ Project created successfully:', createdProject);

      // Add project immediately to the list if callback is available
      if (addProjectToPage) {
        addProjectToPage(createdProject);
      }

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      
      // Show success message
      Alert.alert('Success', 'Project "Project 1" created successfully!');
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    }
  }, [api, user, navigateTo, addProjectToPage]);

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

      // Add project immediately to the list if on projects page
      // Note: With React Navigation, we'll need to use navigation state or events
      if (addProjectToPage) {
        addProjectToPage(createdProject);
      }

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      
      // Close the creation modal
      setShowProjectCreation(false);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      throw new Error(error.message || 'Failed to create project. Please try again.');
    }
  }, [api, user, navigateTo, addProjectToPage]);

  const handleUpdateProject = useCallback((updatedProject: ProjectDashboardData) => {
    setCurrentProject(updatedProject);
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    console.log('Message sent:', message);
    // In a real app, this would send the message to the backend
  }, []);

  const handleUpdateLegalStatus = useCallback((legalId: string, status: string) => {
    console.log('Legal status updated:', legalId, status);
    // In a real app, this would update the legal status in the backend
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

  const handleRefreshProjects = useCallback(() => {
    console.log('🔄 Refreshing projects list...');
    // The ProjectsPage will handle the actual refresh
  }, []);

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

  const handleMyTeam = useCallback(() => {
    setShowMyTeam(true);
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
    setAuthPage('signup');
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setAuthPage('login');
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

  const handleAddToTeam = useCallback((profile: any) => {
    // Note: Guest checks are handled in ProfileDetailPage, this is called only for authenticated users
    setMyTeam(currentTeam => {
      const isAdded = currentTeam.some(m => m.id === profile.id);
      if (isAdded) {
        return currentTeam.filter(m => m.id !== profile.id);
      } else {
        return [...currentTeam, profile];
      }
    });
  }, []);

  const handleAssignToProject = useCallback((profile: any) => {
    // Note: Guest checks are handled in ProfileDetailPage, this is called only for authenticated users
    // This is now handled by the project selection modal in ProfileDetailPage
    // This function is kept for backward compatibility
    console.log('Assign to project:', profile);
  }, []);

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

    setSearchQuery('');
    
    // Navigate to tab using React Navigation
    navigationRef.current?.navigate(newTab as any);
  }, [isGuest]);

  const handleSplashFinished = () => {
    setShowSplash(false);
    // Defer non-critical API work until after the JS splash finishes
    setAppBootCompleted(true);
  };


  const handleNavigateToForgotPassword = () => {
    setAuthPage('forgot-password');
  };

  const handleNavigateToVerifyOtp = (email: string) => {
    setResetEmail(email);
    setAuthPage('verify-otp');
  };

  const handleNavigateToResetPassword = (token: string) => {
    setResetToken(token);
    setAuthPage('reset-password');
  };

  const handleResendOtp = async () => {
    // Resend OTP by calling forgotPassword again
    if (!resetEmail) {
      console.error('❌ Cannot resend OTP: resetEmail is not set');
      return;
    }
    try {
      console.log('🔄 Resending OTP to:', resetEmail);
      await forgotPassword(resetEmail);
      console.log('✅ OTP resent successfully');
    } catch (error: any) {
      console.error('❌ Failed to resend OTP:', error);
      const errorMessage = error.message || 'Failed to resend verification code. Please try again.';
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const handleLoginSuccess = () => {
    setAuthPage(null);
  };

  const handleGuestMode = () => {
    setAuthPage(null);
  };

  const handleSignupSuccess = (email: string) => {
    console.log('🚀 [App] handleSignupSuccess called with email:', email);
    setSignupEmail(email);
    console.log('🚀 [App] Setting authPage to verify-email-otp');
    setAuthPage('verify-email-otp');
    console.log('✅ [App] Navigation to OTP verification page initiated');
  };

  const handleNavigateToVerifyEmailOtp = (email: string) => {
    setSignupEmail(email);
    setAuthPage('verify-email-otp');
  };

  const handleEmailVerificationSuccess = () => {
    // Navigate to login (success message already shown by VerifyOtpPage)
    setAuthPage('login');
    setSignupEmail('');
  };

  const handleResendVerificationEmail = async () => {
    if (!signupEmail) {
      console.error('❌ Cannot resend verification email: signupEmail is not set');
      return;
    }
    try {
      console.log('🔄 Resending verification email to:', signupEmail);
      await resendVerificationEmail(signupEmail);
      console.log('✅ Verification email resent successfully');
      Alert.alert('Email Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      console.error('❌ Failed to resend verification email:', error);
      const errorMessage = error.message || 'Failed to resend verification email. Please try again.';
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      // Update user profile to mark onboarding as complete
      if (user) {
        await api.updateUserProfile({ profile_step: 'completed' });
      }
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to update profile step:', error);
      // Still hide onboarding even if update fails
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const handleResetSuccess = () => {
    setAuthPage('login');
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      await logout();
      console.log('✅ Logout successful');
      setAuthPage('login');
      setShowOnboarding(false);
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

  // Show auth pages outside React Navigation
  if (authPage === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <LoginPage
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
            onLoginSuccess={handleLoginSuccess}
            onGuestMode={handleGuestMode}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'signup') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <SignupPage
            onNavigateToLogin={handleNavigateToLogin}
            onSignupSuccess={handleSignupSuccess}
            onLoginSuccess={handleLoginSuccess}
            onGuestMode={handleGuestMode}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'forgot-password') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <ForgotPasswordPage
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToVerifyOtp={handleNavigateToVerifyOtp}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'verify-otp') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <VerifyOtpPage
            email={resetEmail}
            mode="password-reset"
            onNavigateToLogin={handleNavigateToLogin}
            onNavigateToResetPassword={handleNavigateToResetPassword}
            onResendOtp={handleResendOtp}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'verify-email-otp') {
    if (!signupEmail) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
            <LoginPage
              onNavigateToSignup={handleNavigateToSignup}
              onNavigateToForgotPassword={handleNavigateToForgotPassword}
              onLoginSuccess={handleLoginSuccess}
              onGuestMode={handleGuestMode}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <VerifyOtpPage
            email={signupEmail}
            mode="email-verification"
            onNavigateToLogin={handleNavigateToLogin}
            onVerificationSuccess={handleEmailVerificationSuccess}
            onResendOtp={handleResendVerificationEmail}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'reset-password') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <ResetPasswordPage
            resetToken={resetToken}
            onNavigateToLogin={handleNavigateToLogin}
            onResetSuccess={handleResetSuccess}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show onboarding outside React Navigation
  const pagesAccessibleDuringOnboarding = ['accountDeletion', 'settings', 'changePassword', 'privacyPolicy', 'support'];
  // Note: We can't check current page name with React Navigation easily here
  // For now, show onboarding if needed (this logic may need adjustment)
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={Platform.OS === 'ios' ? ['top'] : []}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <OnboardingPage
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
          />
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
            <View style={[styles.navigationContainer, shouldShowTabBar && { paddingBottom: tabBarHeight }]}>
              <NavigationContainer 
                ref={navigationRef}
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
                  console.log('✅ Navigation ready, initial route:', initialRoute || 'spot');
                }}
              >
                <NavigationProvider>
                  <AppNavigator />
                  <GlobalModals />
                </NavigationProvider>
              </NavigationContainer>
            </View>
            {shouldShowTabBar ? (
              <TabBar 
                active={currentRoute} 
                onChange={handleTabChange}
                onProfilePress={() => {
                  if (currentProfileType === 'company' && activeCompany?.id) {
                    navigateTo('companyProfile', { companyId: activeCompany.id });
                  } else if (user) {
                    navigateTo('myProfile', user);
                  }
                }}
              />
            ) : null}
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

// Wrapper component to fetch user role and pass to management page
const CompanyMembersManagementWrapper: React.FC<{
  company: any;
  userId: string;
  onBack: () => void;
}> = ({ company, userId, onBack }) => {
  const { getCompanyMembers } = useApi();
  const [userRole, setUserRole] = React.useState<'owner' | 'admin' | 'manager' | 'member'>('member');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await getCompanyMembers(company.id, { page: 1, limit: 100 });
        if (response.success && response.data) {
          const membersArray = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          const userMember = membersArray.find((m: any) => m.user_id === userId);
          if (userMember) {
            setUserRole(userMember.role || 'member');
          } else {
            // Check if user is owner by company.owner.id
            if (company.owner?.id === userId) {
              setUserRole('owner');
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [company.id, userId, getCompanyMembers]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <CompanyMembersManagementPage
      company={company}
      currentUserId={userId}
      currentUserRole={userRole}
      onBack={onBack}
    />
  );
};

// Main App Component with API Provider
const App: React.FC = () => {
  // Initialize warning suppressions once at app startup
  // This ensures warnings from third-party libraries don't clutter the console
  React.useEffect(() => {
    initializeWarningSuppressions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <StreamChatProvider>
            <SafeAreaProvider>
              <AppContent />
            </SafeAreaProvider>
          </StreamChatProvider>
        </ApiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;