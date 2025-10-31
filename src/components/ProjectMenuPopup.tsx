import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProjectMenuPopupProps {
  visible: boolean;
  onClose: () => void;
  onEditName: () => void;
  onProjectType: () => void;
  onCoverPhoto: () => void;
  onSave: () => void;
  onDelete: () => void;
  anchorPosition?: { x: number; y: number };
}

const ProjectMenuPopup: React.FC<ProjectMenuPopupProps> = ({
  visible,
  onClose,
  onEditName,
  onProjectType,
  onCoverPhoto,
  onSave,
  onDelete,
  anchorPosition,
}) => {
  const menuItems = [
    { icon: 'pencil', label: 'Edit Name', onPress: onEditName },
    { icon: 'briefcase', label: 'Project Type', onPress: onProjectType },
    { icon: 'image', label: 'Cover Photo', onPress: onCoverPhoto },
    { icon: 'folder', label: 'Save', onPress: onSave },
    { icon: 'trash', label: 'Delete', onPress: onDelete, isDestructive: true },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={18} 
                    color={item.isDestructive ? '#ef4444' : '#000'} 
                  />
                  <Text style={[
                    styles.menuItemText,
                    item.isDestructive && styles.menuItemTextDestructive
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingTop: 100,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  menuItemTextDestructive: {
    color: '#ef4444',
  },
});

export default ProjectMenuPopup;

