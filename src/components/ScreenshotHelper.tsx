/**
 * Screenshot Helper Component
 * 
 * This component helps navigate through different screens quickly
 * for taking app store screenshots. Add this temporarily to your app
 * to easily jump between screens.
 * 
 * Usage:
 * 1. Import this component in App.tsx
 * 2. Add a condition to show it (e.g., __DEV__ mode)
 * 3. Use the floating button to navigate between screens
 * 4. Remove before production build
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScreenshotHelperProps {
  onNavigate: (screen: string, data?: any) => void;
  visible?: boolean;
}

const SCREEN_OPTIONS = [
  // Authentication
  { id: 'login', name: 'Login', category: 'Authentication' },
  { id: 'signup', name: 'Sign Up', category: 'Authentication' },
  { id: 'onboarding', name: 'Onboarding', category: 'Authentication' },
  
  // Main Tabs
  { id: 'spot', name: 'Spot Tab', category: 'Main Navigation' },
  { id: 'home', name: 'Home Tab', category: 'Main Navigation' },
  { id: 'projects', name: 'Projects Tab', category: 'Main Navigation' },
  
  // Core Features
  { id: 'myProfile', name: 'My Profile', category: 'Core Features' },
  { id: 'profile', name: 'Profile Detail', category: 'Core Features', requiresData: true },
  { id: 'projectDetail', name: 'Project Detail', category: 'Core Features', requiresData: true },
  { id: 'sectionServices', name: 'Directory/Services', category: 'Core Features', requiresData: true },
  { id: 'details', name: 'Service Detail', category: 'Core Features', requiresData: true },
  { id: 'conversations', name: 'Conversations', category: 'Core Features' },
  { id: 'chat', name: 'Chat', category: 'Core Features', requiresData: true },
  { id: 'settings', name: 'Settings', category: 'Core Features' },
  
  // Additional Features
  { id: 'companyProfile', name: 'Company Profile', category: 'Additional', requiresData: true },
  { id: 'courseDetail', name: 'Course Detail', category: 'Additional', requiresData: true },
  { id: 'newsDetail', name: 'News Detail', category: 'Additional', requiresData: true },
];

const ScreenshotHelper: React.FC<ScreenshotHelperProps> = ({ 
  onNavigate, 
  visible: externalVisible 
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Only show in development mode
  if (!__DEV__) {
    return null;
  }

  const isVisible = externalVisible !== undefined ? externalVisible : visible;

  const categories = Array.from(new Set(SCREEN_OPTIONS.map(s => s.category)));

  const filteredScreens = selectedCategory
    ? SCREEN_OPTIONS.filter(s => s.category === selectedCategory)
    : SCREEN_OPTIONS;

  const handleScreenSelect = (screenId: string, requiresData: boolean) => {
    if (requiresData) {
      // For screens that require data, you may need to provide mock data
      // This is a simplified version - adjust based on your needs
      console.log(`Navigate to ${screenId} - may require data`);
      onNavigate(screenId, null);
    } else {
      onNavigate(screenId, null);
    }
    setVisible(false);
  };

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal with Screen List */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Screenshot Helper</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.screenList}>
              {/* Category Filter */}
              <View style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === null && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === null && styles.categoryTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category && styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Screen List */}
              {filteredScreens.map((screen) => (
                <TouchableOpacity
                  key={screen.id}
                  style={styles.screenItem}
                  onPress={() => handleScreenSelect(screen.id, screen.requiresData || false)}
                >
                  <View style={styles.screenItemContent}>
                    <Text style={styles.screenName}>{screen.name}</Text>
                    <Text style={styles.screenId}>{screen.id}</Text>
                    {screen.requiresData && (
                      <Text style={styles.requiresData}>⚠️ Requires data</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>
                Select a screen to navigate for screenshot capture
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  screenList: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  screenItemContent: {
    flex: 1,
  },
  screenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  screenId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  requiresData: {
    fontSize: 10,
    color: '#ff9500',
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default ScreenshotHelper;












