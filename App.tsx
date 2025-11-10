import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, useColorScheme, Alert, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Context
import { ApiProvider, useApi } from './src/contexts/ApiContext';

// Components
import TabBar from './src/components/TabBar';
import SearchBar from './src/components/SearchBar';
import SplashScreen from './src/components/SplashScreen';

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
import NewsDetailPage from './src/pages/NewsDetailPage';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import ResetPasswordPage from './src/pages/ResetPasswordPage';
import OnboardingPage from './src/pages/OnboardingPage';
import CompanyRegistrationPage from './src/pages/CompanyRegistrationPage';
import CompanyProfilePage from './src/pages/CompanyProfilePage';
import CoursesManagementPage from './src/pages/CoursesManagementPage';
import CourseEditPage from './src/pages/CourseEditPage';
import CourseDetailPage from './src/pages/CourseDetailPage';
import PublicCoursesPage from './src/pages/PublicCoursesPage';

// Data
import { MOCK_PROFILES, SECTIONS } from './src/data/mockData';
import { NavigationState, User, ProjectCreationData, ProjectDashboardData, Notification } from './src/types';

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout, api, isGuest, createGuestSession, getProjectById, updateProject, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus, unreadNotificationCount, currentProfileType, activeCompany } = useApi();
  const [showSplash, setShowSplash] = useState(true);
  const [history, setHistory] = useState<NavigationState[]>([{ name: 'spot', data: null }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('spot');
  const [myTeam, setMyTeam] = useState([MOCK_PROFILES[0], MOCK_PROFILES[1]]);
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password' | 'onboarding' | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
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
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (systemColorScheme) {
      setTheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  // Handle authentication state changes
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isGuest) {
        setAuthPage('login');
      } else if (isAuthenticated && user?.profile_step === 'onboarding' || user?.profile_completeness === 0) {
        setShowOnboarding(true);
        setAuthPage(null);
      } else {
        setAuthPage(null);
        setShowOnboarding(false);
      }
    }
  }, [isAuthenticated, isLoading, user, isGuest]);

  const page = history[history.length - 1];

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

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  const navigateTo = useCallback((pageName: string, data: any = null) => {
    const newPage = { name: pageName, data };
    setHistory(prevHistory => [...prevHistory, newPage]);
    if (pageName !== 'home') {
      setTab('');
    }
  }, []);

  const handleBack = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length > 1) {
        const newHistory = prevHistory.slice(0, -1);
        const newCurrentPage = newHistory[newHistory.length - 1];
        const tabPages = ['home', 'projects', 'spot'];
        if (tabPages.includes(newCurrentPage.name)) {
          setTab(newCurrentPage.name);
        } else {
          setTab('');
        }
        return newHistory;
      }
      return prevHistory;
    });
  }, []);

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

      // Add project immediately to the list if on projects page
      if (page.name === 'projects' && addProjectToPage) {
        addProjectToPage(createdProject);
      }

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      
      // Close the creation modal
      setShowProjectCreation(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Failed to create project. Please try again.');
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
    // TODO: Navigate to settings page
    console.log('Navigate to Settings');
  }, []);

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

  const handleNavigateToProjectDetail = useCallback(async (projectData: any) => {
    try {
      console.log('📋 Navigating to project dashboard:', projectData.id);
      
      // Fetch the latest project data from the database
      console.log('🔄 Fetching latest project data from database...');
      const latestProjectData = await getProjectById(projectData.id);
      console.log('✅ Latest project data loaded:', latestProjectData);
      
      setSelectedProject(latestProjectData);
      setShowProjectDashboard(true);
    } catch (error) {
      console.error('Failed to load project details:', error);
      // Fallback to the original project data if database fetch fails
      setSelectedProject(projectData);
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
    // Handle assign to project logic
    console.log('Assign to project:', profile);
  }, []);

  const handleStartChat = useCallback((profile: any) => {
    // Note: Guest checks are handled in ProfileDetailPage, this is called only for authenticated users
    navigateTo('chat', profile);
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
  };


  const handleNavigateToForgotPassword = () => {
    setAuthPage('forgot-password');
  };

  const handleNavigateToResetPassword = (email: string) => {
    setResetToken('sample-token'); // In real app, this would come from URL params
    setAuthPage('reset-password');
  };

  const handleLoginSuccess = () => {
    setAuthPage(null);
  };

  const handleGuestMode = () => {
    setAuthPage(null);
  };

  const handleSignupSuccess = () => {
    setShowOnboarding(true);
    setAuthPage(null);
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
      return (
        <View style={[styles.appContainer, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>
              Loading...
            </Text>
          </View>
        </View>
      );
    }

    // Show onboarding for new users
    if (showOnboarding) {
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
          onNavigateToResetPassword={handleNavigateToResetPassword}
        />
      );
    }

    if (authPage === 'reset-password') {
      return (
        <ResetPasswordPage
          token={resetToken}
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
                resizeMode="contain"
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
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="chatbubble" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
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
              user={user || { name: 'Guest' }}
              onOpenMainMenu={() => {}}
            />
          )}
          {page.name === 'spot' && (
            <SpotPage isDark={isDark} onNavigate={navigateTo} />
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
                if (pageName === 'signup') {
                  handleNavigateToSignup();
                } else if (pageName === 'login') {
                  handleNavigateToLogin();
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
                if (pageName === 'signup') {
                  handleNavigateToSignup();
                } else if (pageName === 'login') {
                  handleNavigateToLogin();
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
                user={page.data || user}
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
              companyId={page.data?.companyId || page.data || ''}
              onBack={handleBack}
              refreshTrigger={companyProfileRefreshTrigger}
              onEdit={(company) => {
                // Navigate to company edit page (can be added later)
                console.log('Edit company:', company);
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
                navigateTo('coursesManagement', { companyId: company.id });
              }}
            />
          )}
          {page.name === 'coursesManagement' && (
            <CoursesManagementPage
              companyId={page.data?.companyId || page.data || ''}
              onBack={handleBack}
              onCourseSelect={(course) => {
                navigateTo('courseEdit', {
                  courseId: course.id,
                  companyId: page.data?.companyId || page.data || '',
                });
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
                    navigateTo('projectDetail', { projectId: notification.data.project_id });
                  }
                  break;
                case 'task_assigned':
                case 'task_completed':
                  // Navigate to project/task
                  if (notification.data?.project_id) {
                    navigateTo('projectDetail', { projectId: notification.data.project_id });
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

        <TabBar active={tab} onChange={handleTabChange} />

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
              onBack={() => setShowProjectDashboard(false)}
              onEditProjectDetails={handleEditProjectDetails}
              onRefreshProject={handleRefreshProject}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
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
    marginRight: 4,
  },
  topBarButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  topBarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
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
    marginLeft: 4,
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
    paddingHorizontal: 4,
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
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 12,
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
    <ApiProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ApiProvider>
  );
};

export default App;