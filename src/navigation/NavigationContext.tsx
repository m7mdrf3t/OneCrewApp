import React, { createContext, useContext, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

interface NavigationContextType {
  navigate: <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => void;
  goBack: () => void;
  navigateTo: (pageName: string, data?: any) => void; // Legacy function for compatibility
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Navigation ref that will be set by NavigationContainer
export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigateTo = (pageName: string, data?: any) => {
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
    };

    const routeName = routeMap[pageName] as keyof RootStackParamList;
    if (routeName) {
      // Transform data to match route params
      let params: any = undefined;
      
      if (data) {
        // Handle different data formats
        if (pageName === 'profile' || pageName === 'myProfile') {
          params = { profile: data, user: data };
        } else if (pageName === 'projectDetail') {
          params = { project: data };
        } else if (pageName === 'companyProfile') {
          params = { companyId: typeof data === 'string' ? data : (data?.companyId || data?.id || data) };
        } else if (pageName === 'chat') {
          params = data;
        } else if (pageName === 'sectionServices') {
          params = { sectionKey: data?.key || data };
        } else if (pageName === 'details' || pageName === 'academyDetail' || pageName === 'legalDetail') {
          params = { serviceData: data };
        } else if (pageName === 'courseDetail' || pageName === 'courseEdit' || pageName === 'coursesManagement') {
          params = data;
        } else {
          params = data;
        }
      }
      
      navigationRef.current?.navigate(routeName, params as any);
    } else {
      console.warn(`Unknown route: ${pageName}`);
    }
  };

  const navigate = <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => {
    navigationRef.current?.navigate(name, params);
  };

  const goBack = () => {
    navigationRef.current?.goBack();
  };

  const value: NavigationContextType = {
    navigate,
    goBack,
    navigateTo,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within NavigationProvider');
  }
  return context;
};

