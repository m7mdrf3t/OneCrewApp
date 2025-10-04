import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, useColorScheme } from 'react-native';
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
import ServiceDetailPage from './src/pages/ServiceDetailPage';
import ProjectsPage from './src/pages/ProjectsPage';
import ProfileDetailPage from './src/pages/ProfileDetailPage';
import SpotPage from './src/pages/SpotPage';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import ResetPasswordPage from './src/pages/ResetPasswordPage';
import OnboardingPage from './src/pages/OnboardingPage';

// Data
import { MOCK_PROFILES, MOCK_PROJECTS_DATA, SECTIONS } from './src/data/mockData';
import { NavigationState, User } from './src/types';

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useApi();
  const [showSplash, setShowSplash] = useState(true);
  const [history, setHistory] = useState<NavigationState[]>([{ name: 'spot', data: null }]);
  const [projects, setProjects] = useState(MOCK_PROJECTS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('spot');
  const [myTeam, setMyTeam] = useState([MOCK_PROFILES[0], MOCK_PROFILES[1]]);
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password' | 'onboarding' | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(false);
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
      if (!isAuthenticated) {
        setAuthPage('login');
      } else if (user?.profile_step === 'onboarding') {
        setShowOnboarding(true);
        setAuthPage(null);
      } else {
        setAuthPage(null);
        setShowOnboarding(false);
      }
    }
  }, [isAuthenticated, isLoading, user]);

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
        const tabPages = ['home', 'projects', 'spot', 'profile', 'star'];
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
    navigateTo('profile', profileData);
  }, [navigateTo]);

  const handleProjectSelect = useCallback((projectData: any) => {
    const project = projects.find(p => p.id === projectData.id);
    navigateTo('projectDetail', project);
  }, [projects, navigateTo]);

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

  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    setSearchQuery('');
    
    let rootPage;
    if (newTab === 'profile') {
      rootPage = { name: 'myProfile', data: MOCK_PROFILES[0] };
    } else if (newTab === 'star') {
      rootPage = { name: 'star', data: MOCK_PROFILES[2] };
    } else {
      rootPage = { name: newTab, data: null };
    }
    setHistory([rootPage]);
  }, []);

  const handleSplashFinished = () => {
    setShowSplash(false);
  };

  // Authentication navigation handlers
  const handleNavigateToSignup = () => {
    setAuthPage('signup');
  };

  const handleNavigateToLogin = () => {
    setAuthPage('login');
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

  const handleSignupSuccess = () => {
    setShowOnboarding(true);
    setAuthPage(null);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
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
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="help-circle" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>
              One Crew, <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
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
            <SectionServicesPage
              section={page.data}
              onBack={handleBack}
              onServiceSelect={handleServiceSelect}
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
              projects={projects}
              onProjectSelect={handleProjectSelect}
              onAddNewProject={handleAddNewProject}
              onAddNewProjectEasy={handleAddNewProjectEasy}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onBack={handleBack}
              myTeam={myTeam}
              onProfileSelect={handleProfileSelect}
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
          {page.name === 'myProfile' && (
            <ProfileDetailPage
              profile={MOCK_PROFILES[0]}
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
          {page.name === 'star' && (
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
        </View>

        <TabBar active={tab} onChange={handleTabChange} />

        {history.length > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
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
    <ApiProvider baseUrl="http://localhost:3000">
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ApiProvider>
  );
};

export default App;