import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileCompletionBannerProps {
  completionPercentage: number;
  onCompleteProfile: () => void;
  isVisible: boolean;
}

const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  completionPercentage,
  onCompleteProfile,
  isVisible,
}) => {
  if (!isVisible || completionPercentage >= 100) {
    return null;
  }

  const getCompletionMessage = () => {
    if (completionPercentage < 30) {
      return 'Complete your profile to get discovered by more opportunities!';
    } else if (completionPercentage < 70) {
      return 'You\'re almost there! Complete a few more details to boost your profile.';
    } else {
      return 'Just a few more details to complete your profile!';
    }
  };

  const getCompletionColor = () => {
    if (completionPercentage < 30) {
      return '#ef4444'; // Red
    } else if (completionPercentage < 70) {
      return '#f59e0b'; // Orange
    } else {
      return '#10b981'; // Green
    }
  };

  return (
    <View style={[styles.banner, { borderLeftColor: getCompletionColor() }]}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="person-add" 
              size={20} 
              color={getCompletionColor()} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.bannerTitle}>Complete Your Profile</Text>
            <Text style={styles.bannerMessage}>{getCompletionMessage()}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${completionPercentage}%`,
                      backgroundColor: getCompletionColor()
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: getCompletionColor() }]}>
                {completionPercentage}%
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.completeButton, { backgroundColor: getCompletionColor() }]}
          onPress={onCompleteProfile}
        >
          <Text style={styles.completeButtonText}>Complete</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileCompletionBanner;
