import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { rateLimiter } from '../utils/rateLimiter';
import { spacing, semanticSpacing } from '../constants/spacing';

interface AccountSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCompany?: () => void;
  onNavigate?: (page: string, data?: any) => void;
}

const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  visible,
  onClose,
  onCreateCompany,
  onNavigate,
}) => {
  const {
    user,
    activeCompany,
    currentProfileType,
    switchToUserProfile,
    switchToCompanyProfile,
    getUserCompanies,
  } = useApi();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const getCompanyData = (company: any) => {
    // Handle different API response structures:
    // 1. company.company (most common from getUserCompanies)
    // 2. company.companies (alternative structure)
    // 3. company itself (if already the company object)
    return company.company || company.companies || company;
  };

  useEffect(() => {
    if (visible && user?.id) {
      loadCompanies();
    }
  }, [visible, user?.id]);

  const loadCompanies = async (forceRefresh = false) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        const cacheKey = `user-companies-${user.id}`;
        await rateLimiter.clearCache(cacheKey);
        console.log('🔄 Force refresh: Cleared cache for user companies');
      }
      
      const response = await getUserCompanies(user.id);
      if (response.success && response.data) {
        const companiesList = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        
        // Debug: Log all companies and their approval status
        console.log(`📊 Loaded ${companiesList.length} companies from getUserCompanies`);
        companiesList.forEach((company: any, index: number) => {
          const companyData = getCompanyData(company);
          const approvalStatus = companyData?.approval_status || company.approval_status || 'unknown';
          console.log(`  Company ${index + 1}: ${companyData?.name || 'Unknown'} - Approval Status: ${approvalStatus}`);
        });
        
        // Filter to only show companies where user is owner
        // IMPORTANT: Do NOT filter by approval_status - show all owned companies including pending ones
        // Check multiple ways: role field, owner.id, or company.owner.id
        const ownedCompanies = companiesList.filter((company: any) => {
          const companyData = getCompanyData(company);
          const role = company.role || company.member?.role || company.company_member?.role;
          const isOwnerByRole = role === 'owner';
          const isOwnerById = companyData?.owner?.id === user.id;
          const isOwnerByCompanyOwner = (companyData as any)?.owner_id === user.id;
          
          // Show company if user is owner by any method (regardless of approval_status)
          const isOwner = isOwnerByRole || isOwnerById || isOwnerByCompanyOwner;
          
          if (isOwner) {
            const approvalStatus = companyData?.approval_status || company.approval_status;
            console.log(`✅ Including company "${companyData?.name || 'Unknown'}" (owner) - Approval: ${approvalStatus || 'unknown'}`);
          }
          
          return isOwner;
        });
        
        console.log(`✅ Filtered to ${ownedCompanies.length} owned companies (including pending)`);
        setCompanies(ownedCompanies);
      } else {
        console.warn('⚠️ getUserCompanies returned no data:', response);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToUser = async () => {
    try {
      setSwitching('user');
      if (currentProfileType !== 'user') {
        await switchToUserProfile();
      }
      // Navigate to profile page
      if (onNavigate) {
        onNavigate('myProfile');
      }
      onClose();
    } catch (error) {
      console.error('Failed to switch to user profile:', error);
    } finally {
      setSwitching(null);
    }
  };

  const handleSwitchToCompany = async (companyId: string) => {
    if (activeCompany?.id === companyId) {
      onClose();
      return;
    }
    try {
      setSwitching(companyId);
      await switchToCompanyProfile(companyId);
      // Navigate to company profile page after switching
      if (onNavigate) {
        onNavigate('companyProfile', { companyId });
      }
      onClose();
    } catch (error) {
      console.error('Failed to switch to company:', error);
    } finally {
      setSwitching(null);
    }
  };

  const getCompanyId = (company: any) => {
    const data = getCompanyData(company);
    return data.id || company.company_id || company.id;
  };

  const getCompanyName = (company: any) => {
    const data = getCompanyData(company);
    // Try multiple possible fields for company name
    return data.name || company.name || company.company_name || data.company_name || 'Unnamed Company';
  };

  const getCompanyImage = (company: any) => {
    const data = getCompanyData(company);
    // Try multiple possible fields for company logo/image
    return data.logo_url || data.logo || data.image_url || data.avatar_url || company.logo_url || company.logo;
  };

  const getCompanyApprovalStatus = (company: any) => {
    const data = getCompanyData(company);
    return data?.approval_status || company.approval_status;
  };

  const getApprovalStatusColor = (status?: string): string => {
    switch (status) {
      case 'approved':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      case 'suspended':
        return '#ef4444';
      case 'draft':
        return '#6b7280';
      default:
        return '#71717a';
    }
  };

  const getApprovalStatusLabel = (status?: string): string => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending Approval';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      case 'draft':
        return 'Draft';
      default:
        return '';
    }
  };

  const isActiveCompany = (company: any) => {
    return currentProfileType === 'company' && activeCompany?.id === getCompanyId(company);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Switch Account</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={() => loadCompanies(true)} 
                style={styles.refreshButton}
                disabled={loading}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={loading ? "#9ca3af" : "#000"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* User Profile Option */}
            <TouchableOpacity
              style={[
                styles.accountItem,
                currentProfileType === 'user' && styles.activeAccountItem,
              ]}
              onPress={handleSwitchToUser}
              disabled={switching !== null}
            >
              <View style={styles.accountLeft}>
                <View style={[styles.avatar, styles.userAvatar]}>
                  {user?.image_url ? (
                    <Image
                      source={{ uri: user.image_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={24} color="#fff" />
                  )}
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{user?.name || 'Personal'}</Text>
                  <Text style={styles.accountType}>Personal Account</Text>
                </View>
              </View>
              {currentProfileType === 'user' && (
                <Ionicons name="checkmark-circle" size={24} color="#000" />
              )}
              {switching === 'user' && (
                <ActivityIndicator size="small" color="#000" />
              )}
            </TouchableOpacity>

            {/* Companies List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : companies.length > 0 ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Companies</Text>
                {companies.map((company) => {
                  const companyId = getCompanyId(company);
                  const companyName = getCompanyName(company);
                  const companyImage = getCompanyImage(company);
                  const isActive = isActiveCompany(company);
                  const approvalStatus = getCompanyApprovalStatus(company);
                  const approvalStatusLabel = getApprovalStatusLabel(approvalStatus);
                  const approvalStatusColor = getApprovalStatusColor(approvalStatus);
                  
                  // Debug logging
                  if (companyName === 'Unnamed Company') {
                    console.log('⚠️ Company name not found for company:', companyId, 'Raw data:', company);
                  }

                  return (
                    <TouchableOpacity
                      key={companyId}
                      style={[
                        styles.accountItem,
                        isActive && styles.activeAccountItem,
                      ]}
                      onPress={() => handleSwitchToCompany(companyId)}
                      disabled={switching !== null}
                    >
                      <View style={styles.accountLeft}>
                        <View style={[styles.avatar, styles.companyAvatar]}>
                          {companyImage ? (
                            <Image
                              source={{ uri: companyImage }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Ionicons name="business" size={24} color="#fff" />
                          )}
                        </View>
                        <View style={styles.accountInfo}>
                          <Text style={styles.accountName}>{companyName}</Text>
                          <View style={styles.accountTypeRow}>
                            <Text style={styles.accountType}>Company</Text>
                            {approvalStatus && approvalStatus !== 'approved' && (
                              <View style={[styles.approvalBadge, { backgroundColor: approvalStatusColor + '20' }]}>
                                <View style={[styles.approvalDot, { backgroundColor: approvalStatusColor }]} />
                                <Text style={[styles.approvalText, { color: approvalStatusColor }]}>
                                  {approvalStatusLabel}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={24} color="#000" />
                      )}
                      {switching === companyId && (
                        <ActivityIndicator size="small" color="#000" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {/* Create Company Option */}
            {onCreateCompany && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => {
                    onClose();
                    onCreateCompany();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#000" />
                  <Text style={styles.createButtonText}>Create Company</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.xl,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  activeAccountItem: {
    backgroundColor: '#f5f5f5',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatar: {
    backgroundColor: '#6366f1',
  },
  companyAvatar: {
    backgroundColor: '#8b5cf6',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  accountType: {
    fontSize: 14,
    color: '#71717a',
  },
  accountTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  approvalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  approvalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 12,
  },
});

export default AccountSwitcherModal;

