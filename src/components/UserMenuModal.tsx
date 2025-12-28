import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareAppInvite } from '../utils/shareAppInvite';

interface UserMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onMyTeam: () => void;
  onSettings: () => void;
  onProfileEdit: () => void;
  onHelpSupport: () => void;
  onLogout: () => void;
  onCreateCompany?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isGuest?: boolean;
  onSignUp?: () => void;
  onSignIn?: () => void;
  currentProfileType?: 'user' | 'company';
}

const UserMenuModal: React.FC<UserMenuModalProps> = ({
  visible,
  onClose,
  onMyTeam,
  onSettings,
  onProfileEdit,
  onHelpSupport,
  onLogout,
  onCreateCompany,
  theme = 'light',
  onToggleTheme,
  isGuest = false,
  onSignUp,
  onSignIn,
  currentProfileType = 'user',
}) => {
  const isDark = theme === 'dark';

  const handleInviteFriend = async () => {
    // Sharing from within a modal can be flaky on iOS; close first, then present share sheet.
    onClose();
    setTimeout(() => {
      void shareAppInvite();
    }, 350);
  };
  
  type MenuItem = {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void | Promise<void>;
    isDestructive?: boolean;
    shouldCloseOnPress?: boolean;
  };

  const menuItems: MenuItem[] = [
    ...(isGuest ? [
      { id: 'signUp', label: 'Sign Up', icon: 'person-add' as keyof typeof Ionicons.glyphMap, onPress: onSignUp || (() => {}) },
      { id: 'signIn', label: 'Sign In', icon: 'log-in' as keyof typeof Ionicons.glyphMap, onPress: onSignIn || (() => {}) },
    ] : [
      // Only show "My Team" and "Profile Edit" when user profile is active (not company profile)
      ...(currentProfileType === 'user' ? [
        { id: 'myTeam', label: 'My Team', icon: 'people' as keyof typeof Ionicons.glyphMap, onPress: onMyTeam },
        { id: 'profileEdit', label: 'Profile Edit', icon: 'create' as keyof typeof Ionicons.glyphMap, onPress: onProfileEdit },
      ] : []),
      { id: 'createCompany', label: 'Create Company', icon: 'business' as keyof typeof Ionicons.glyphMap, onPress: onCreateCompany || (() => {}) },
    ]),
    { id: 'settings', label: 'Settings', icon: 'settings' as keyof typeof Ionicons.glyphMap, onPress: onSettings },
    { id: 'inviteFriend', label: 'Invite a friend', icon: 'share-social' as keyof typeof Ionicons.glyphMap, onPress: handleInviteFriend, shouldCloseOnPress: false },
    { id: 'helpSupport', label: 'Help & Support', icon: 'help-circle' as keyof typeof Ionicons.glyphMap, onPress: onHelpSupport },
    ...(onToggleTheme ? [{ 
      id: 'theme', 
      label: isDark ? 'Light Mode' : 'Dark Mode', 
      icon: (isDark ? 'sunny' : 'moon') as keyof typeof Ionicons.glyphMap, 
      onPress: onToggleTheme 
    }] : []),
    ...(isGuest ? [] : [{ id: 'logout', label: 'Logout', icon: 'log-out' as keyof typeof Ionicons.glyphMap, onPress: onLogout, isDestructive: true }]),
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.isDestructive && styles.destructiveMenuItem
                ]}
                onPress={() => {
                  console.log('🔴 [UserMenuModal] Menu item pressed:', item.id, item.label);
                  if (item.id === 'myTeam') {
                    console.log('🔴 [UserMenuModal] My Team item pressed, calling onMyTeam');
                    console.log('🔴 [UserMenuModal] onMyTeam function:', typeof item.onPress, item.onPress);
                  }
                  void item.onPress();
                  if (item.shouldCloseOnPress !== false) {
                    onClose();
                  }
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.isDestructive ? '#ef4444' : '#fff'}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    item.isDestructive && styles.destructiveText
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  menuContainer: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  destructiveMenuItem: {
    borderBottomColor: '#333',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  destructiveText: {
    color: '#ef4444',
  },
});

export default UserMenuModal;
