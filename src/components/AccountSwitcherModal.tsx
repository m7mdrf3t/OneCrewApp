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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
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
  onNavigate: onNavigateProp,
}) => {
  const { navigateTo, replaceTo } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  // For profile switching, use replaceTo to prevent back navigation to previous profile
  const onNavigate = onNavigateProp || navigateTo;

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
      // OPTIMIZED: Only fetch if companies list is empty or user changed
      // Prevents unnecessary fetches when modal is reopened
      if (companies.length === 0) {
        loadCompanies();
      } else {
        // Verify companies belong to current user (in case user changed)
        const belongsToUser = companies.some(c => {
          const companyData = getCompanyData(c);
          const role = c.role || c.member?.role || c.company_member?.role;
          return role === 'owner' || role === 'admin' || 
                 companyData?.owner?.id === user.id ||
                 (companyData as any)?.owner_id === user.id;
        });
        
        if (!belongsToUser) {
          // User changed, need to reload
          console.log('🔄 [AccountSwitcherModal] User changed, reloading companies...');
          loadCompanies();
        } else {
          console.log('✅ [AccountSwitcherModal] Companies already loaded, skipping fetch');
        }
      }
    }
  }, [visible, user?.id]); // Note: companies.length not in deps to avoid infinite loop

  const loadCompanies = async (forceRefresh = false) => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      // Use forceRefresh parameter to bypass cache
      const response = await getUserCompanies(user.id, forceRefresh);
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
        
        // Filter to show companies where user is owner or admin
        // IMPORTANT: Do NOT filter by approval_status - show all companies including pending ones
        // Check multiple ways: role field, owner.id, or company.owner.id
        const accessibleCompanies = companiesList.filter((company: any) => {
          const companyData = getCompanyData(company);
          const role = company.role || company.member?.role || company.company_member?.role;
          const isOwnerByRole = role === 'owner';
          const isAdminByRole = role === 'admin';
          const isOwnerById = companyData?.owner?.id === user.id;
          const isOwnerByCompanyOwner = (companyData as any)?.owner_id === user.id;
          
          // Show company if user is owner or admin by any method (regardless of approval_status)
          const isOwner = isOwnerByRole || isOwnerById || isOwnerByCompanyOwner;
          const isAdmin = isAdminByRole;
          const hasAccess = isOwner || isAdmin;
          
          if (hasAccess) {
            const approvalStatus = companyData?.approval_status || company.approval_status;
            const roleLabel = isOwner ? 'owner' : 'admin';
            console.log(`✅ Including company "${companyData?.name || 'Unknown'}" (${roleLabel}) - Approval: ${approvalStatus || 'unknown'}`);
          }
          
          return hasAccess;
        });
        
        console.log(`✅ Filtered to ${accessibleCompanies.length} accessible companies (owner/admin, including pending)`);
        setCompanies(accessibleCompanies);
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
      // Replace current screen instead of navigating to prevent back navigation to previous profile
      if (onNavigateProp) {
        // If custom navigate function provided, use it (but ideally should also use replace)
        onNavigateProp('myProfile');
      } else {
        replaceTo('myProfile');
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
      
      // Verify switch was successful before navigating
      // Wait a bit for state to update (state updates are async)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Replace current screen instead of navigating to prevent back navigation to previous profile
      // Note: switchToCompanyProfile handles errors gracefully, so if it completes without throwing,
      // the switch was successful (even if StreamChat connection failed)
      if (onNavigateProp) {
        // If custom navigate function provided, use it (but ideally should also use replace)
        onNavigateProp('companyProfile', { companyId });
      } else {
        replaceTo('companyProfile', { companyId });
      }
      onClose();
    } catch (error: any) {
      // Error is already handled in switchToCompanyProfile, just log
      console.warn('⚠️ Failed to switch to company:', error?.message || error);
    } finally {
      // CRITICAL: Always clear loading state, even if switch failed
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
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Switch Account</Text>
              <Text style={styles.headerSubtitle}>Select an account to continue</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => loadCompanies(true)} 
                style={[styles.iconButton, loading && styles.iconButtonDisabled]}
                disabled={loading}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={loading ? "#9ca3af" : "#6b7280"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* User Profile Option */}
            <TouchableOpacity
              style={[
                styles.accountCard,
                currentProfileType === 'user' && styles.activeAccountCard,
              ]}
              onPress={handleSwitchToUser}
              disabled={switching !== null}
              activeOpacity={0.7}
            >
              <View style={styles.accountContent}>
                <View style={[styles.avatarContainer, styles.userAvatarContainer]}>
                  {user?.image_url ? (
                    <Image
                      source={{ uri: user.image_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={26} color="#fff" />
                    </View>
                  )}
                  {currentProfileType === 'user' && (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName}>{user?.name || 'Personal'}</Text>
                  <Text style={styles.accountType}>Personal Account</Text>
                </View>
                {switching === 'user' ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : currentProfileType === 'user' ? (
                  <View style={styles.activeIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                )}
              </View>
            </TouchableOpacity>

            {/* Companies List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadingText}>Loading companies...</Text>
              </View>
            ) : companies.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionTitle}>Your Companies & Academies</Text>
                  <View style={styles.sectionDivider} />
                </View>
                {companies.map((company, index) => {
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
                        styles.accountCard,
                        isActive && styles.activeAccountCard,
                        index === companies.length - 1 && styles.lastCard,
                      ]}
                      onPress={() => handleSwitchToCompany(companyId)}
                      disabled={switching !== null}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accountContent}>
                        <View style={[styles.avatarContainer, styles.companyAvatarContainer]}>
                          {companyImage ? (
                            <Image
                              source={{ uri: companyImage }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <View style={styles.avatarPlaceholder}>
                              <Ionicons name="business" size={26} color="#fff" />
                            </View>
                          )}
                          {isActive && (
                            <View style={styles.activeBadge}>
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                          )}
                        </View>
                        <View style={styles.accountDetails}>
                          <Text style={styles.accountName}>{companyName}</Text>
                          <View style={styles.accountMeta}>
                            <Text style={styles.accountType}>Company</Text>
                            {approvalStatus && approvalStatus !== 'approved' && (
                              <View style={[styles.statusBadge, { backgroundColor: approvalStatusColor + '15' }]}>
                                <View style={[styles.statusDot, { backgroundColor: approvalStatusColor }]} />
                                <Text style={[styles.statusText, { color: approvalStatusColor }]}>
                                  {approvalStatusLabel}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {switching === companyId ? (
                          <ActivityIndicator size="small" color="#6366f1" />
                        ) : isActive ? (
                          <View style={styles.activeIndicator}>
                            <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {/* Create Company Option */}
            {onCreateCompany && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDivider} />
                </View>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => {
                    onClose();
                    onCreateCompany();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.createButtonIcon}>
                    <Ionicons name="add" size={24} color="#6366f1" />
                  </View>
                  <Text style={styles.createButtonText}>Create New Company</Text>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Dimensions.get('window').height * 0.85,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeAccountCard: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f4ff',
  },
  lastCard: {
    marginBottom: 0,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  userAvatarContainer: {
    backgroundColor: '#6366f1',
  },
  companyAvatarContainer: {
    backgroundColor: '#8b5cf6',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  accountType: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  activeIndicator: {
    marginLeft: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    marginTop: spacing.lg,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginHorizontal: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  createButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  createButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    letterSpacing: -0.2,
  },
});

export default AccountSwitcherModal;

