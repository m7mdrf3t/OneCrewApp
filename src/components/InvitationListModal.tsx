import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { CompanyMember, InvitationStatus } from '../types';

interface InvitationListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onInvitationResponded?: () => void;
}

const InvitationListModal: React.FC<InvitationListModalProps> = ({
  visible,
  onClose,
  userId,
  onInvitationResponded,
}) => {
  const { getPendingInvitations, acceptInvitation, rejectInvitation, getCompany } = useApi();
  const [invitations, setInvitations] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadInvitations();
    }
  }, [visible, userId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await getPendingInvitations(userId);
      if (response.success && response.data) {
        const invitationsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.data || [];
        setInvitations(invitationsList.filter((inv: CompanyMember) => 
          inv.invitation_status === 'pending'
        ));
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
      Alert.alert('Error', 'Failed to load invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation: CompanyMember) => {
    try {
      setProcessing(invitation.company_id);
      const response = await acceptInvitation(invitation.company_id, invitation.user_id);
      
      if (response.success) {
        Alert.alert('Success', 'Invitation accepted successfully!');
        await loadInvitations();
        if (onInvitationResponded) {
          onInvitationResponded();
        }
      } else {
        throw new Error(response.error || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      Alert.alert('Error', error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (invitation: CompanyMember) => {
    Alert.alert(
      'Reject Invitation',
      `Are you sure you want to reject the invitation from ${invitation.company?.name || 'this company'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(invitation.company_id);
              const response = await rejectInvitation(invitation.company_id, invitation.user_id);
              
              if (response.success) {
                Alert.alert('Success', 'Invitation rejected');
                await loadInvitations();
                if (onInvitationResponded) {
                  onInvitationResponded();
                }
              } else {
                throw new Error(response.error || 'Failed to reject invitation');
              }
            } catch (error: any) {
              console.error('Failed to reject invitation:', error);
              Alert.alert('Error', error.message || 'Failed to reject invitation. Please try again.');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Invitations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : invitations.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="mail-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No pending invitations</Text>
            <Text style={styles.emptySubtext}>
              You'll see company invitations here when you receive them
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list}>
            {invitations.map((invitation) => (
              <View key={`${invitation.company_id}-${invitation.user_id}`} style={styles.invitationCard}>
                {/* Company Info */}
                <View style={styles.companySection}>
                  {invitation.company?.logo_url ? (
                    <Image
                      source={{ uri: invitation.company.logo_url }}
                      style={styles.companyLogo}
                    />
                  ) : (
                    <View style={[styles.companyLogo, styles.companyLogoPlaceholder]}>
                      <Text style={styles.companyLogoText}>
                        {(invitation.company?.name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>
                      {invitation.company?.name || 'Unknown Company'}
                    </Text>
                    <Text style={styles.companySubcategory}>
                      {invitation.company?.subcategory?.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.invitedDate}>
                      Invited {formatTime(invitation.invited_at)} • Role: {invitation.role}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(invitation)}
                    disabled={processing === invitation.company_id}
                  >
                    {processing === invitation.company_id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(invitation)}
                    disabled={processing === invitation.company_id}
                  >
                    {processing === invitation.company_id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  invitationCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  companySection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  companyLogoPlaceholder: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  companySubcategory: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  invitedDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#3b82f6',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InvitationListModal;

