import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import ProfileHeaderRight from '../components/ProfileHeaderRight';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  // Add any props needed for navigation
}

const loadScreen = <T,>(loader: () => { default: T }): (() => T) => {
  return () => loader().default;
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
  fullScreenGestureEnabled: true,
  freezeOnBlur: true,
  animationDuration: 200,
};

const AppNavigatorComponent: React.FC<AppNavigatorProps> = () => {
  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="spot"
    >
      {/* Main tabs */}
      <Stack.Screen 
        name="spot" 
        getComponent={loadScreen(() => require('../pages/SpotPage'))}
        options={{
          title: 'Spot',
        }}
      />
      <Stack.Screen 
        name="home" 
        getComponent={loadScreen(() => require('../pages/HomePageWithUsers'))}
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen 
        name="projects" 
        getComponent={loadScreen(() => require('../pages/ProjectsPage'))}
        options={{
          title: 'Projects',
        }}
      />
      <Stack.Screen 
        name="wall" 
        getComponent={loadScreen(() => require('../pages/AgendaPage'))}
        options={{
          title: 'Agenda',
        }}
      />
      
      {/* Service screens */}
      <Stack.Screen 
        name="sectionServices" 
        getComponent={loadScreen(() => require('../pages/DirectoryPage'))}
        options={{
          title: 'Services',
        }}
      />
      <Stack.Screen 
        name="details" 
        getComponent={loadScreen(() => require('../pages/ServiceDetailPage'))}
        options={{
          title: 'Service Details',
        }}
      />
      <Stack.Screen 
        name="academyDetail" 
        getComponent={loadScreen(() => require('../pages/CompanyProfilePage'))}
        options={{
          title: 'Academy',
        }}
      />
      <Stack.Screen 
        name="legalDetail" 
        getComponent={loadScreen(() => require('../pages/ServiceDetailPage'))}
        options={{
          title: 'Legal Services',
        }}
      />
      <Stack.Screen 
        name="directory" 
        getComponent={loadScreen(() => require('../pages/DirectoryPage'))}
        options={{
          title: 'Directory',
        }}
      />
      <Stack.Screen 
        name="serviceDetail" 
        getComponent={loadScreen(() => require('../pages/ServiceDetailPage'))}
        options={{
          title: 'Service Details',
        }}
      />
      
      {/* Profile screens */}
      <Stack.Screen 
        name="profile" 
        getComponent={loadScreen(() => require('../pages/ProfileDetailPage'))}
        options={({ route }) => ({
          title: route.params?.profile?.name || 'Profile',
        })}
      />
      <Stack.Screen 
        name="myProfile" 
        getComponent={loadScreen(() => require('../pages/ProfileDetailPage'))}
        options={({ route }) => ({
          title: route.params?.user?.name || 'My Profile',
        })}
      />
      <Stack.Screen 
        name="profileCompletion" 
        getComponent={loadScreen(() => require('../pages/ProfileCompletionPage'))}
        options={{
          title: 'Complete Profile',
        }}
      />
      <Stack.Screen 
        name="companyProfile" 
        getComponent={loadScreen(() => require('../pages/CompanyProfilePage'))}
        options={{
          headerShown: false, // Use custom header in CompanyProfilePage
        }}
      />
      <Stack.Screen 
        name="companyRegistration" 
        getComponent={loadScreen(() => require('../pages/CompanyRegistrationPage'))}
        options={{
          title: 'Register Company',
        }}
      />
      <Stack.Screen 
        name="companyEdit" 
        getComponent={loadScreen(() => require('../pages/CompanyEditPage'))}
        options={{
          title: 'Edit Company',
        }}
      />
      <Stack.Screen 
        name="companyMembersManagement" 
        getComponent={loadScreen(() => require('../pages/CompanyMembersManagementPage'))}
        options={{
          title: 'Company Members',
        }}
      />
      
      {/* Project screens */}
      <Stack.Screen 
        name="projectDetail" 
        getComponent={loadScreen(() => require('../pages/ProjectDetailPage'))}
        options={{
          title: 'Project',
        }}
      />
      <Stack.Screen 
        name="newProject" 
        getComponent={loadScreen(() => require('../pages/NewProjectPage'))}
        options={{
          title: 'New Project',
        }}
      />
      <Stack.Screen 
        name="newProjectEasy" 
        getComponent={loadScreen(() => require('../pages/NewProjectPage'))}
        options={{
          title: 'New Project',
        }}
      />
      
      {/* Course screens */}
      <Stack.Screen 
        name="coursesManagement" 
        getComponent={loadScreen(() => require('../pages/CoursesManagementPage'))}
        options={{
          title: 'Courses',
        }}
      />
      <Stack.Screen 
        name="courseEdit" 
        getComponent={loadScreen(() => require('../pages/CourseEditPage'))}
        options={{
          title: 'Edit Course',
        }}
      />
      <Stack.Screen 
        name="courseDetail" 
        getComponent={loadScreen(() => require('../pages/CourseDetailPage'))}
        options={{
          title: 'Course Details',
        }}
      />
      <Stack.Screen 
        name="publicCourses" 
        getComponent={loadScreen(() => require('../pages/PublicCoursesPage'))}
        options={{
          title: 'Public Courses',
        }}
      />
      
      {/* Chat screens */}
      <Stack.Screen 
        name="chat" 
        getComponent={loadScreen(() => require('../pages/ChatPage'))}
        options={{
          // Title will be set dynamically by ChatPage component
          title: '',
        }}
      />
      <Stack.Screen 
        name="conversations" 
        getComponent={loadScreen(() => require('../pages/ConversationsListPage'))}
        options={{
          title: 'Messages',
        }}
      />
      
      {/* Other screens */}
      <Stack.Screen 
        name="settings" 
        getComponent={loadScreen(() => require('../pages/SettingsPage'))}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen 
        name="changePassword" 
        getComponent={loadScreen(() => require('../pages/ChangePasswordPage'))}
        options={{
          title: 'Change Password',
        }}
      />
      <Stack.Screen 
        name="accountDeletion" 
        getComponent={loadScreen(() => require('../pages/AccountDeletionPage'))}
        options={{
          title: 'Delete Account',
        }}
      />
      <Stack.Screen 
        name="privacyPolicy" 
        getComponent={loadScreen(() => require('../pages/PrivacyPolicyPage'))}
        options={{
          title: 'Privacy Policy',
        }}
      />
      <Stack.Screen 
        name="support" 
        getComponent={loadScreen(() => require('../pages/SupportPage'))}
        options={{
          title: 'Support',
        }}
      />
      <Stack.Screen 
        name="agenda" 
        getComponent={loadScreen(() => require('../pages/AgendaPage'))}
        options={{
          title: 'Agenda',
        }}
      />
      <Stack.Screen 
        name="allAgenda" 
        getComponent={loadScreen(() => require('../pages/AllAgendaPage'))}
        options={{
          title: 'All Agenda',
        }}
      />
      <Stack.Screen 
        name="bookingRequests" 
        getComponent={loadScreen(() => require('../pages/BookingRequestsPage'))}
        options={{
          title: 'Booking Requests',
        }}
      />
      <Stack.Screen 
        name="weeklySchedule" 
        getComponent={loadScreen(() => require('../pages/WeeklySchedulePage'))}
        options={{
          title: 'Weekly Schedule',
        }}
      />
      <Stack.Screen 
        name="performanceTest" 
        getComponent={loadScreen(() => require('../pages/PerformanceTestPage'))}
        options={{
          title: 'Performance Test',
        }}
      />
      
      {/* News screens */}
      <Stack.Screen 
        name="newsDetail" 
        getComponent={loadScreen(() => require('../pages/NewsDetailPage'))}
        options={({ route }) => ({
          title: route.params?.post?.title || 'News',
        })}
      />
    </Stack.Navigator>
  );
};

export const AppNavigator = React.memo(AppNavigatorComponent);


