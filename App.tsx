import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Components
import TabBar from './src/components/TabBar';
import SearchBar from './src/components/SearchBar';
import SplashScreen from './src/components/SplashScreen';

// Pages
import HomePage from './src/pages/HomePage';
import SectionServicesPage from './src/pages/SectionServicesPage';
import ProjectsPage from './src/pages/ProjectsPage';
import ProfileDetailPage from './src/pages/ProfileDetailPage';

// Data
import { MOCK_PROFILES, MOCK_PROJECTS_DATA, SECTIONS } from './src/data/mockData';
import { NavigationState, User } from './src/types';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User>({ name: 'Guest' });
  const [history, setHistory] = useState<NavigationState[]>([{ name: 'spot', data: null }]);
  const [projects, setProjects] = useState(MOCK_PROJECTS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('spot');
  const [myTeam, setMyTeam] = useState([MOCK_PROFILES[0], MOCK_PROFILES[1]]);
  const [theme, setTheme] = useState('light');

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

  const renderContent = () => {
    if (showSplash) {
      return <SplashScreen onFinished={handleSplashFinished} />;
    }

    return (
      <View style={styles.appContainer}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="help-circle" size={20} color="#71717a" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>
              One Crew, <Text style={styles.userName}>{user.name}</Text>
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={toggleTheme} style={styles.topBarButton}>
              <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={20} color="#71717a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="chatbubble" size={20} color="#71717a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarButton}>
              <Ionicons name="notifications" size={20} color="#71717a" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {page.name === 'home' && (
            <HomePage
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
          {page.name === 'sectionServices' && (
            <SectionServicesPage
              section={page.data}
              onBack={handleBack}
              onServiceSelect={handleServiceSelect}
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 48,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarButton: {
    padding: 8,
    marginLeft: 4,
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
    bottom: 80,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    padding: 12,
    zIndex: 20,
  },
});

export default App;