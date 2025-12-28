import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../navigation/types';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useApi } from '../contexts/ApiContext';
import { Company, CompanyMember, CompanyMemberRole, InvitationStatus } from '../types';
import InvitationModal from '../components/InvitationModal';

interface CompanyMembersManagementPageProps {
  company?: Company;
  currentUserId?: string;
  currentUserRole?: CompanyMemberRole;
  onBack?: () => void;
  showInviteModal?: boolean;
}

type TabType = 'active' | 'pending';

const CompanyMembersManagementPage: React.FC<CompanyMembersManagementPageProps> = ({
  company: companyProp,
  currentUserId: currentUserIdProp,
  currentUserRole: currentUserRoleProp,
  onBack: onBackProp,
  showInviteModal: showInviteModalProp,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'companyMembersManagement'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  const { goBack } = useAppNavigation();
  
  // Use props if provided (for backward compatibility), otherwise use route params or hooks
  const onBack = onBackProp || goBack;
  
  // Get company from props or route params
  const company = companyProp || routeParams?.company;
  const currentUserId = currentUserIdProp || routeParams?.currentUserId || user?.id || '';
  const showInviteModalInitial = showInviteModalProp || routeParams?.showInviteModal || false;
  
  const {
    getCompany,
    user,
    getCompanyMembers,
    getPendingCompanyMembers,
    addCompanyMember,
    removeCompanyMember,
    updateCompanyMemberRole,
    cancelInvitation,
    getUsersDirect,
    api,
  } = useApi();
  
  // Determine user role from props, route params, or by checking members
  const [currentUserRole, setCurrentUserRole] = useState<CompanyMemberRole>(
    currentUserRoleProp || routeParams?.currentUserRole || 'member'
  );
  
  // Fetch company if only companyId is provided
  const [companyData, setCompanyData] = useState<Company | null>(company || null);
  
  useEffect(() => {
    if (!companyData && routeParams?.companyId) {
      // Fetch company by ID
      getCompany(routeParams.companyId).then(response => {
        if (response.success && response.data) {
          setCompanyData(response.data as Company);
        }
      });
    } else if (company) {
      setCompanyData(company);
    }
  }, [company, routeParams?.companyId]);
  
  // Determine user role from members if not provided
  useEffect(() => {
    if (companyData && currentUserRole === 'member' && user?.id) {
      getCompanyMembers(companyData.id, { page: 1, limit: 100 }).then(response => {
        if (response.success && response.data) {
          const membersArray = Array.isArray(response.data)
            ? response.data
            : response.data?.data || [];
          const userMember = membersArray.find((m: CompanyMember) => m.user_id === user.id);
          if (userMember) {
            setCurrentUserRole(userMember.role);
          } else if (companyData.owner?.id === user.id) {
            setCurrentUserRole('owner');
          }
        }
      });
    }
  }, [companyData, user?.id]);
  
  // Set initial invite modal state
  useEffect(() => {
    if (showInviteModalInitial) {
      setShowInviteModal(true);
    }
  }, [showInviteModalInitial]);

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeMembers, setActiveMembers] = useState<CompanyMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(showInviteModalInitial);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CompanyMemberRole>('member');

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;
  const canManage = isAdmin; // Only admins and owners can manage
  
  // Use companyData instead of company
  const activeCompany = companyData;

  const roles: { value: CompanyMemberRole; label: string; description: string }[] = [
    { value: 'owner', label: 'Owner', description: 'Full control of the company' },
    { value: 'admin', label: 'Admin', description: 'Can manage users and content' },
    { value: 'manager', label: 'Manager', description: 'Can manage specific areas' },
    { value: 'member', label: 'Member', description: 'Basic access' },
  ];

  useEffect(() => {
    if (activeCompany?.id) {
      loadMembers();
    }
  }, [activeCompany?.id, activeTab]);

  const loadMembers = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      
      if (!activeCompany?.id) return;
      
      // Clear cache if forcing refresh
      if (forceRefresh) {
        try {
          const { rateLimiter } = await import('../utils/rateLimiter');
          await rateLimiter.clearCacheByPattern(`company-members-${activeCompany.id}`);
          await rateLimiter.clearCacheByPattern(`company-pending-members-${activeCompany.id}`);
        } catch (err) {
          console.warn('⚠️ Could not clear cache:', err);
        }
      }
      
      // Load active members and pending members in parallel
      const [activeResponse, pendingResponse] = await Promise.all([
        // Load active members (accepted invitations)
        getCompanyMembers(activeCompany.id, {
          page: 1,
          limit: 100,
          sort: 'joined_at',
          order: 'desc',
        }),
        // Load pending members using the new dedicated method
        getPendingCompanyMembers(activeCompany.id, {
          page: 1,
          limit: 100,
          sort: 'created_at',
          order: 'desc',
        }),
      ]);

      // Removed verbose logging to prevent rate limiting

      // Process active members
      if (activeResponse.success && activeResponse.data) {
        const membersArray = Array.isArray(activeResponse.data)
          ? activeResponse.data
          : activeResponse.data.data || activeResponse.data.members || [];

        // Filter for accepted members only
        const accepted = membersArray.filter((m: CompanyMember) => {
          const hasAcceptedStatus = m.invitation_status === 'accepted';
          const hasAcceptedAt = !!m.accepted_at;
          const isNotDeleted = !m.deleted_at;
          return (hasAcceptedStatus || hasAcceptedAt) && isNotDeleted;
        });

        // Active members loaded
        setActiveMembers(accepted);
        } else {
          setActiveMembers([]);
        }

      // Process pending members
      if (pendingResponse.success && pendingResponse.data) {
        // The API returns data as an array directly in response.data, not response.data.data
        // Check if data is an array or if it's nested in a data property
        let pendingData: CompanyMember[] = [];
        
        if (Array.isArray(pendingResponse.data)) {
          // Data is directly an array
          pendingData = pendingResponse.data;
        } else if (pendingResponse.data.data && Array.isArray(pendingResponse.data.data)) {
          // Data is nested in a data property
          pendingData = pendingResponse.data.data;
        } else {
          // Fallback: try to extract from any structure
          pendingData = [];
        }

        // Set the pending invitations
        setPendingInvitations(pendingData);
      } else {
        // If the new endpoint is not available (404) or unauthorized (403), 
        // fall back to filtering from getCompanyMembers
        
        if (activeResponse.success && activeResponse.data) {
          const membersArray = Array.isArray(activeResponse.data)
            ? activeResponse.data
            : activeResponse.data.data || activeResponse.data.members || [];

          const pending = membersArray.filter((m: CompanyMember) => {
            const hasPendingStatus = m.invitation_status === 'pending';
            const hasNoAcceptedAt = !m.accepted_at;
            const hasNoRejectedAt = !m.rejected_at;
            const isNotDeleted = !m.deleted_at;
            return (hasPendingStatus || (!m.invitation_status && hasNoAcceptedAt && hasNoRejectedAt)) && isNotDeleted;
          });

          // Fallback: Pending members filtered
          setPendingInvitations(pending);
        } else {
          setPendingInvitations([]);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load members:', error);
      Alert.alert('Error', 'Failed to load members. Please try again.');
      setActiveMembers([]);
      setPendingInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!canManage) {
      Alert.alert('Permission Denied', 'Only admins and owners can remove members.');
      return;
    }

    if (member.role === 'owner') {
      Alert.alert('Cannot Remove', 'Owners cannot be removed.');
      return;
    }

    if (member.user_id === currentUserId) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name || 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(member.user_id);
              if (!activeCompany?.id) return;
              const response = await removeCompanyMember(activeCompany.id, member.user_id);
              if (response.success) {
                Alert.alert('Success', 'Member removed successfully.');
                await loadMembers();
              } else {
                throw new Error(response.error || 'Failed to remove member');
              }
            } catch (error: any) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', error.message || 'Failed to remove member. Please try again.');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelInvitation = async (invitation: CompanyMember) => {
    if (!canManage) {
      Alert.alert('Permission Denied', 'Only admins and owners can cancel invitations.');
      return;
    }

    Alert.alert(
      'Cancel Invitation',
      `Are you sure you want to cancel the invitation for ${invitation.user?.name || invitation.user?.email || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel Invitation',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(invitation.user_id);
              // Use the dedicated cancelInvitation method instead of removeCompanyMember
              if (!activeCompany?.id) return;
              const response = await cancelInvitation(activeCompany.id, invitation.user_id);
              if (response.success) {
                Alert.alert('Success', 'Invitation canceled successfully.');
                await loadMembers(true); // Force refresh to update the list
              } else {
                throw new Error(response.error || 'Failed to cancel invitation');
              }
            } catch (error: any) {
              console.error('Failed to cancel invitation:', error);
              Alert.alert('Error', error.message || 'Failed to cancel invitation. Please try again.');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleEditRole = (member: CompanyMember) => {
    if (!canManage) {
      Alert.alert('Permission Denied', 'Only admins and owners can edit roles.');
      return;
    }

    if (member.role === 'owner' && !isOwner) {
      Alert.alert('Permission Denied', 'Only owners can edit owner roles.');
      return;
    }

    if (member.user_id === currentUserId && member.role === 'owner') {
      Alert.alert('Cannot Edit', 'You cannot change your own owner role.');
      return;
    }

    setEditingMember(member);
    setSelectedRole(member.role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!editingMember) return;

    if (selectedRole === editingMember.role) {
      setShowRoleModal(false);
      setEditingMember(null);
      return;
    }

    // Prevent non-owners from assigning owner role
    if (selectedRole === 'owner' && !isOwner) {
      Alert.alert('Permission Denied', 'Only owners can assign owner role.');
      return;
    }

    try {
      if (!activeCompany?.id) return;
      setProcessing(editingMember.user_id);
      const response = await updateCompanyMemberRole(
        activeCompany.id,
        editingMember.user_id,
        selectedRole
      );

      if (response.success) {
        Alert.alert('Success', 'Role updated successfully.');
        setShowRoleModal(false);
        setEditingMember(null);
        await loadMembers();
      } else {
        throw new Error(response.error || 'Failed to update role');
      }
    } catch (error: any) {
      console.error('Failed to update role:', error);
      Alert.alert('Error', error.message || 'Failed to update role. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getRoleBadgeColor = (role: CompanyMemberRole): string => {
    switch (role) {
      case 'owner':
        return '#ef4444';
      case 'admin':
        return '#3b82f6';
      case 'manager':
        return '#10b981';
      case 'member':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderMemberCard = (member: CompanyMember, isPending: boolean = false) => {
    const isProcessing = processing === member.user_id;
    const canEditThisMember = canManage && member.role !== 'owner' && member.user_id !== currentUserId;
    const canRemoveThisMember = canManage && member.role !== 'owner' && member.user_id !== currentUserId;

    return (
      <View key={member.user_id} style={styles.memberCard}>
        <View style={styles.memberInfoRow}>
          <View style={styles.memberAvatar}>
            {member.user?.image_url ? (
              <Image
                source={{ uri: member.user.image_url }}
                style={styles.memberAvatarImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.memberAvatarPlaceholder}>
                <Text style={styles.memberAvatarText}>
                  {member.user?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.user?.name || 'Unknown User'}</Text>
            {member.user?.email && (
              <Text style={styles.memberEmail}>{member.user.email}</Text>
            )}
            {member.user?.primary_role && (
              <Text style={styles.memberSpecialty}>
                {member.user.primary_role.replace(/_/g, ' ')}
              </Text>
            )}

            <View style={styles.memberMeta}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(member.role) + '20' }]}>
                <View style={[styles.roleDot, { backgroundColor: getRoleBadgeColor(member.role) }]} />
                <Text style={[styles.roleText, { color: getRoleBadgeColor(member.role) }]}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
              </View>

              {isPending ? (
                <Text style={styles.pendingBadge}>Pending</Text>
              ) : (
                <Text style={styles.dateText}>
                  Joined {formatDate(member.joined_at || member.accepted_at || member.created_at)}
                </Text>
              )}
            </View>

            {isPending && (
              <Text style={styles.invitedText}>
                Invited {formatDate(member.invited_at)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.memberActions}>
          {canEditThisMember && !isPending && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditRole(member)}
              disabled={isProcessing}
            >
              <Ionicons name="create-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}

          {isPending ? (
            canManage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => handleCancelInvitation(member)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                )}
              </TouchableOpacity>
            )
          ) : (
            canRemoveThisMember && (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => handleRemoveMember(member)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                )}
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    );
  };

  // Show loading if company is not yet loaded
  if (!activeCompany) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Members</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#71717a' }}>Loading company data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadMembers(true)}
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={loading ? "#9ca3af" : "#3b82f6"} 
            />
          </TouchableOpacity>
          {canManage && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add" size={24} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Members ({activeMembers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        ) : activeTab === 'active' ? (
          activeMembers.length > 0 ? (
            activeMembers.map((member) => renderMemberCard(member, false))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No active members yet</Text>
              {canManage && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Text style={styles.emptyStateButtonText}>Invite Members</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        ) : pendingInvitations.length > 0 ? (
          pendingInvitations.map((invitation) => renderMemberCard(invitation, true))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No pending invitations</Text>
            <Text style={styles.emptyStateSubtext}>
              All invitations have been processed. New invitations will appear here once sent.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Invitation Modal */}
      {showInviteModal && activeCompany && (
        <InvitationModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          company={activeCompany}
          onInvitationSent={async () => {
            // Clear cache and reload members after invitation is sent
            setShowInviteModal(false);
            // Small delay to ensure backend has processed, then force refresh
            setTimeout(() => {
              loadMembers(true);
            }, 1000);
          }}
        />
      )}

      {/* Role Edit Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {editingMember?.user?.name || 'User'}
            </Text>

            <ScrollView style={styles.rolesList}>
              {roles
                .filter((role) => role.value !== 'owner' || isOwner)
                .map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      selectedRole === role.value && styles.roleOptionSelected,
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                  >
                    <View style={styles.roleOptionContent}>
                      <Text style={styles.roleOptionLabel}>{role.label}</Text>
                      <Text style={styles.roleOptionDescription}>{role.description}</Text>
                    </View>
                    {selectedRole === role.value && (
                      <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveRole}
                disabled={processing === editingMember?.user_id}
              >
                {processing === editingMember?.user_id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  inviteButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 12,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  memberSpecialty: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  invitedText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  editButton: {},
  removeButton: {},
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyStateButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 16,
  },
  rolesList: {
    paddingHorizontal: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  roleOptionContent: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  roleOptionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CompanyMembersManagementPage;

