import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface AccountDeletionPageProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

const AccountDeletionPage: React.FC<AccountDeletionPageProps> = ({ onBack, theme = 'light' }) => {
  const { logout, requestAccountDeletion, restoreAccount, getAccountDeletionStatus } = useApi();
  const isDark = theme === 'dark';
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    isPending: boolean;
    expirationDate?: string;
    daysRemaining?: number;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const requiredText = 'DELETE';

  // Check deletion status on mount
  useEffect(() => {
    const checkDeletionStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const status = await getAccountDeletionStatus();
        setDeletionStatus(status);
      } catch (error) {
        console.error('Failed to check deletion status:', error);
        // If error, assume no pending deletion
        setDeletionStatus({ isPending: false });
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkDeletionStatus();
  }, [getAccountDeletionStatus]);

  const handleDeleteAccount = () => {
    if (confirmationText !== requiredText) {
      Alert.alert('Invalid Confirmation', `Please type "${requiredText}" to confirm account deletion.`);
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deletion.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? Your account will be scheduled for deletion with a grace period. You can restore it within this period.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await requestAccountDeletion(password);
              
              Alert.alert(
                'Account Deletion Scheduled',
                `Your account has been scheduled for deletion.\n\nExpiration Date: ${new Date(result.expirationDate).toLocaleDateString()}\nDays Remaining: ${result.daysRemaining}\n\nYou can restore your account before this date.`,
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      // Refresh deletion status
                      const status = await getAccountDeletionStatus();
                      setDeletionStatus(status);
                      setIsDeleting(false);
                      setPassword('');
                      setConfirmationText('');
                    },
                  },
                ]
              );
            } catch (error: any) {
              setIsDeleting(false);
              Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRestoreAccount = () => {
    Alert.alert(
      'Restore Account',
      'Are you sure you want to restore your account? This will cancel the scheduled deletion.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restore Account',
          onPress: async () => {
            setIsRestoring(true);
            try {
              await restoreAccount();
              Alert.alert(
                'Account Restored',
                'Your account has been successfully restored. The deletion has been cancelled.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh deletion status
                      const status = await getAccountDeletionStatus();
                      setDeletionStatus(status);
                      setIsRestoring(false);
                    },
                  },
                ]
              );
            } catch (error: any) {
              setIsRestoring(false);
              Alert.alert('Error', error.message || 'Failed to restore account. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isDeleting}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Show pending deletion status if applicable */}
        {!isLoadingStatus && deletionStatus?.isPending && (
          <View style={[styles.pendingDeletionSection, { backgroundColor: isDark ? '#78350f' : '#fef3c7' }]}>
            <Ionicons name="time" size={32} color="#f59e0b" />
            <Text style={[styles.pendingDeletionTitle, { color: isDark ? '#fbbf24' : '#92400e' }]}>
              Account Deletion Pending
            </Text>
            <Text style={[styles.pendingDeletionText, { color: isDark ? '#fbbf24' : '#92400e' }]}>
              Your account is scheduled for deletion.
            </Text>
            {deletionStatus.expirationDate && (
              <Text style={[styles.pendingDeletionText, { color: isDark ? '#fbbf24' : '#92400e', marginTop: 8 }]}>
                Expiration Date: {new Date(deletionStatus.expirationDate).toLocaleDateString()}
              </Text>
            )}
            {deletionStatus.daysRemaining !== undefined && (
              <Text style={[styles.pendingDeletionText, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                Days Remaining: {deletionStatus.daysRemaining}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.restoreButton, { backgroundColor: isDark ? '#10b981' : '#10b981' }]}
              onPress={handleRestoreAccount}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <Text style={styles.restoreButtonText}>Restoring...</Text>
              ) : (
                <Text style={styles.restoreButtonText}>Restore Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.warningSection, { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2' }]}>
          <Ionicons name="warning" size={32} color="#ef4444" />
          <Text style={[styles.warningTitle, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
            Warning: This action cannot be undone
          </Text>
          <Text style={[styles.warningText, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
            Deleting your account will permanently remove all your data, including:
          </Text>
          <View style={styles.warningList}>
            <Text style={[styles.warningListItem, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
              • All your projects and project data
            </Text>
            <Text style={[styles.warningListItem, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
              • Your profile information
            </Text>
            <Text style={[styles.warningListItem, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
              • All messages and conversations
            </Text>
            <Text style={[styles.warningListItem, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
              • Your team memberships
            </Text>
            <Text style={[styles.warningListItem, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
              • All other account-related data
            </Text>
          </View>
        </View>

        {!deletionStatus?.isPending && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
              Confirm Account Deletion
            </Text>
            <Text style={[styles.sectionDescription, { color: isDark ? '#9ca3af' : '#71717a' }]}>
              To confirm that you want to delete your account, please type "{requiredText}" in the field below and enter your password.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                Type "{requiredText}" to confirm
              </Text>
              <View style={[
                styles.inputWrapper, 
                { 
                  backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', 
                  borderColor: confirmationText === requiredText 
                    ? (isDark ? '#10b981' : '#10b981')
                    : (isDark ? '#1f2937' : '#d4d4d8')
                }
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder={`Type "${requiredText}"`}
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isDeleting}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
                Enter your password
              </Text>
              <View style={[
                styles.inputWrapper, 
                { 
                  backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', 
                  borderColor: password.length > 0
                    ? (isDark ? '#10b981' : '#10b981')
                    : (isDark ? '#1f2937' : '#d4d4d8')
                }
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder="Enter your password"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isDeleting}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                (confirmationText !== requiredText || !password || isDeleting) && styles.deleteButtonDisabled
              ]}
              onPress={handleDeleteAccount}
              disabled={confirmationText !== requiredText || !password || isDeleting}
            >
              {isDeleting ? (
                <Text style={styles.deleteButtonText}>Deleting Account...</Text>
              ) : (
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.infoSection, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
            If you're experiencing issues with your account, please contact support before deleting your account. We may be able to help resolve your concerns.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  warningSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 16,
    textAlign: 'center',
  },
  warningList: {
    width: '100%',
    alignItems: 'flex-start',
  },
  warningListItem: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 8,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
    marginLeft: 12,
  },
  pendingDeletionSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  pendingDeletionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  pendingDeletionText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
    textAlign: 'center',
  },
  restoreButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountDeletionPage;

