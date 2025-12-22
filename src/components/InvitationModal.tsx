import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Company, CompanyMemberRole } from '../types';

interface InvitationModalProps {
  visible: boolean;
  onClose: () => void;
  company: Company;
  onInvitationSent?: () => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({
  visible,
  onClose,
  company,
  onInvitationSent,
}) => {
  const { api, addCompanyMember, getUsersDirect } = useApi();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<CompanyMemberRole>('member');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const roles: { value: CompanyMemberRole; label: string }[] = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'member', label: 'Member' },
  ];

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  // Search users using getUsersDirect when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setFilteredUsers([]);
        return;
      }

      try {
        setSearching(true);
        console.log('🔍 Searching for users with query:', searchQuery);
        
        // Use getUsersDirect which properly handles search with 'q' parameter
        const response = await getUsersDirect({
          search: searchQuery,
          limit: 20,
          page: 1,
        });

        console.log('📥 Search response:', response);

        // Handle different response structures
        let usersArray: any[] = [];
        
        if (response && response.success !== false) {
          // Response might be: { success: true, data: [...] } or { data: [...] } or just [...]
          if (Array.isArray(response)) {
            usersArray = response;
          } else if (response.data) {
            if (Array.isArray(response.data)) {
              usersArray = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              usersArray = response.data.data;
            }
          }
        }

        console.log('👥 Found users:', usersArray.length);
        setFilteredUsers(usersArray.slice(0, 10)); // Limit to 10 results for display
      } catch (error) {
        console.error('❌ Failed to search users with getUsersDirect:', error);
        // Fallback to API client if direct fetch fails
        try {
          console.log('🔄 Trying fallback API client search...');
          const fallbackResponse = await api.getUsers({
            q: searchQuery,
            limit: 20,
          });
          console.log('📥 Fallback response:', fallbackResponse);
          
          if (fallbackResponse && fallbackResponse.success !== false) {
            let usersArray: any[] = [];
            if (Array.isArray(fallbackResponse.data)) {
              usersArray = fallbackResponse.data;
            } else if (fallbackResponse.data?.data && Array.isArray(fallbackResponse.data.data)) {
              usersArray = fallbackResponse.data.data;
            }
            console.log('👥 Found users (fallback):', usersArray.length);
            setFilteredUsers(usersArray.slice(0, 10));
          } else {
            console.warn('⚠️ Fallback search returned no results');
            setFilteredUsers([]);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback search also failed:', fallbackError);
          setFilteredUsers([]);
        }
      } finally {
        setSearching(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, getUsersDirect, api]);

  const resetForm = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setSelectedRole('member');
    setFilteredUsers([]);
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(user.name || user.email);
    setFilteredUsers([]);
  };

  const handleSendInvitation = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to invite');
      return;
    }

    try {
      setSending(true);
      console.log('📤 Sending invitation:', {
        companyId: company.id,
        userId: selectedUser.id,
        role: selectedRole,
        userName: selectedUser.name || selectedUser.email,
      });
      
      const response = await addCompanyMember(company.id, {
        user_id: selectedUser.id,
        role: selectedRole,
      });

      console.log('📥 Invitation response:', {
        success: response.success,
        data: response.data,
        error: response.error,
        fullResponse: JSON.stringify(response, null, 2),
      });

      if (response.success) {
        // Check if the response includes invitation status
        const invitationStatus = response.data?.invitation_status || response.data?.data?.invitation_status;
        console.log('📋 Invitation status from backend:', invitationStatus);
        
        if (invitationStatus === 'accepted') {
          Alert.alert(
            'Member Added',
            `${selectedUser.name || selectedUser.email} was immediately added as a member (not pending).`
          );
        } else {
        Alert.alert('Success', `Invitation sent to ${selectedUser.name || selectedUser.email}`);
        }
        
        resetForm();
        // Call callback BEFORE closing to ensure refresh happens
        // Add a small delay to ensure backend has processed the request
        setTimeout(() => {
          if (onInvitationSent) {
            onInvitationSent();
          }
        }, 1000); // Increased delay to ensure backend processes
        onClose();
      } else {
        console.error('❌ Invitation failed:', {
          success: response.success,
          error: response.error,
          fullResponse: response,
        });
        throw new Error(response.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('❌ Failed to send invitation:', error);
      console.error('❌ Error details:', {
        message: error.message,
        error: error.error,
        response: error.response,
        stack: error.stack,
      });
      
      // Handle duplicate key error (member was previously removed but record still exists)
      const errorMessage = error.message || error.error || '';
      if (errorMessage.includes('duplicate key') || errorMessage.includes('company_members_pkey')) {
        Alert.alert(
          'Member Already Exists',
          'This user was previously a member. The backend may need to restore their membership. Please contact support or try again in a moment.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          'Error', 
          errorMessage || 'Failed to send invitation. Please try again.\n\nCheck the console logs for more details.'
        );
      }
    } finally {
      setSending(false);
    }
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
          <Text style={styles.headerTitle}>Invite Member</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Company Info */}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySubcategory}>
              {company.subcategory?.replace(/_/g, ' ')}
            </Text>
          </View>

          {/* User Search */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select User</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Selected User */}
            {selectedUser && (
              <View style={styles.selectedUserContainer}>
                <View style={styles.selectedUserInfo}>
                  {selectedUser.image_url ? (
                    <Image
                      source={{ uri: selectedUser.image_url }}
                      style={styles.userAvatar}
                    />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                      <Text style={styles.userAvatarText}>
                        {(selectedUser.name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {selectedUser.name || selectedUser.email || 'Unknown User'}
                    </Text>
                    {selectedUser.primary_role && (
                      <Text style={styles.userRole}>
                        {selectedUser.primary_role.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Search Results */}
            {searching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchQuery.trim() && filteredUsers.length === 0 && !selectedUser ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No users found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : filteredUsers.length > 0 && !selectedUser ? (
              <View style={styles.resultsContainer}>
                {filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userItem}
                    onPress={() => handleSelectUser(user)}
                  >
                    {user.image_url ? (
                      <Image source={{ uri: user.image_url }} style={styles.userItemAvatar} />
                    ) : (
                      <View style={[styles.userItemAvatar, styles.userItemAvatarPlaceholder]}>
                        <Text style={styles.userItemAvatarText}>
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userItemInfo}>
                      <Text style={styles.userItemName}>
                        {user.name || user.email || 'Unknown User'}
                      </Text>
                      {user.primary_role && (
                        <Text style={styles.userItemRole}>
                          {user.primary_role.replace(/_/g, ' ')}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role</Text>
            <View style={styles.roleContainer}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleButton,
                    selectedRole === role.value && styles.roleButtonActive,
                  ]}
                  onPress={() => setSelectedRole(role.value)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === role.value && styles.roleButtonTextActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, (!selectedUser || sending) && styles.sendButtonDisabled]}
            onPress={handleSendInvitation}
            disabled={!selectedUser || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#ffffff" />
                <Text style={styles.sendButtonText}>Send Invitation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  companyInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  selectedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  resultsContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userItemAvatarPlaceholder: {
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItemAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userItemRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InvitationModal;

