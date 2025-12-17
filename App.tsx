import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, useColorScheme, Alert, NativeModules } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { QueryClientProvider } from '@tanstack/react-query';
// Firebase Messaging is now used instead of expo-notifications
// We'll import it dynamically to avoid errors when native modules aren't ready

// Context
import { ApiProvider, useApi } from './src/contexts/ApiContext';
import pushNotificationService from './src/services/PushNotificationService';
import { queryClient } from './src/services/queryClient';

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
import { NavigationState, User, ProjectCreationData, ProjectDashboardData, Notification } from './src/types';
import { spacing, semanticSpacing } from './src/constants/spacing';

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout, api, isGuest, createGuestSession, getProjectById, updateProject, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus, unreadNotificationCount, unreadConversationCount, currentProfileType, activeCompany, forgotPassword, resendVerificationEmail, setAppBootCompleted } = useApi();
  const [showSplash, setShowSplash] = useState(true);
  const [history, setHistory] = useState<NavigationState[]>([{ name: 'spot', data: null }]);
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

  useEffect(() => {
    if (systemColorScheme === 'light' || systemColorScheme === 'dark') {
      setTheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  // Navigation function - defined early so it can be used in useEffect
  const navigateTo = useCallback((pageName: string, data: any = null) => {
    console.log('🧭 Navigating to:', pageName, data);
    const newPage = { name: pageName, data };
    setHistory(prevHistory => {
      const newHistory = [...prevHistory, newPage];
      console.log('📚 History updated. Current page:', newHistory[newHistory.length - 1]?.name);
      return newHistory;
    });
    if (pageName !== 'home') {
      setTab('');
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

  const page = history[history.length - 1];

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  const handleBack = useCallback(() => {
    // Guard against "touch-through" / accidental double-trigger which can pop 2 screens at once
    // (e.g., when the back button stays in the same position after the first pop).
    const now = Date.now();
    if (now - lastBackPressAtRef.current < 400) {
      return;
    }
    lastBackPressAtRef.current = now;

    setHistory(prevHistory => {
      if (prevHistory.length > 1) {
        const currentPage = prevHistory[prevHistory.length - 1];
        const newHistory = prevHistory.slice(0, -1);
        const newCurrentPage = newHistory[newHistory.length - 1];
        const tabPages = ['home', 'projects', 'spot', 'wall'];
        
        // Special handling for 'myProfile': find the last main tab in history
        if (currentPage.name === 'myProfile') {
          // Look backwards through history to find the last main tab
          for (let i = newHistory.length - 1; i >= 0; i--) {
            if (tabPages.includes(newHistory[i].name)) {
              setTab(newHistory[i].name);
              return newHistory;
            }
          }
          // If no main tab found, set to empty
          setTab('');
        } 
        // Special handling for 'companyProfile': ensure we can navigate back to it
        // If going back to companyProfile, make sure the companyId is preserved
        else if (newCurrentPage.name === 'companyProfile') {
          // Ensure companyId is properly set in the page data
          // Handle both object format { companyId: '...' } and string format '...'
          let companyId = null;
          // Preserve any existing page data (e.g., readOnly) when normalizing.
          // This is critical for "public/read-only" company/academy previews that must stay view-only
          // when navigating deeper (e.g., to All Courses) and then coming back.
          const existingData =
            newCurrentPage.data && typeof newCurrentPage.data === 'object'
              ? { ...newCurrentPage.data }
              : {};
          
          if (!newCurrentPage.data) {
            // If no data, use activeCompany as fallback
            companyId = activeCompany?.id;
          } else if (typeof newCurrentPage.data === 'string') {
            // If data is just a string (companyId), use it directly
            companyId = newCurrentPage.data;
          } else if (newCurrentPage.data.companyId) {
            // If data is an object with companyId, use it
            companyId = newCurrentPage.data.companyId;
          } else if (activeCompany?.id) {
            // If data object exists but no companyId, use activeCompany
            companyId = activeCompany.id;
          }
          
          // Normalize the data format to always be an object
          if (companyId) {
            newCurrentPage.data = { ...existingData, companyId };
          } else {
            // If we still don't have a companyId, this is a problem
            // Try to find companyProfile in earlier history entries
            for (let i = newHistory.length - 2; i >= 0; i--) {
              if (newHistory[i].name === 'companyProfile') {
                const prevCompanyId = typeof newHistory[i].data === 'string' 
                  ? newHistory[i].data 
                  : newHistory[i].data?.companyId;
                if (prevCompanyId) {
                  // Preserve any existing flags (e.g. readOnly) while restoring companyId.
                  newCurrentPage.data = { ...existingData, companyId: prevCompanyId };
                  break;
                }
              }
            }
          }
          
          setTab('');
        }
        else if (tabPages.includes(newCurrentPage.name)) {
          setTab(newCurrentPage.name);
        } else {
          setTab('');
        }
        return newHistory;
      }
      return prevHistory;
    });
  }, [activeCompany]);

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
      if (page.name === 'projects' && addProjectToPage) {
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
  }, [api, user, navigateTo, page.name, addProjectToPage]);

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
  useEffect(() => {
    if (page.name === 'profileCompletion' && isGuest) {
      Alert.alert(
        'Sign Up Required',
        'Create an account to complete your profile.',
        [
          { text: 'Cancel', style: 'cancel', onPress: handleBack },
          { text: 'Sign Up', onPress: () => {
            handleBack();
            handleNavigateToSignup();
          }},
          { text: 'Sign In', onPress: () => {
            handleBack();
            handleNavigateToLogin();
          }},
        ]
      );
    }
  }, [page.name, isGuest, handleBack, handleNavigateToSignup, handleNavigateToLogin]);

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
  const handleCreateTask = useCallback(async (taskData: any) => {
    try {
      const currentProject = page.data;
      if (currentProject) {
        const createdTask = await createTask(currentProject.id, taskData);
        // Refresh project data
        const updatedProject = await getProjectById(currentProject.id);
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { name: 'projectDetail', data: updatedProject };
          return newHistory;
        });
        return createdTask; // Return the created task
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }, [createTask, getProjectById, page.data]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      await updateTask(taskId, updates);
      // Refresh project data
      const currentProject = page.data;
      if (currentProject) {
        const updatedProject = await getProjectById(currentProject.id);
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { name: 'projectDetail', data: updatedProject };
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }, [updateTask, getProjectById, page.data]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      // Refresh project data
      const currentProject = page.data;
      if (currentProject) {
        const updatedProject = await getProjectById(currentProject.id);
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { name: 'projectDetail', data: updatedProject };
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, [deleteTask, getProjectById, page.data]);

  const handleAssignTask = useCallback(async (projectId: string, taskId: string, assignment: any) => {
    try {
      await assignTaskService(projectId, taskId, assignment);
      // Refresh project data
      const currentProject = page.data;
      if (currentProject) {
        const updatedProject = await getProjectById(currentProject.id);
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { name: 'projectDetail', data: updatedProject };
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
      throw error;
    }
  }, [assignTaskService, getProjectById, page.data]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, status: any) => {
    try {
      await updateTaskStatus(taskId, status);
      // Refresh project data
      const currentProject = page.data;
      if (currentProject) {
        const updatedProject = await getProjectById(currentProject.id);
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = { name: 'projectDetail', data: updatedProject };
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  }, [updateTaskStatus, getProjectById, page.data]);

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    setSearchQuery('');
    
    const rootPage = { name: newTab, data: null };
    setHistory([rootPage]);
  }, []);

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

  const renderContent = () => {
    if (showSplash) {
      return <SplashScreen onFinished={handleSplashFinished} />;
    }

    // Show loading state while API is initializing
    if (isLoading) {
      return <SkeletonScreen showHeader={true} contentCount={5} isDark={isDark} />;
    }

    // Get current page from history (use latest value)
    const currentPage = history[history.length - 1];

    // Allow access to important pages even during onboarding
    // These pages should be accessible regardless of onboarding status
    const pagesAccessibleDuringOnboarding = ['accountDeletion', 'settings', 'changePassword', 'privacyPolicy', 'support'];
    const isAccessiblePage = currentPage && pagesAccessibleDuringOnboarding.includes(currentPage.name);

    // Show onboarding for new users (unless accessing an important page)
    if (showOnboarding && !isAccessiblePage) {
      return (
        <OnboardingPage
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      );
    }

    // Show authentication pages
    if (authPage === 'login') {
      return (
        <LoginPage
          onNavigateToSignup={handleNavigateToSignup}
          onNavigateToForgotPassword={handleNavigateToForgotPassword}
          onLoginSuccess={handleLoginSuccess}
          onGuestMode={handleGuestMode}
        />
      );
    }

    if (authPage === 'signup') {
      return (
        <SignupPage
          onNavigateToLogin={handleNavigateToLogin}
          onSignupSuccess={handleSignupSuccess}
        />
      );
    }

    if (authPage === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onNavigateToLogin={handleNavigateToLogin}
          onNavigateToVerifyOtp={handleNavigateToVerifyOtp}
        />
      );
    }

    if (authPage === 'verify-otp') {
      return (
        <VerifyOtpPage
          email={resetEmail}
          mode="password-reset"
          onNavigateToLogin={handleNavigateToLogin}
          onNavigateToResetPassword={handleNavigateToResetPassword}
          onResendOtp={handleResendOtp}
        />
      );
    }

    if (authPage === 'verify-email-otp') {
      console.log('📱 [App] Rendering VerifyOtpPage with email:', signupEmail);
      if (!signupEmail) {
        console.error('❌ [App] signupEmail is empty! Cannot render VerifyOtpPage');
        // Fallback: show login page if email is missing
        return (
          <LoginPage
            onNavigateToSignup={handleNavigateToSignup}
            onNavigateToForgotPassword={handleNavigateToForgotPassword}
            onLoginSuccess={handleLoginSuccess}
            onGuestMode={handleGuestMode}
          />
        );
      }
      return (
        <VerifyOtpPage
          email={signupEmail}
          mode="email-verification"
          onNavigateToLogin={handleNavigateToLogin}
          onVerificationSuccess={handleEmailVerificationSuccess}
          onResendOtp={handleResendVerificationEmail}
        />
      );
    }

    if (authPage === 'reset-password') {
      return (
        <ResetPasswordPage
          resetToken={resetToken}
          onNavigateToLogin={handleNavigateToLogin}
          onResetSuccess={handleResetSuccess}
        />
      );
    }

    // Show main app for authenticated users
    return (
      <View style={[styles.appContainer, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
        <View style={[styles.topBar, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity style={styles.topBarButton} onPress={handleUserMenuPress}>
              <Image 
                source={require('./assets/Logo_alpha.png')} 
                style={{ width: 20, height: 20 }}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.topBarTitleContainer}
              onPress={() => {
                if (isAuthenticated && !isGuest) {
                  setShowAccountSwitcher(true);
                }
              }}
              disabled={isGuest || !isAuthenticated}
            >
              <Text style={styles.topBarTitle}>
                <Text style={styles.userName}>
                  {currentProfileType === 'company' && activeCompany
                    ? activeCompany.name
                    : isGuest ? 'Guest User' : (user?.name || 'Guest')
                  }
                </Text>
              </Text>
              {isAuthenticated && !isGuest && (
                <Ionicons 
                  name="chevron-down" 
                  size={16} 
                  color={isDark ? '#9ca3af' : '#71717a'} 
                  style={styles.chevronIcon}
                />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => navigateTo('conversations', null)}
            >
              <Ionicons name="chatbubble" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
              {unreadConversationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadConversationCount > 99 ? '99+' : unreadConversationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.topBarButton}
              onPress={() => setShowNotificationModal(true)}
            >
              <Ionicons name="notifications" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {page.name === 'home' && (
            <HomePageWithUsers
              onServiceSelect={handleServiceSelect}
              onOpenFilter={() => {}}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleTheme={toggleTheme}
              theme={theme}
              onNavigate={navigateTo}
              user={user}
              onOpenMainMenu={() => {}}
            />
          )}
          {page.name === 'spot' && (
            <SpotPage isDark={isDark} onNavigate={navigateTo} />
          )}
          {page.name === 'wall' && (
            <AgendaPage
              onBack={handleBack}
              onProfileSelect={handleProfileSelect}
              onNavigate={navigateTo}
              myTeam={myTeam}
            />
          )}
          {page.name === 'newsDetail' && (
            <NewsDetailPage
              slug={page.data?.slug}
              post={page.data?.post}
              onBack={handleBack}
              isDark={isDark}
            />
          )}
          {page.name === 'sectionServices' && (
            <DirectoryPage
              section={page.data}
              onBack={handleBack}
              onUserSelect={handleProfileSelect}
              onNavigate={navigateTo}
            />
          )}
          {page.name === 'details' && (
            <ServiceDetailPage
              service={page.data}
              onBack={handleBack}
              onProfileSelect={handleProfileSelect}
              onAddToTeam={handleAddToTeam}
              onAssignToProject={handleAssignToProject}
              onStartChat={handleStartChat}
              myTeam={myTeam}
            />
          )}
          {page.name === 'academyDetail' && (
            <CompanyProfilePage
              companyId={page.data?.id || page.data?.companyId || page.data || ''}
              onBack={handleBack}
              readOnly={true}
              onCourseSelect={(course) => {
                navigateTo('courseDetail', {
                  courseId: course.id,
                  companyId: course.company_id,
                });
              }}
              onNavigate={(pageName: string, data?: any) => {
                if (pageName === 'auth') {
                  setAuthPage(data?.page || 'login');
                } else {
                  navigateTo(pageName, data);
                }
              }}
            />
          )}
          {page.name === 'projects' && (
            <ProjectsPage
              onProjectSelect={handleProjectSelect}
              onAddNewProject={handleCreateProjectDirect}
              onAddNewProjectEasy={handleAddNewProjectEasy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onBack={handleBack}
              myTeam={myTeam}
              onProfileSelect={handleProfileSelect}
              onNavigateToProjectDetail={handleNavigateToProjectDetail}
              onRefresh={handleRefreshProjects}
              onNavigateToSignup={handleNavigateToSignup}
              onNavigateToLogin={handleNavigateToLogin}
              onProjectCreated={(addFn: (project: any) => void) => {
                setAddProjectToPage(() => addFn);
              }}
            />
          )}
          {page.name === 'profile' && (
            <ProfileDetailPage
              profile={page.data}
              onBack={handleBack}
              onAssignToProject={handleAssignToProject}
              onAddToTeam={handleAddToTeam}
              myTeam={myTeam}
              onStartChat={handleStartChat}
              onMediaSelect={() => {}}
              onNavigate={(pageName: string, data?: any) => {
                console.log('🧭 onNavigate called:', pageName, data);
                if (pageName === 'signup') {
                  handleNavigateToSignup();
                } else if (pageName === 'login') {
                  handleNavigateToLogin();
                } else if (pageName === 'projectDetail') {
                  // Handle project detail navigation with special data
                  console.log('📁 Navigating to projectDetail with data:', data);
                  handleNavigateToProjectDetail(data);
                } else {
                  navigateTo(pageName, data);
                }
              }}
            />
          )}
          {page.name === 'projectDetail' && (
            <ProjectDetailPage
              project={page.data}
              onBack={handleBack}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAssignTask={handleAssignTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          )}
          {page.name === 'newProject' && (
            <NewProjectPage
              onBack={handleBack}
              onProjectCreated={handleProjectCreated}
            />
          )}
          {page.name === 'myProfile' && (
            <ProfileDetailPage
              profile={user || { id: '', name: 'Guest' }}
              onBack={handleBack}
              onAssignToProject={handleAssignToProject}
              onAddToTeam={handleAddToTeam}
              myTeam={myTeam}
              onStartChat={handleStartChat}
              onMediaSelect={() => {}}
              isCurrentUser={true}
              onLogout={handleLogout}
              onNavigate={(pageName: string, data?: any) => {
                console.log('🧭 onNavigate called:', pageName, data);
                if (pageName === 'signup') {
                  handleNavigateToSignup();
                } else if (pageName === 'login') {
                  handleNavigateToLogin();
                } else if (pageName === 'projectDetail') {
                  // Handle project detail navigation with special data
                  console.log('📁 Navigating to projectDetail with data:', data);
                  handleNavigateToProjectDetail(data);
                } else {
                  navigateTo(pageName, data);
                }
              }}
            />
          )}
          {page.name === 'profileCompletion' && (
            isGuest ? (
              // Guest protection - this should not render but if it does, navigate back
              null
            ) : (
              <ProfileCompletionPage
                navigation={{ goBack: handleBack }}
                user={page.data && page.data.initialSection ? { ...page.data, initialSection: undefined } : (page.data || user)}
                initialSection={page.data?.initialSection}
                onProfileUpdated={() => {
                  // Refresh user data or navigate back
                  handleBack();
                }}
              />
            )
          )}
          {page.name === 'companyRegistration' && (
            <CompanyRegistrationPage
              onBack={handleBack}
              onSuccess={handleCompanyRegistrationSuccess}
              onNavigateToProfile={() => navigateTo('profileCompletion', user)}
            />
          )}
          {page.name === 'companyProfile' && (
            <CompanyProfilePage
              companyId={page.data?.companyId || page.data || activeCompany?.id || ''}
              onBack={handleBack}
              refreshTrigger={companyProfileRefreshTrigger}
              readOnly={page.data?.readOnly === true}
              onEdit={(company) => {
                navigateTo('companyEdit', { company });
              }}
              onManageMembers={(company) => {
                // Navigate to manage members (can be added later)
                console.log('Manage members:', company);
              }}
              onManageServices={(company) => {
                setSelectedCompanyForServices(company);
                setShowCompanyServicesModal(true);
              }}
              onInviteMember={(company) => {
                setSelectedCompanyForInvitation(company);
                setShowInvitationModal(true);
              }}
              onManageCourses={(company) => {
                // Pass readOnly flag from company profile page
                const isReadOnly = page.data?.readOnly === true;
                navigateTo('coursesManagement', { companyId: company.id, readOnly: isReadOnly });
              }}
              onCourseSelect={(course) => {
                navigateTo('courseDetail', {
                  courseId: course.id,
                  companyId: course.company_id,
                });
              }}
              onNavigate={(pageName: string, data?: any) => {
                if (pageName === 'auth') {
                  setAuthPage(data?.page || 'login');
                } else {
                  navigateTo(pageName, data);
                }
              }}
            />
          )}
          {page.name === 'companyEdit' && page.data?.company && (
            <CompanyEditPage
              company={page.data.company}
              onBack={handleBack}
              onCompanyUpdated={() => {
                // Refresh company profile page
                setCompanyProfileRefreshTrigger((prev) => prev + 1);
                handleBack();
              }}
            />
          )}
          {page.name === 'coursesManagement' && (
            <CoursesManagementPage
              companyId={page.data?.companyId || page.data || ''}
              onBack={handleBack}
              readOnly={page.data?.readOnly === true}
              onCourseSelect={(course) => {
                // In read-only mode, navigate to course detail instead of edit
                if (page.data?.readOnly === true) {
                  navigateTo('courseDetail', {
                    courseId: course.id,
                    companyId: course.company_id || page.data?.companyId || page.data || '',
                  });
                } else {
                  navigateTo('courseEdit', {
                    courseId: course.id,
                    companyId: page.data?.companyId || page.data || '',
                  });
                }
              }}
            />
          )}
          {page.name === 'courseEdit' && (
            <CourseEditPage
              courseId={page.data?.courseId || ''}
              companyId={page.data?.companyId || ''}
              onBack={handleBack}
              onCourseUpdated={() => {
                // Refresh courses management page if needed
                handleBack();
              }}
            />
          )}
          {page.name === 'courseDetail' && (
            <CourseDetailPage
              courseId={page.data?.courseId || ''}
              companyId={page.data?.companyId}
              onBack={handleBack}
              onNavigate={navigateTo}
              onRegister={() => {
                // Refresh course detail or navigate back
                handleBack();
              }}
              onUnregister={() => {
                // Refresh course detail or navigate back
                handleBack();
              }}
            />
          )}
          {page.name === 'publicCourses' && (
            <PublicCoursesPage
              onBack={handleBack}
              onCourseSelect={(course) => {
                navigateTo('courseDetail', {
                  courseId: course.id,
                  companyId: course.company_id,
                });
              }}
              filters={page.data?.filters}
            />
          )}
          {page.name === 'conversations' && (
            <ConversationsListPage
              onBack={handleBack}
              onConversationSelect={(conversation) => {
                navigateTo('chat', { conversationId: conversation.id });
              }}
            />
          )}
          {page.name === 'chat' && (
            <ChatPage
              conversationId={page.data?.conversationId}
              participant={page.data?.participant}
              courseData={page.data?.courseData}
              onBack={handleBack}
            />
          )}
          {page.name === 'settings' && (
            <SettingsPage
              onBack={handleBack}
              onNavigate={navigateTo}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
          {page.name === 'changePassword' && (
            <ChangePasswordPage
              onBack={handleBack}
              theme={theme}
            />
          )}
          {page.name === 'accountDeletion' && (
            <AccountDeletionPage
              onBack={handleBack}
              theme={theme}
            />
          )}
          {page.name === 'privacyPolicy' && (
            <PrivacyPolicyPage
              onBack={handleBack}
              theme={theme}
            />
          )}
          {page.name === 'support' && (
            <SupportPage
              onBack={handleBack}
              theme={theme}
            />
          )}
          {page.name === 'performanceTest' && (
            <PerformanceTestPage
              onBack={handleBack}
            />
          )}
          {page.name === 'allAgenda' && (
            <AllAgendaPage
              onBack={handleBack}
              onNavigate={navigateTo}
              agenda={undefined} // Will use AsyncStorage internally
              onProfileSelect={handleProfileSelect}
            />
          )}
          {page.name === 'sPage' && (
            <WeeklySchedulePage
              onBack={handleBack}
              onNavigate={navigateTo}
            />
          )}
          {page.name === 'bookingRequests' && (
            <BookingRequestsPage
              onBack={handleBack}
              onNavigate={navigateTo}
              projects={[]} // Will be populated from API
              requests={undefined} // Will use AsyncStorage internally
              onRespond={(requestId, status) => {
                // Handle booking request response
                // TODO: Implement API call to respond to booking request
              }}
            />
          )}
        </View>

        {/* Project Creation Modal */}
        <ProjectCreationModal
          visible={showProjectCreation}
          onClose={() => setShowProjectCreation(false)}
          onSubmit={handleCreateProject}
        />

        {/* User Menu Modal */}
        <UserMenuModal
          visible={showUserMenu}
          onClose={() => setShowUserMenu(false)}
          onMyTeam={handleMyTeam}
          onSettings={handleSettings}
          onProfileEdit={handleProfileEdit}
          onHelpSupport={handleHelpSupport}
          onLogout={handleLogout}
          onCreateCompany={isAuthenticated ? handleCreateCompany : undefined}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* My Team Modal */}
        <MyTeamModal
          visible={showMyTeam}
          onClose={() => setShowMyTeam(false)}
        />

        {/* Invitation Modal */}
        {selectedCompanyForInvitation && (
          <InvitationModal
            visible={showInvitationModal}
            onClose={() => {
              setShowInvitationModal(false);
              setSelectedCompanyForInvitation(null);
            }}
            company={selectedCompanyForInvitation}
            onInvitationSent={() => {
              setCompanyProfileRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

        {/* Invitation List Modal */}
        {user && (
          <InvitationListModal
            visible={showInvitationListModal}
            onClose={() => setShowInvitationListModal(false)}
            userId={user.id}
            onInvitationResponded={() => {
              // Refresh notifications and company profile if needed
              setCompanyProfileRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

        {/* Account Switcher Modal */}
        <AccountSwitcherModal
          visible={showAccountSwitcher}
          onClose={() => setShowAccountSwitcher(false)}
          onCreateCompany={isAuthenticated ? handleCreateCompany : undefined}
          onNavigate={(pageName: string, data?: any) => {
            if (pageName === 'signup') {
              handleNavigateToSignup();
            } else if (pageName === 'login') {
              handleNavigateToLogin();
            } else {
              navigateTo(pageName, data);
            }
          }}
        />

        {/* Notification Modal */}
        <NotificationModal
          visible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onNotificationPress={(notification: Notification) => {
            // Handle invitation notifications
            if (notification.type === 'company_invitation' && user) {
              setShowNotificationModal(false);
              setShowInvitationListModal(true);
              return;
            }
            // Handle navigation based on notification type
            if (notification.link_url) {
              // If notification has a link, navigate to it
              console.log('Navigate to:', notification.link_url);
            } else {
              // Handle different notification types
              switch (notification.type) {
                case 'company_invitation':
                case 'company_invitation_accepted':
                case 'company_invitation_rejected':
                  // Navigate to company profile or invitations page
                  if (notification.data?.company_id) {
                    navigateTo('companyProfile', { companyId: notification.data.company_id });
                  }
                  break;
                case 'project_created':
                case 'project_member_added':
                  // Navigate to project
                  if (notification.data?.project_id) {
                    (async () => {
                      try {
                        const projectId = notification.data?.project_id;
                        if (projectId) {
                          const project = await getProjectById(projectId);
                          if (project) {
                            navigateTo('projectDetail', project);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to fetch project for navigation:', error);
                      }
                    })();
                  }
                  break;
                case 'task_assigned':
                case 'task_completed':
                  // Navigate to project/task
                  if (notification.data?.project_id) {
                    (async () => {
                      try {
                        const projectId = notification.data?.project_id;
                        if (projectId) {
                          const project = await getProjectById(projectId);
                          if (project) {
                            navigateTo('projectDetail', project);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to fetch project for navigation:', error);
                      }
                    })();
                  }
                  break;
                case 'certification_issued':
                  // Navigate to profile
                  if (notification.data?.user_id) {
                    navigateTo('profileDetail', { userId: notification.data.user_id });
                  }
                  break;
                default:
                  console.log('Notification type:', notification.type);
              }
            }
            setShowNotificationModal(false);
          }}
        />

        {/* Company Services Modal */}
        {selectedCompanyForServices && (
          <CompanyServicesModal
            visible={showCompanyServicesModal}
            company={selectedCompanyForServices}
            onClose={() => {
              setShowCompanyServicesModal(false);
              setSelectedCompanyForServices(null);
            }}
            onServicesUpdated={() => {
              // Trigger refresh of company profile page
              console.log('🔄 Services updated, refreshing company profile...');
              setCompanyProfileRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

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

        {history.length > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Full-page Project Dashboard */}
        {showProjectDashboard && selectedProject && (
          <View style={styles.fullPageOverlay}>
            <ProjectDashboard
              project={selectedProject}
              onBack={() => {
                setShowProjectDashboard(false);
                setSelectedProject(null);
              }}
              onEditProjectDetails={handleEditProjectDetails}
              onRefreshProject={handleRefreshProject}
              selectedUser={selectedProject.selectedUser}
              addUserToTask={selectedProject.addUserToTask}
            />
          </View>
        )}

        {/* Project Details Modal */}
        <ProjectDetailsModal
          visible={showProjectDetails}
          onClose={() => setShowProjectDetails(false)}
          project={selectedProject}
          onSave={handleSaveProjectDetails}
        />

        {/* Screenshot Helper - Only visible in development mode */}
        {__DEV__ && (
          <ScreenshotHelper onNavigate={navigateTo} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]} edges={['top'] as any}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#fff'} />
        {renderContent()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
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
});

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