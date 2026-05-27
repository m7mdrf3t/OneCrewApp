import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import ProfileHeaderRight from '../components/ProfileHeaderRight';
import { useApi } from '../contexts/ApiContext';
import { AuthNavigator, LoginScreen, SignupScreen } from './AuthNavigator';
import OnboardingPage from '../pages/OnboardingPage';

const Stack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator();

interface AppNavigatorProps {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadScreen = (loader: () => { default: any }): (() => any) => {
  return () => loader().default;
};

// Stable module-level references — avoids recreating functions on every render
const screens = {
  spot: loadScreen(() => require('../pages/SpotPage')),
  home: loadScreen(() => require('../pages/HomePageWithUsers')),
  projects: loadScreen(() => require('../pages/ProjectsPage')),
  wall: loadScreen(() => require('../pages/AgendaPage')),
  sectionServices: loadScreen(() => require('../pages/DirectoryPage')),
  details: loadScreen(() => require('../pages/ServiceDetailPage')),
  academyDetail: loadScreen(() => require('../pages/CompanyProfilePage')),
  legalDetail: loadScreen(() => require('../pages/ServiceDetailPage')),
  directory: loadScreen(() => require('../pages/DirectoryPage')),
  serviceDetail: loadScreen(() => require('../pages/ServiceDetailPage')),
  profile: loadScreen(() => require('../pages/ProfileDetailPage')),
  myProfile: loadScreen(() => require('../pages/ProfileDetailPage')),
  profileCompletion: loadScreen(() => require('../pages/ProfileCompletionPage')),
  companyProfile: loadScreen(() => require('../pages/CompanyProfilePage')),
  companyRegistration: loadScreen(() => require('../pages/CompanyRegistrationPage')),
  companyEdit: loadScreen(() => require('../pages/CompanyEditPage')),
  companyMembersManagement: loadScreen(() => require('../pages/CompanyMembersManagementPage')),
  projectDetail: loadScreen(() => require('../pages/ProjectDetailPage')),
  newProject: loadScreen(() => require('../pages/NewProjectPage')),
  newProjectEasy: loadScreen(() => require('../pages/NewProjectPage')),
  coursesManagement: loadScreen(() => require('../pages/CoursesManagementPage')),
  courseEdit: loadScreen(() => require('../pages/CourseEditPage')),
  courseDetail: loadScreen(() => require('../pages/CourseDetailPage')),
  publicCourses: loadScreen(() => require('../pages/PublicCoursesPage')),
  chat: loadScreen(() => require('../pages/ChatPage')),
  conversations: loadScreen(() => require('../pages/ConversationsListPage')),
  settings: loadScreen(() => require('../pages/SettingsPage')),
  changePassword: loadScreen(() => require('../pages/ChangePasswordPage')),
  accountDeletion: loadScreen(() => require('../pages/AccountDeletionPage')),
  privacyPolicy: loadScreen(() => require('../pages/PrivacyPolicyPage')),
  support: loadScreen(() => require('../pages/SupportPage')),
  agenda: loadScreen(() => require('../pages/AgendaPage')),
  allAgenda: loadScreen(() => require('../pages/AllAgendaPage')),
  bookingRequests: loadScreen(() => require('../pages/BookingRequestsPage')),
  weeklySchedule: loadScreen(() => require('../pages/WeeklySchedulePage')),
  newsDetail: loadScreen(() => require('../pages/NewsDetailPage')),
};

const screenOptions = {
  headerShown: true,
  headerTransparent: false,
  headerStyle: {
    backgroundColor: '#ffffff',
  },
  headerTintColor: '#000000',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  headerRight: () => <ProfileHeaderRight />,
  animation: 'slide_from_right' as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
  freezeOnBlur: true,
  animationDuration: 200,
};

const OnboardingScreen: React.FC = () => {
  const { api, user } = useApi();
  const handleDone = async () => {
    try {
      if (user) await api.updateUserProfile({ profile_step: 'completed' });
    } catch {}
  };
  return <OnboardingPage onComplete={handleDone} onSkip={handleDone} />;
};

const AppNavigatorComponent: React.FC<AppNavigatorProps> = () => {
  const { isAuthenticated, isGuest, user } = useApi();

  if (!isAuthenticated && !isGuest) {
    return <AuthNavigator />;
  }

  if (isAuthenticated && (user?.profile_step === 'onboarding' || user?.profile_completeness === 0)) {
    return (
      <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
        <OnboardingStack.Screen name="onboarding" component={OnboardingScreen} />
      </OnboardingStack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="spot"
    >
      {/* Main tabs */}
      <Stack.Screen name="spot" getComponent={screens.spot} options={{ title: 'Spot' }} />
      <Stack.Screen name="home" getComponent={screens.home} options={{ title: 'Home' }} />
      <Stack.Screen name="projects" getComponent={screens.projects} options={{ title: 'Projects' }} />
      <Stack.Screen name="wall" getComponent={screens.wall} options={{ title: 'Agenda' }} />

      {/* Service screens */}
      <Stack.Screen name="sectionServices" getComponent={screens.sectionServices} options={{ title: 'Services' }} />
      <Stack.Screen name="details" getComponent={screens.details} options={{ title: 'Service Details' }} />
      <Stack.Screen name="academyDetail" getComponent={screens.academyDetail} options={{ title: 'Academy' }} />
      <Stack.Screen name="legalDetail" getComponent={screens.legalDetail} options={{ title: 'Legal Services' }} />
      <Stack.Screen name="directory" getComponent={screens.directory} options={{ title: 'Directory' }} />
      <Stack.Screen name="serviceDetail" getComponent={screens.serviceDetail} options={{ title: 'Service Details' }} />

      {/* Profile screens */}
      <Stack.Screen
        name="profile"
        getComponent={screens.profile}
        options={({ route }) => ({ title: route.params?.profile?.name || 'Profile' })}
      />
      <Stack.Screen
        name="myProfile"
        getComponent={screens.myProfile}
        options={({ route }) => ({ title: route.params?.user?.name || 'My Profile' })}
      />
      <Stack.Screen name="profileCompletion" getComponent={screens.profileCompletion} options={{ title: 'Complete Profile' }} />
      <Stack.Screen name="companyProfile" getComponent={screens.companyProfile} options={{ headerShown: false }} />
      <Stack.Screen name="companyRegistration" getComponent={screens.companyRegistration} options={{ title: 'Register Company' }} />
      <Stack.Screen name="companyEdit" getComponent={screens.companyEdit} options={{ title: 'Edit Company' }} />
      <Stack.Screen name="companyMembersManagement" getComponent={screens.companyMembersManagement} options={{ title: 'Company Members' }} />

      {/* Project screens */}
      <Stack.Screen name="projectDetail" getComponent={screens.projectDetail} options={{ title: 'Project' }} />
      <Stack.Screen name="newProject" getComponent={screens.newProject} options={{ title: 'New Project' }} />
      <Stack.Screen name="newProjectEasy" getComponent={screens.newProjectEasy} options={{ title: 'New Project' }} />

      {/* Course screens */}
      <Stack.Screen name="coursesManagement" getComponent={screens.coursesManagement} options={{ title: 'Courses' }} />
      <Stack.Screen name="courseEdit" getComponent={screens.courseEdit} options={{ title: 'Edit Course' }} />
      <Stack.Screen name="courseDetail" getComponent={screens.courseDetail} options={{ title: 'Course Details' }} />
      <Stack.Screen name="publicCourses" getComponent={screens.publicCourses} options={{ title: 'Public Courses' }} />

      {/* Chat screens */}
      <Stack.Screen name="chat" getComponent={screens.chat} options={{ title: '' }} />
      <Stack.Screen name="conversations" getComponent={screens.conversations} options={{ title: 'Messages' }} />

      {/* Other screens */}
      <Stack.Screen name="settings" getComponent={screens.settings} options={{ title: 'Settings' }} />
      <Stack.Screen name="changePassword" getComponent={screens.changePassword} options={{ title: 'Change Password' }} />
      <Stack.Screen name="accountDeletion" getComponent={screens.accountDeletion} options={{ title: 'Delete Account' }} />
      <Stack.Screen name="privacyPolicy" getComponent={screens.privacyPolicy} options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="support" getComponent={screens.support} options={{ title: 'Support' }} />
      <Stack.Screen name="agenda" getComponent={screens.agenda} options={{ title: 'Agenda' }} />
      <Stack.Screen name="allAgenda" getComponent={screens.allAgenda} options={{ title: 'All Agenda' }} />
      <Stack.Screen name="bookingRequests" getComponent={screens.bookingRequests} options={{ title: 'Booking Requests' }} />
      <Stack.Screen name="weeklySchedule" getComponent={screens.weeklySchedule} options={{ title: 'Weekly Schedule' }} />

      {/* News screens */}
      <Stack.Screen
        name="newsDetail"
        getComponent={screens.newsDetail}
        options={({ route }) => ({ title: route.params?.post?.title || 'News' })}
      />

      {/* Auth screens accessible as modals from the main app (e.g. guest → sign up) */}
      <Stack.Screen
        name="login"
        component={LoginScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="signup"
        component={SignupScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator = React.memo(AppNavigatorComponent);


