import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import ProfileHeaderRight from '../components/ProfileHeaderRight';

// Import all pages
import HomePage from '../pages/HomePage';
import HomePageWithUsers from '../pages/HomePageWithUsers';
import SpotPage from '../pages/SpotPage';
import SectionServicesPage from '../pages/SectionServicesPage';
import DirectoryPage from '../pages/DirectoryPage';
import ServiceDetailPage from '../pages/ServiceDetailPage';
import ProjectsPage from '../pages/ProjectsPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import NewProjectPage from '../pages/NewProjectPage';
import ProfileDetailPage from '../pages/ProfileDetailPage';
import ProfileCompletionPage from '../pages/ProfileCompletionPage';
import CompanyProfilePage from '../pages/CompanyProfilePage';
import CompanyRegistrationPage from '../pages/CompanyRegistrationPage';
import CompanyEditPage from '../pages/CompanyEditPage';
import CoursesManagementPage from '../pages/CoursesManagementPage';
import CourseEditPage from '../pages/CourseEditPage';
import CourseDetailPage from '../pages/CourseDetailPage';
import CompanyMembersManagementPage from '../pages/CompanyMembersManagementPage';
import PublicCoursesPage from '../pages/PublicCoursesPage';
import ConversationsListPage from '../pages/ConversationsListPage';
import ChatPage from '../pages/ChatPage';
import NewsDetailPage from '../pages/NewsDetailPage';
import SettingsPage from '../pages/SettingsPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import AccountDeletionPage from '../pages/AccountDeletionPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import SupportPage from '../pages/SupportPage';
import AgendaPage from '../pages/AgendaPage';
import AllAgendaPage from '../pages/AllAgendaPage';
import BookingRequestsPage from '../pages/BookingRequestsPage';
import WeeklySchedulePage from '../pages/WeeklySchedulePage';
import PerformanceTestPage from '../pages/PerformanceTestPage';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  // Add any props needed for navigation
}

export const AppNavigator: React.FC<AppNavigatorProps> = () => {
  return (
    <Stack.Navigator
      screenOptions={{
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
        headerBackTitleVisible: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        // Performance optimizations
        freezeOnBlur: true, // Freeze screens when not visible
        animationDuration: 200, // Faster animations
      }}
      initialRouteName="spot"
    >
      {/* Main tabs */}
      <Stack.Screen 
        name="spot" 
        component={SpotPage}
        options={{
          title: 'Spot',
        }}
      />
      <Stack.Screen 
        name="home" 
        component={HomePageWithUsers}
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen 
        name="projects" 
        component={ProjectsPage}
        options={{
          title: 'Projects',
        }}
      />
      <Stack.Screen 
        name="wall" 
        component={AgendaPage}
        options={{
          title: 'Agenda',
        }}
      />
      
      {/* Service screens */}
      <Stack.Screen 
        name="sectionServices" 
        component={DirectoryPage}
        options={{
          title: 'Services',
        }}
      />
      <Stack.Screen 
        name="details" 
        component={ServiceDetailPage}
        options={{
          title: 'Service Details',
        }}
      />
      <Stack.Screen 
        name="academyDetail" 
        component={CompanyProfilePage}
        options={{
          title: 'Academy',
        }}
      />
      <Stack.Screen 
        name="legalDetail" 
        component={ServiceDetailPage}
        options={{
          title: 'Legal Services',
        }}
      />
      <Stack.Screen 
        name="directory" 
        component={DirectoryPage}
        options={{
          title: 'Directory',
        }}
      />
      <Stack.Screen 
        name="serviceDetail" 
        component={ServiceDetailPage}
        options={{
          title: 'Service Details',
        }}
      />
      
      {/* Profile screens */}
      <Stack.Screen 
        name="profile" 
        component={ProfileDetailPage}
        options={({ route }) => ({
          title: route.params?.profile?.name || 'Profile',
        })}
      />
      <Stack.Screen 
        name="myProfile" 
        component={ProfileDetailPage}
        options={({ route }) => ({
          title: route.params?.user?.name || 'My Profile',
        })}
      />
      <Stack.Screen 
        name="profileCompletion" 
        component={ProfileCompletionPage}
        options={{
          title: 'Complete Profile',
        }}
      />
      <Stack.Screen 
        name="companyProfile" 
        component={CompanyProfilePage}
        options={{
          title: 'Company',
        }}
      />
      <Stack.Screen 
        name="companyRegistration" 
        component={CompanyRegistrationPage}
        options={{
          title: 'Register Company',
        }}
      />
      <Stack.Screen 
        name="companyEdit" 
        component={CompanyEditPage}
        options={{
          title: 'Edit Company',
        }}
      />
      <Stack.Screen 
        name="companyMembersManagement" 
        component={CompanyMembersManagementPage}
        options={{
          title: 'Company Members',
        }}
      />
      
      {/* Project screens */}
      <Stack.Screen 
        name="projectDetail" 
        component={ProjectDetailPage}
        options={{
          title: 'Project',
        }}
      />
      <Stack.Screen 
        name="newProject" 
        component={NewProjectPage}
        options={{
          title: 'New Project',
        }}
      />
      <Stack.Screen 
        name="newProjectEasy" 
        component={NewProjectPage}
        options={{
          title: 'New Project',
        }}
      />
      
      {/* Course screens */}
      <Stack.Screen 
        name="coursesManagement" 
        component={CoursesManagementPage}
        options={{
          title: 'Courses',
        }}
      />
      <Stack.Screen 
        name="courseEdit" 
        component={CourseEditPage}
        options={{
          title: 'Edit Course',
        }}
      />
      <Stack.Screen 
        name="courseDetail" 
        component={CourseDetailPage}
        options={{
          title: 'Course Details',
        }}
      />
      <Stack.Screen 
        name="publicCourses" 
        component={PublicCoursesPage}
        options={{
          title: 'Public Courses',
        }}
      />
      
      {/* Chat screens */}
      <Stack.Screen 
        name="chat" 
        component={ChatPage}
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen 
        name="conversations" 
        component={ConversationsListPage}
        options={{
          title: 'Messages',
        }}
      />
      
      {/* Other screens */}
      <Stack.Screen 
        name="settings" 
        component={SettingsPage}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen 
        name="changePassword" 
        component={ChangePasswordPage}
        options={{
          title: 'Change Password',
        }}
      />
      <Stack.Screen 
        name="accountDeletion" 
        component={AccountDeletionPage}
        options={{
          title: 'Delete Account',
        }}
      />
      <Stack.Screen 
        name="privacyPolicy" 
        component={PrivacyPolicyPage}
        options={{
          title: 'Privacy Policy',
        }}
      />
      <Stack.Screen 
        name="support" 
        component={SupportPage}
        options={{
          title: 'Support',
        }}
      />
      <Stack.Screen 
        name="agenda" 
        component={AgendaPage}
        options={{
          title: 'Agenda',
        }}
      />
      <Stack.Screen 
        name="allAgenda" 
        component={AllAgendaPage}
        options={{
          title: 'All Agenda',
        }}
      />
      <Stack.Screen 
        name="bookingRequests" 
        component={BookingRequestsPage}
        options={{
          title: 'Booking Requests',
        }}
      />
      <Stack.Screen 
        name="weeklySchedule" 
        component={WeeklySchedulePage}
        options={{
          title: 'Weekly Schedule',
        }}
      />
      <Stack.Screen 
        name="performanceTest" 
        component={PerformanceTestPage}
        options={{
          title: 'Performance Test',
        }}
      />
      
      {/* News screens */}
      <Stack.Screen 
        name="newsDetail" 
        component={NewsDetailPage}
        options={({ route }) => ({
          title: route.params?.post?.title || 'News',
        })}
      />
    </Stack.Navigator>
  );
};


