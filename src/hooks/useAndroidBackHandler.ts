import { useEffect } from 'react';
import { BackHandler, Platform, Alert } from 'react-native';
import { navigationRef } from '../navigation/NavigationContext';
import { useGlobalModals } from '../contexts/GlobalModalsContext';

/**
 * Custom hook to handle Android back button behavior
 * 
 * Behavior:
 * 1. If any global modals are open, close them first
 * 2. If on root screens (spot, projects, wall, profile), navigate to home
 * 3. If on home screen, show exit confirmation dialog
 * 4. Otherwise, use default React Navigation back behavior
 */
export const useAndroidBackHandler = () => {
  const {
    showNotificationModal,
    setShowNotificationModal,
    showAccountSwitcher,
    setShowAccountSwitcher,
    showUserMenu,
    setShowUserMenu,
    showMyTeam,
    setShowMyTeam,
  } = useGlobalModals();

  // Root screens that should navigate to home when back is pressed
  const rootScreens = ['spot', 'projects', 'wall', 'profile'];
  const homeScreen = 'home';

  // Helper function to get the current active route name
  const getCurrentRouteName = (): string | null => {
    if (!navigationRef.current) {
      return null;
    }

    try {
      const state = navigationRef.current.getRootState();
      if (!state) {
        return null;
      }

      // Traverse the navigation state to find the deepest active route
      const findActiveRoute = (navState: any): string | null => {
        if (!navState) {
          return null;
        }

        // If this state has routes and an index
        if (navState.routes && typeof navState.index === 'number') {
          const route = navState.routes[navState.index];
          
          // If this route has nested state, recurse
          if (route.state) {
            const nestedRoute = findActiveRoute(route.state);
            if (nestedRoute) {
              return nestedRoute;
            }
          }
          
          // Return this route's name
          return route.name || null;
        }

        return null;
      };

      return findActiveRoute(state);
    } catch (error) {
      console.error('Error getting current route:', error);
      return null;
    }
  };

  useEffect(() => {
    // Only register handler on Android
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if navigation is ready
      if (!navigationRef.current) {
        return false; // Allow default behavior
      }

      // Get current navigation state using helper function
      const currentRoute = getCurrentRouteName();
      console.log('🔙 Android back button pressed. Current route:', currentRoute);

      // Priority 1: Check if any global modals are open
      // Close modals in order of visual priority (topmost first)
      if (showMyTeam) {
        setShowMyTeam(false);
        return true; // Prevent default back action
      }

      if (showUserMenu) {
        setShowUserMenu(false);
        return true; // Prevent default back action
      }

      if (showAccountSwitcher) {
        setShowAccountSwitcher(false);
        return true; // Prevent default back action
      }

      if (showNotificationModal) {
        setShowNotificationModal(false);
        return true; // Prevent default back action
      }

      // Priority 2: Handle navigation based on current route
      if (currentRoute) {
        // If on root screens, navigate to home
        if (rootScreens.includes(currentRoute)) {
          navigationRef.current.navigate(homeScreen as any);
          return true; // Prevent default back action
        }

        // If on home screen, show exit confirmation
        if (currentRoute === homeScreen) {
          console.log('🏠 On home screen - showing exit confirmation');
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Exit',
                style: 'destructive',
                onPress: () => {
                  console.log('✅ User confirmed exit');
                  BackHandler.exitApp();
                },
              },
            ],
            { cancelable: true }
          );
          return true; // Prevent default back action
        }
      }

      // Priority 3: Use default React Navigation back behavior
      if (navigationRef.current.canGoBack()) {
        navigationRef.current.goBack();
        return true; // Prevent default back action
      }

      // Priority 4: If we can't go back and no route detected, 
      // check if we're at the root (likely on home screen)
      // Show exit confirmation as fallback
      if (!currentRoute || !navigationRef.current.canGoBack()) {
        console.log('⚠️ No route detected or can\'t go back - showing exit confirmation as fallback');
        Alert.alert(
          'Exit App',
          'Are you sure you want to exit?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Exit',
              style: 'destructive',
              onPress: () => {
                console.log('✅ User confirmed exit (fallback)');
                BackHandler.exitApp();
              },
            },
          ],
          { cancelable: true }
        );
        return true; // Prevent default back action
      }

      // Final fallback: allow default behavior (exit app)
      return false;
    });

    // Cleanup: Remove the event listener when component unmounts
    return () => {
      backHandler.remove();
    };
  }, [
    showNotificationModal,
    setShowNotificationModal,
    showAccountSwitcher,
    setShowAccountSwitcher,
    showUserMenu,
    setShowUserMenu,
    showMyTeam,
    setShowMyTeam,
  ]);
};

