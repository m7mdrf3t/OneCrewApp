import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, useColorScheme, Alert, NativeModules, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { QueryClientProvider } from '@tanstack/react-query';
// Firebase Messaging is now used instead of expo-notifications
// We'll import it dynamically to avoid errors when native modules aren't ready

// Context
import { ApiProvider, useApi } from './src/contexts/ApiContext';
import { GlobalModalsProvider } from './src/contexts/GlobalModalsContext';
import pushNotificationService from './src/services/PushNotificationService';
import { queryClient } from './src/services/queryClient';

// Navigation
import { AppNavigator } from './src/navigation/AppNavigator';
import { NavigationProvider, navigationRef } from './src/navigation/NavigationContext';
import { RootStackParamList } from './src/navigation/types';

// Components
import TabBar from './src/components/TabBar';
import SearchBar from './src/components/SearchBar';
import SplashScreen from './src/components/SplashScreen';
import SkeletonScreen from './src/components/SkeletonScreen';

// Pages
import HomePage from './src/pages/HomePage';
import HomePageWithUsers from './src/pages/HomePageWithUsers';
import CompanyServicesModal from './src/components/CompanyServicesModal';
import SectionServicesPage from './src/pages/SectionServicesPage';
import DirectoryPage from './src/pages/DirectoryPage';
import ServiceDetailPage from './src/pages/ServiceDetailPage';
import ProjectsPage from './src/pages/ProjectsPage';
import ProjectDetailPage from './src/pages/ProjectDetailPage';
import NewProjectPage from './src/pages/NewProjectPage';
import ProjectCreationModal from './src/components/ProjectCreationModal';
import ProjectDashboard from './src/components/ProjectDashboard';
import ProjectDetailsModal from './src/components/ProjectDetailsModal';
import CommunicationComponent from './src/components/CommunicationComponent';
import LegalTracker from './src/components/LegalTracker';
import UserMenuModal from './src/components/UserMenuModal';
import MyTeamModal from './src/components/MyTeamModal';
import NotificationModal from './src/components/NotificationModal';
import InvitationModal from './src/components/InvitationModal';
import InvitationListModal from './src/components/InvitationListModal';
import AccountSwitcherModal from './src/components/AccountSwitcherModal';
import GlobalModals from './src/components/GlobalModals';
import ProfileDetailPage from './src/pages/ProfileDetailPage';
import ProfileCompletionPage from './src/pages/ProfileCompletionPage';
import SpotPage from './src/pages/SpotPage';
import ConversationsListPage from './src/pages/ConversationsListPage';
import ChatPage from './src/pages/ChatPage';
import NewsDetailPage from './src/pages/NewsDetailPage';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import ResetPasswordPage from './src/pages/ResetPasswordPage';
import VerifyOtpPage from './src/pages/VerifyOtpPage';
import OnboardingPage from './src/pages/OnboardingPage';
import CompanyRegistrationPage from './src/pages/CompanyRegistrationPage';
import CompanyProfilePage from './src/pages/CompanyProfilePage';
import CompanyEditPage from './src/pages/CompanyEditPage';
import CoursesManagementPage from './src/pages/CoursesManagementPage';
import CourseEditPage from './src/pages/CourseEditPage';
import CourseDetailPage from './src/pages/CourseDetailPage';
import CompanyMembersManagementPage from './src/pages/CompanyMembersManagementPage';
import PublicCoursesPage from './src/pages/PublicCoursesPage';
import SettingsPage from './src/pages/SettingsPage';
import ChangePasswordPage from './src/pages/ChangePasswordPage';
import AccountDeletionPage from './src/pages/AccountDeletionPage';
import PrivacyPolicyPage from './src/pages/PrivacyPolicyPage';
import SupportPage from './src/pages/SupportPage';
import ScreenshotHelper from './src/components/ScreenshotHelper';
import AgendaPage from './src/pages/AgendaPage';
import AllAgendaPage from './src/pages/AllAgendaPage';
import BookingRequestsPage from './src/pages/BookingRequestsPage';
import WeeklySchedulePage from './src/pages/WeeklySchedulePage';
import PerformanceTestPage from './src/pages/PerformanceTestPage';

// Data
import { MOCK_PROFILES, SECTIONS } from './src/data/mockData';
import { User, ProjectCreationData, ProjectDashboardData, Notification } from './src/types';
import { spacing, semanticSpacing } from './src/constants/spacing';

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout, api, isGuest, createGuestSession, getProjectById, updateProject, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus, unreadNotificationCount, unreadConversationCount, currentProfileType, activeCompany, forgotPassword, resendVerificationEmail, setAppBootCompleted, getCompanyMembers } = useApi();
  const [showSplash, setShowSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('spot');
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
  const mainTabRoutes = ['home', 'projects', 'spot', 'wall'];
  const shouldShowTabBar = mainTabRoutes.includes(currentRoute);

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

    const routeName = routeMap[pageName] as keyof RootStackParamList;
    if (routeName && navigationRef.current) {
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
        } else if (pageName === 'newsDetail') {
          params = { slug: data?.slug || data, post: data?.post || data };
        } else {
          params = data;
        }
      }
      
      navigationRef.current.navigate(routeName, params as any);
      if (pageName !== 'home') {
        setTab('');
      }
    } else {
      console.warn(`Unknown route or navigation not ready: ${pageName}`);
    }
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
    } else if (data.link_url) {
      // Handle custom link URLs
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

  useEffect(() => {
    // Delay notification setup to ensure Firebase native modules are ready
    // Reduced delay since initialization is now more reliable
    const setupNotifications = async () => {
      // Wait for React Native bridge and native modules to initialize
      // Reduced from 3s to 2s since Firebase initialization is improved
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Initialize push notifications first
      try {
        await pushNotificationService.initialize();
        
        // Set up notification received listener (when app is in foreground)
        // No delay needed - service is ready
        notificationUnsubscribe.current = pushNotificationService.addNotificationReceivedListener(
          (notification) => {
            // Firebase automatically displays notifications, but we can handle custom logic here
            // The notification data is available in notification.data
          }
        );
      } catch (error) {
        console.error('❌ [App] Failed to initialize push notifications:', error);
        // Retry once after a delay
        console.log('🔄 [App] Scheduling retry in 3 seconds...');
        setTimeout(async () => {
          try {
            console.log('🔄 [App] Retrying push notification initialization...');
            await pushNotificationService.initialize();
            notificationUnsubscribe.current = pushNotificationService.addNotificationReceivedListener(
              (notification) => {
                console.log('📨 [App] Notification received in foreground:', notification);
              }
            );
            console.log('✅ [App] Retry successful');
          } catch (retryError) {
            console.error('❌ [App] Retry failed to initialize push notifications:', retryError);
          }
        }, 3000); // Reduced from 5s to 3s
      }
    };

    setupNotifications();

    // Handle notification that opened the app (if app was closed)
    console.log('📱 [App] Checking for initial notification...');
    pushNotificationService.getInitialNotification().then((response) => {
      if (response) {
        console.log('📱 [App] App opened from notification:', response);
        const data = response.notification.request.content.data;
        console.log('📱 [App] Initial notification data:', data);
        
        // Handle navigation based on notification data
        if (data) {
          // Small delay to ensure app is fully loaded
          console.log('📱 [App] Navigating based on notification data...');
          setTimeout(() => {
            handleNotificationNavigation(data);
          }, 1000);
        } else {
          console.warn('⚠️ [App] Initial notification has no data');
        }
      } else {
        console.log('📱 [App] No initial notification found');
      }
    }).catch((error) => {
      console.error('❌ [App] Error getting initial notification:', error);
    });

    // Set up listener for notification taps when app is in background/foreground
    // Firebase handles this via messaging().onNotificationOpenedApp
    // We delay this significantly to ensure native modules are ready
    let unsubscribeOnNotificationOpened: (() => void) | null = null;
    
    // Delay to ensure native modules are fully initialized
    // Reduced from 5s to 3s since initialization is improved
    console.log('📱 [App] Scheduling notification opened listener setup in 3 seconds...');
    const setupNotificationListener = setTimeout(() => {
      try {
        console.log('📱 [App] Setting up notification opened listener...');
        // In Expo dev builds, NativeModules might be empty until bridge is ready
        // Just try to require the module and handle errors gracefully
        const messagingModule = require('@react-native-firebase/messaging');
        if (messagingModule) {
          console.log('✅ [App] Messaging module loaded');
          const messaging = messagingModule.default || messagingModule;
          if (messaging && typeof messaging === 'function') {
            console.log('📱 [App] Registering onNotificationOpenedApp listener...');
            unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage: any) => {
              console.log('👆 [App] Notification tapped (app in background):', remoteMessage);
              console.log('👆 [App] Notification title:', remoteMessage.notification?.title);
              console.log('👆 [App] Notification body:', remoteMessage.notification?.body);
              console.log('👆 [App] Notification data:', remoteMessage.data);
              const data = remoteMessage.data || {};
              handleNotificationNavigation(data);
            });
            console.log('✅ [App] Notification opened listener registered');
          } else {
            console.error('❌ [App] Messaging is not a function. Type:', typeof messaging);
          }
        } else {
          console.error('❌ [App] Messaging module is null or undefined');
        }
      } catch (error: any) {
        // If error is about NativeEventEmitter, native modules aren't ready
        // Log for debugging but don't fail
        if (error?.message?.includes('NativeEventEmitter') || 
            error?.message?.includes('non-null') ||
            error?.message?.includes('requires a non-null') ||
            error?.message?.includes('Cannot read property')) {
          console.warn('⚠️ [App] Native modules not ready (NativeEventEmitter error)');
        } else {
          console.error('❌ [App] Could not set up Firebase notification opened listener:', error?.message || error);
          if (error?.stack) {
            console.error('❌ [App] Stack trace:', error.stack.substring(0, 300));
          }
        }
      }
    }, 3000); // Delay 3 seconds to let native modules fully initialize

    return () => {
      clearTimeout(setupNotificationListener);
      if (notificationUnsubscribe.current) {
        pushNotificationService.removeNotificationSubscription(notificationUnsubscribe.current);
      }
      if (unsubscribeOnNotificationOpened) {
        unsubscribeOnNotificationOpened();
      }
    };
  }, [user, getProjectById, navigateTo, handleNotificationNavigation]);

  useEffect(() => {
    const logToken = async () => {
      try {
        // First, check if stored token is an Expo token (old)
        const storedToken = await pushNotificationService.getStoredToken();
        if (storedToken && storedToken.startsWith('ExponentPushToken')) {
          console.log('⚠️ Found old Expo token, clearing it...');
          await pushNotificationService.clearToken();
        }
        
        // Wait a bit for Firebase to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Use PushNotificationService to get FCM token (it handles all the complexity)
        const fcmToken = await pushNotificationService.registerForPushNotifications();
      } catch (error: any) {
        console.error('❌ Error getting FCM token:', error?.message || error);
        if (error?.stack) {
          console.error('Stack:', error.stack.substring(0, 500));
        }
      }
    };
    setTimeout(logToken, 5000);
  }, []);

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

  // Check for 5 minutes elapsed
  useEffect(() => {
    if (isGuest && guestSessionStartTime && !guestPromptShownRef.current) {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - guestSessionStartTime;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        if (elapsed >= fiveMinutes) {
          setShowGuestPrompt(true);
          guestPromptShownRef.current = true;
          clearInterval(checkInterval);
        }
      }, 1000); // Check every second

      return () => clearInterval(checkInterval);
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

    // Show prompt for guest users accessing projects or wall (Agenda) pages
    if (isGuest && (newTab === 'projects' || newTab === 'wall') && !guestPromptShownRef.current) {
      setShowGuestPrompt(true);
      guestPromptShownRef.current = true;
      pendingTabChangeRef.current = newTab; // Store the tab they wanted to navigate to
      return; // Don't navigate yet, wait for user response
    }

    setTab(newTab);
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <SplashScreen onFinished={handleSplashFinished} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
          <SignupPage
            onNavigateToLogin={handleNavigateToLogin}
            onSignupSuccess={handleSignupSuccess}
            onLoginSuccess={handleLoginSuccess}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authPage === 'forgot-password') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
          <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
        <View style={styles.appWrapper}>
          <View style={styles.navigationContainer}>
            <NavigationContainer 
              ref={navigationRef}
              onStateChange={(state) => {
                if (state) {
                  const route = state.routes[state.index];
                  if (route?.name) {
                    setCurrentRoute(route.name);
                    // Update tab if it's a main tab route
                    if (mainTabRoutes.includes(route.name)) {
                      setTab(route.name);
                    }
                  }
                }
              }}
            >
              <GlobalModalsProvider>
                <NavigationProvider>
                  <AppNavigator />
                  <GlobalModals />
                </NavigationProvider>
              </GlobalModalsProvider>
            </NavigationContainer>
          </View>
          {shouldShowTabBar && (
            <TabBar 
              active={tab} 
              onChange={handleTabChange}
              onProfilePress={() => {
                if (currentProfileType === 'company' && activeCompany?.id) {
                  navigateTo('companyProfile', { companyId: activeCompany.id });
                } else if (user) {
                  navigateTo('myProfile', user);
                }
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  appWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  navigationContainer: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
    paddingTop: semanticSpacing.containerPadding,
    minHeight: 56,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  topBarButton: {
    padding: semanticSpacing.tightPadding,
    marginLeft: spacing.xs,
    position: 'relative',
  },
  topBarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: semanticSpacing.containerPadding,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  userName: {
    fontWeight: '400',
  },
  chevronIcon: {
    marginLeft: spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    bottom: 88,
    left: semanticSpacing.sectionGapLarge,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: semanticSpacing.buttonPadding,
    zIndex: 20,
  },
  fullPageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  guestPromptModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  guestPromptTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestPromptMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  guestPromptButtons: {
    width: '100%',
    gap: 12,
  },
  guestPromptButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPromptButtonPrimary: {
    backgroundColor: '#000',
  },
  guestPromptButtonSecondary: {
    borderWidth: 1,
  },
  guestPromptButtonTertiary: {
    backgroundColor: 'transparent',
  },
  guestPromptButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </ApiProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;