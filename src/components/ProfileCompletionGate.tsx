import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface ProfileCompletionGateProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onNavigateToProfile?: () => void;
  minimumCompletion?: number; // Default 50
}

const ProfileCompletionGate: React.FC<ProfileCompletionGateProps> = ({
  children,
  onComplete,
  onNavigateToProfile,
  minimumCompletion = 50,
}) => {
  const { user, getProfileCompleteness, isLoading } = useApi();
  const [completion, setCompletion] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user?.id) {
        setChecking(false);
        return;
      }

      try {
        setChecking(true);
        const response = await getProfileCompleteness(user.id);
        
        // Handle both API response format and mock format
        const completenessValue = response.data?.completeness || response.data?.profile_completeness || 0;
        setCompletion(completenessValue);
        
        if (completenessValue >= minimumCompletion && onComplete) {
          onComplete();
        }
      } catch (err: any) {
        console.error('Failed to check profile completion:', err);
        setError(err.message || 'Failed to check profile completion');
      } finally {
        setChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user?.id, minimumCompletion]);

  if (checking || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.checkingText}>Checking profile completion...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onNavigateToProfile}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (completion === null) {
    return <>{children}</>;
  }

  if (completion < minimumCompletion) {
    const percentage = Math.round(completion);
    const remaining = minimumCompletion - percentage;

    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={64} color="#71717a" />
        <Text style={styles.title}>Profile Completion Required</Text>
        <Text style={styles.description}>
          You need to complete at least {minimumCompletion}% of your profile to create a company.
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{percentage}% Complete</Text>
        </View>

        <Text style={styles.remainingText}>
          {remaining}% more required
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onNavigateToProfile}
        >
          <Text style={styles.buttonText}>Complete Your Profile</Text>
        </TouchableOpacity>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Quick Tips:</Text>
          <Text style={styles.tipsText}>• Add your bio and specialty</Text>
          <Text style={styles.tipsText}>• Add your skills and abilities</Text>
          <Text style={styles.tipsText}>• Upload a profile photo</Text>
          <Text style={styles.tipsText}>• Add your location</Text>
        </View>
      </View>
    );
  }

  // Profile is complete enough, show children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f4f4f5',
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e4e4e7',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 8,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});

export default ProfileCompletionGate;

