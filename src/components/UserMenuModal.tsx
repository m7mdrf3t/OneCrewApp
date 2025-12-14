import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}) => {
  const isDark = theme === 'dark';
  
  const menuItems = [
    { id: 'myTeam', label: 'My Team', icon: 'people', onPress: onMyTeam },
    { id: 'settings', label: 'Settings', icon: 'settings', onPress: onSettings },
    { id: 'profileEdit', label: 'Profile Edit', icon: 'create', onPress: onProfileEdit },
    { id: 'createCompany', label: 'Create Company', icon: 'business', onPress: onCreateCompany || (() => {}) },
    { id: 'helpSupport', label: 'Help & Support', icon: 'help-circle', onPress: onHelpSupport },
    ...(onToggleTheme ? [{ 
      id: 'theme', 
      label: isDark ? 'Light Mode' : 'Dark Mode', 
      icon: isDark ? 'sunny' : 'moon', 
      onPress: onToggleTheme 
    }] : []),
    { id: 'logout', label: 'Logout', icon: 'log-out', onPress: onLogout, isDestructive: true },
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
                  item.onPress();
                  onClose();
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
