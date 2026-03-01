import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useGlobalModals } from '../contexts/GlobalModalsContext';
import { spacing } from '../constants/spacing';

interface ProfileHeaderRightProps {
  onShowNotifications?: () => void;
  onShowMessages?: () => void;
  onShowAgenda?: () => void;
  onShowAccountSwitcher?: () => void;
  onShowMenu?: () => void;
}

const ProfileHeaderRight: React.FC<ProfileHeaderRightProps> = ({
  onShowNotifications,
  onShowMessages,
  onShowAgenda,
  onShowAccountSwitcher,
  onShowMenu,
}) => {
  const { unreadNotificationCount } = useApi();
  const { navigateTo } = useAppNavigation();
  
  // Use global modals context if available, otherwise use props
  let globalModals: ReturnType<typeof useGlobalModals> | null = null;
  try {
    globalModals = useGlobalModals();
  } catch {
    // Context not available, use props instead
  }

  const handleNotifications = () => {
    if (onShowNotifications) {
      onShowNotifications();
    } else if (globalModals) {
      globalModals.setShowNotificationModal(true);
    }
  };

  const handleAgenda = () => {
    if (onShowAgenda) {
      onShowAgenda();
    } else {
      navigateTo('wall');
    }
  };

  const handleAccountSwitcher = () => {
    if (onShowAccountSwitcher) {
      onShowAccountSwitcher();
    } else if (globalModals) {
      globalModals.setShowAccountSwitcher(true);
    }
  };

  const handleMenu = () => {
    if (onShowMenu) {
      onShowMenu();
    } else if (globalModals) {
      globalModals.setShowUserMenu(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleNotifications}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="notifications-outline" size={20} color="#000000" />
        {unreadNotificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleAgenda}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="calendar-outline" size={20} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ProfileHeaderRight;

