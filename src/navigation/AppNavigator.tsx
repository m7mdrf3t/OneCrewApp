import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

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
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
      initialRouteName="spot"
    >
      {/* Main tabs */}
      <Stack.Screen name="spot" component={SpotPage} />
      <Stack.Screen name="home" component={HomePageWithUsers} />
      <Stack.Screen name="projects" component={ProjectsPage} />
      <Stack.Screen name="wall" component={AgendaPage} />
      
      {/* Service screens */}
      <Stack.Screen name="sectionServices" component={DirectoryPage} />
      <Stack.Screen name="details" component={ServiceDetailPage} />
      <Stack.Screen name="academyDetail" component={CompanyProfilePage} />
      <Stack.Screen name="legalDetail" component={ServiceDetailPage} />
      <Stack.Screen name="directory" component={DirectoryPage} />
      <Stack.Screen name="serviceDetail" component={ServiceDetailPage} />
      
      {/* Profile screens */}
      <Stack.Screen 
        name="profile" 
        component={ProfileDetailPage}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.profile?.name || 'Profile',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      />
      <Stack.Screen 
        name="myProfile" 
        component={ProfileDetailPage}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.user?.name || 'My Profile',
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      />
      <Stack.Screen name="profileCompletion" component={ProfileCompletionPage} />
      <Stack.Screen name="companyProfile" component={CompanyProfilePage} />
      <Stack.Screen name="companyRegistration" component={CompanyRegistrationPage} />
      <Stack.Screen name="companyEdit" component={CompanyEditPage} />
      <Stack.Screen name="companyMembersManagement" component={CompanyMembersManagementPage} />
      
      {/* Project screens */}
      <Stack.Screen name="projectDetail" component={ProjectDetailPage} />
      <Stack.Screen name="newProject" component={NewProjectPage} />
      <Stack.Screen name="newProjectEasy" component={NewProjectPage} />
      
      {/* Course screens */}
      <Stack.Screen name="coursesManagement" component={CoursesManagementPage} />
      <Stack.Screen name="courseEdit" component={CourseEditPage} />
      <Stack.Screen name="courseDetail" component={CourseDetailPage} />
      <Stack.Screen name="publicCourses" component={PublicCoursesPage} />
      
      {/* Chat screens */}
      <Stack.Screen name="chat" component={ChatPage} />
      <Stack.Screen name="conversations" component={ConversationsListPage} />
      
      {/* Other screens */}
      <Stack.Screen name="settings" component={SettingsPage} />
      <Stack.Screen name="changePassword" component={ChangePasswordPage} />
      <Stack.Screen name="accountDeletion" component={AccountDeletionPage} />
      <Stack.Screen name="privacyPolicy" component={PrivacyPolicyPage} />
      <Stack.Screen name="support" component={SupportPage} />
      <Stack.Screen name="agenda" component={AgendaPage} />
      <Stack.Screen name="allAgenda" component={AllAgendaPage} />
      <Stack.Screen name="bookingRequests" component={BookingRequestsPage} />
      <Stack.Screen name="weeklySchedule" component={WeeklySchedulePage} />
      <Stack.Screen name="performanceTest" component={PerformanceTestPage} />
    </Stack.Navigator>
  );
};


