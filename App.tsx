import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, useColorScheme, Alert } from 'react-native';
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
import ProfileDetailPage from './src/pages/ProfileDetailPage';
import SpotPage from './src/pages/SpotPage';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import ResetPasswordPage from './src/pages/ResetPasswordPage';
import OnboardingPage from './src/pages/OnboardingPage';

// Data
import { MOCK_PROFILES, SECTIONS } from './src/data/mockData';
import { NavigationState, User, ProjectCreationData, ProjectDashboardData } from './src/types';

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout, api, isGuest, createGuestSession, getProjectById, createTask, updateTask, deleteTask, assignTaskService, updateTaskStatus } = useApi();
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
        const tabPages = ['home', 'projects', 'spot', 'profile'];
        if (tabPages.includes(newCurrentPage.name)) {
          setTab(newCurrentPage.name);
        } else if (newCurrentPage.name === 'myProfile') {
          setTab('profile');
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

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      
      // Show success message
      Alert.alert('Success', 'Project "Project 1" created successfully!');
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    }
  }, [api, user, navigateTo]);

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

      // Navigate back to projects page to show the new project
      navigateTo('projects', null);
      
      // Close the creation modal
      setShowProjectCreation(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Failed to create project. Please try again.');
    }
  }, [api, user, navigateTo]);

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
      // Here you would call the API to update the project
      // await api.updateProject(updatedProject.id, updatedProject);
      setSelectedProject(updatedProject);
      console.log('✅ Project details saved successfully');
    } catch (error) {
      console.error('Failed to save project details:', error);
      throw error;
    }
  }, []);

  const handleRefreshProjects = useCallback(() => {
    console.log('🔄 Refreshing projects list...');
    // The ProjectsPage will handle the actual refresh
  }, []);

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
    navigateTo('myProfile', MOCK_PROFILES[0]);
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
      setSelectedProject(projectData);
      setShowProjectDashboard(true);
    } catch (error) {
      console.error('Failed to load project details:', error);
      Alert.alert('Error', 'Failed to load project details');
    }
  }, []);

  const handleAddNewProject = useCallback(() => {
    navigateTo('newProject', null);
  }, [navigateTo]);

  const handleAddNewProjectEasy = useCallback(() => {
    navigateTo('newProjectEasy', null);
  }, [navigateTo]);

  const handleAddToTeam = useCallback((profile: any) => {
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
    // Handle assign to project logic
    console.log('Assign to project:', profile);
  }, []);

  const handleStartChat = useCallback((profile: any) => {
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
    
    let rootPage;
    if (newTab === 'profile') {
      rootPage = { name: 'myProfile', data: MOCK_PROFILES[0] };
    } else {
      rootPage = { name: newTab, data: null };
    }
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
              <Ionicons name="menu" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>
              One Crew, <Text style={styles.userName}>{isGuest ? 'Guest User' : (user?.name || 'Guest')}</Text>
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={toggleTheme} style={styles.topBarButton}>
              <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={20} color={isDark ? '#9ca3af' : '#71717a'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="chatbubble" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="notifications" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.topBarButton}>
              <Ionicons name="log-out" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
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
            <SpotPage isDark={isDark} />
          )}
          {page.name === 'sectionServices' && (
            <DirectoryPage
              section={page.data}
              onBack={handleBack}
              onUserSelect={handleProfileSelect}
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
        />

        {/* My Team Modal */}
        <MyTeamModal
          visible={showMyTeam}
          onClose={() => setShowMyTeam(false)}
        />

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
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
  },
  userName: {
    fontWeight: '400',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
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