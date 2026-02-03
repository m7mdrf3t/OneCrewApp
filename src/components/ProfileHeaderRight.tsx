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
  onShowAccountSwitcher?: () => void;
  onShowMenu?: () => void;
}

const ProfileHeaderRight: React.FC<ProfileHeaderRightProps> = ({
  onShowNotifications,
  onShowMessages,
  onShowAccountSwitcher,
  onShowMenu,
}) => {
  const { unreadNotificationCount, unreadConversationCount } = useApi();
  const { navigateTo } = useAppNavigation();
  
  // Debug logging for unread count
  React.useEffect(() => {
    if (__DEV__) {
      console.log('📧 [ProfileHeaderRight] Unread conversation count:', unreadConversationCount);
    }
  }, [unreadConversationCount]);
  
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

  const handleMessages = () => {
    if (onShowMessages) {
      onShowMessages();
    } else {
      navigateTo('conversations');
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
        onPress={handleMessages}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="mail-outline" size={20} color="#000000" />
        {unreadConversationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadConversationCount > 99 ? '99+' : unreadConversationCount}
            </Text>
          </View>
        )}
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

