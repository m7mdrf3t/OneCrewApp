import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import {
  Company,
  CompanyMember,
  CompanyService,
  CompanyMemberRole,
  CompanyApprovalStatus,
  UserCertification,
} from '../types';
import GrantCertificationModal from '../components/GrantCertificationModal';
import CertificationCard from '../components/CertificationCard';

interface CompanyProfilePageProps {
  companyId: string;
  onBack: () => void;
  onEdit?: (company: Company) => void;
  onManageMembers?: (company: Company) => void;
  onManageServices?: (company: Company) => void;
  onInviteMember?: (company: Company) => void;
  refreshTrigger?: number;
}

const CompanyProfilePage: React.FC<CompanyProfilePageProps> = ({
  companyId,
  onBack,
  onEdit,
  onManageMembers,
  onManageServices,
  onInviteMember,
  refreshTrigger,
}) => {
  const {
    getCompany,
    getCompanyMembers,
    getCompanyServices,
    user,
    activeCompany,
    currentProfileType,
    getCompanyCertifications,
    getAuthorizedCertifications,
    removeCompanyMember,
    grantCertification,
  } = useApi();

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [services, setServices] = useState<CompanyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'services' | 'members' | 'certifications' | null>(null);
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);
  const [showGrantCertificationModal, setShowGrantCertificationModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [selectedUserIdForCertification, setSelectedUserIdForCertification] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyData();
  }, [companyId, refreshTrigger]);

  // Reload services, members, and certifications when refresh trigger changes
  useEffect(() => {
    if (company?.id) {
      loadServices(company.id);
      loadMembers(company.id);
      if (company.subcategory === 'academy') {
        loadCertifications(company.id);
      }
    }
  }, [refreshTrigger, company?.id]);

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!company?.id) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.name || 'this member'} from ${company.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingMemberId(member.user_id);
              const response = await removeCompanyMember(company.id, member.user_id);
              
              if (response.success) {
                Alert.alert('Success', 'Member removed successfully');
                // Reload members
                await loadMembers(company.id);
              } else {
                throw new Error(response.error || 'Failed to remove member');
              }
            } catch (error: any) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', error.message || 'Failed to remove member. Please try again.');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ]
    );
  };

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load company details
      const companyResponse = await getCompany(companyId);
      if (!companyResponse.success || !companyResponse.data) {
        throw new Error(companyResponse.error || 'Failed to load company');
      }

      setCompany(companyResponse.data);

      // Load members, services, and certifications in parallel
      const loadPromises = [loadMembers(companyId), loadServices(companyId)];
      // Only load certifications if company is an academy
      if (companyResponse.data.subcategory === 'academy') {
        loadPromises.push(loadCertifications(companyId));
      }
      await Promise.all(loadPromises);
    } catch (err: any) {
      console.error('Failed to load company data:', err);
      setError(err.message || 'Failed to load company profile');
      Alert.alert('Error', err.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (id: string) => {
    try {
      setLoadingMembers(true);
      // Use API parameters: page, limit, sort, order
      // API automatically filters for invitation_status = 'accepted' and excludes soft-deleted members
      let response = await getCompanyMembers(id, {
        page: 1,
        limit: 50,
        sort: 'joined_at',
        order: 'asc'
      });
      
      // If first attempt fails with 500, try without sort parameters (in case sort field doesn't exist)
      if (!response.success && response.error?.includes('500')) {
        console.warn('⚠️ Retrying without sort parameters...');
        response = await getCompanyMembers(id, {
          page: 1,
          limit: 50
          // Removed sort and order - might be causing the 500 error
        });
      }
      
      // Handle successful response with data
      if (response.success) {
        // API returns paginated results - check both nested data structure and direct array
        let membersArray: CompanyMember[] = [];
        
        if (response.data?.data && Array.isArray(response.data.data)) {
          // Paginated response structure: { data: { data: [...], pagination: {...} } }
          membersArray = response.data.data;
        } else if (Array.isArray(response.data)) {
          // Direct array response
          membersArray = response.data;
        } else if (response.data?.members && Array.isArray(response.data.members)) {
          // Alternative structure with members key
          membersArray = response.data.members;
        }
        
        // API already filters for accepted members, so we don't need to filter again
        // But we'll keep a safety check just in case
        setMembers(membersArray.filter(m => m.invitation_status === 'accepted'));
      } else {
        // Error response (500, 403, etc.) 
        // The ApiContext already handles these gracefully and returns success: true with empty data
        // So if we get here with success: false, it's a non-500 error
        if (response.error && !response.error.includes('500')) {
          console.warn('⚠️ Failed to load members:', response.error);
        }
        setMembers([]);
      }
    } catch (err: any) {
      // Fallback error handling
      // Check if it's a 500 error
      if (err.status === 500 || err.statusCode === 500 || err.message?.includes('500') || err.message?.includes('Failed to fetch members')) {
        console.warn('⚠️ Server error loading members (500). Showing empty list.');
      } else {
        console.error('Failed to load members:', err);
      }
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadCertifications = async (id: string) => {
    try {
      setLoadingCertifications(true);
      const certs = await getCompanyCertifications(id);
      setCertifications(Array.isArray(certs) ? certs : []);
    } catch (err) {
      console.error('Failed to load certifications:', err);
      setCertifications([]);
    } finally {
      setLoadingCertifications(false);
    }
  };

  const loadServices = async (id: string) => {
    try {
      setLoadingServices(true);
      console.log('🔄 Loading company services for:', id);
      const response = await getCompanyServices(id);
      
      if (response.success && response.data) {
        // Handle different response structures
        let servicesArray: CompanyService[] = [];
        if (Array.isArray(response.data)) {
          servicesArray = response.data;
        } else if (Array.isArray(response.data?.data)) {
          servicesArray = response.data.data;
        } else if (Array.isArray(response.data?.services)) {
          servicesArray = response.data.services;
        }
        
        console.log('✅ Company services loaded:', servicesArray.length, servicesArray);
        setServices(servicesArray);
      } else {
        console.warn('⚠️ No services found or failed to load:', response.error);
        setServices([]);
      }
    } catch (err) {
      console.error('❌ Failed to load services:', err);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const isOwner = () => {
    if (!company || !user) return false;
    return company.owner?.id === user.id || activeCompany?.id === company.id;
  };

  const canEdit = () => {
    if (!company || !user) return false;
    // Owner, or user viewing their own active company
    return isOwner() || (currentProfileType === 'company' && activeCompany?.id === company.id);
  };

  const getApprovalStatusColor = (status: CompanyApprovalStatus): string => {
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
        return '#71717a';
      default:
        return '#71717a';
    }
  };

  const getApprovalStatusLabel = (status: CompanyApprovalStatus): string => {
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
        return status;
    }
  };

  const getRoleBadgeColor = (role: CompanyMemberRole): string => {
    switch (role) {
      case 'owner':
        return '#000';
      case 'admin':
        return '#6366f1';
      case 'manager':
        return '#8b5cf6';
      case 'member':
        return '#71717a';
      default:
        return '#71717a';
    }
  };

  // Map invalid icon names to valid Ionicons names
  const getValidIconName = (iconName: string | undefined | null): string => {
    if (!iconName) return 'briefcase-outline'; // Default icon
    
    const iconMap: Record<string, string> = {
      'pen': 'pencil-outline',
      'pencil': 'pencil-outline',
      'create': 'create-outline',
      'edit': 'create-outline',
      'write': 'pencil-outline',
    };
    
    const lowerIconName = iconName.toLowerCase();
    // Return mapped icon if exists, otherwise return the original with fallback
    return iconMap[lowerIconName] || iconName || 'briefcase-outline';
  };

  const handleWebsitePress = () => {
    if (company?.website_url) {
      const url = company.website_url.startsWith('http') 
        ? company.website_url 
        : `https://${company.website_url}`;
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Failed to open website');
      });
    }
  };

  const handleEmailPress = () => {
    if (company?.email) {
      Linking.openURL(`mailto:${company.email}`).catch((err) => {
        console.error('Failed to open email:', err);
      });
    }
  };

  const handlePhonePress = () => {
    if (company?.phone) {
      Linking.openURL(`tel:${company.phone}`).catch((err) => {
        console.error('Failed to open phone:', err);
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading company profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Company not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCompanyData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Profile</Text>
        {canEdit() && onEdit && (
          <TouchableOpacity onPress={() => onEdit(company)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            {company.logo_url ? (
              <Image source={{ uri: company.logo_url }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business" size={48} color="#71717a" />
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.company_type_info && (
              <Text style={styles.companyType}>{company.company_type_info.name}</Text>
            )}

            {/* Approval Status Badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getApprovalStatusColor(company.approval_status) + '20' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getApprovalStatusColor(company.approval_status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getApprovalStatusColor(company.approval_status) },
                ]}
              >
                {getApprovalStatusLabel(company.approval_status)}
              </Text>
            </View>

            {company.approval_status === 'pending' && (
              <Text style={styles.statusMessage}>
                Your company is pending admin approval. You'll be notified once it's reviewed.
              </Text>
            )}

            {company.approval_status === 'rejected' && company.approval_reason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{company.approval_reason}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Company Description */}
        {(company.description || company.bio) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            {company.description && (
              <Text style={styles.description}>{company.description}</Text>
            )}
            {company.bio && (
              <Text style={styles.description}>{company.bio}</Text>
            )}
          </View>
        )}

        {/* Contact Information */}
        {(company.website_url || company.email || company.phone || company.location_text) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            {company.website_url && (
              <TouchableOpacity style={styles.contactItem} onPress={handleWebsitePress}>
                <Ionicons name="globe-outline" size={20} color="#000" />
                <Text style={styles.contactText}>{company.website_url}</Text>
                <Ionicons name="open-outline" size={16} color="#71717a" />
              </TouchableOpacity>
            )}

            {company.email && (
              <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                <Ionicons name="mail-outline" size={20} color="#000" />
                <Text style={styles.contactText}>{company.email}</Text>
              </TouchableOpacity>
            )}

            {company.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
                <Ionicons name="call-outline" size={20} color="#000" />
                <Text style={styles.contactText}>{company.phone}</Text>
              </TouchableOpacity>
            )}

            {company.location_text && (
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={20} color="#000" />
                <Text style={styles.contactText}>{company.location_text}</Text>
              </View>
            )}

            {company.establishment_date && (
              <View style={styles.contactItem}>
                <Ionicons name="calendar-outline" size={20} color="#000" />
                <Text style={styles.contactText}>
                  Established: {new Date(company.establishment_date).getFullYear()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Services We Provide {services.length > 0 && `(${services.length})`}
            </Text>
            {canEdit() && onManageServices && (
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => onManageServices(company)}
              >
                <Ionicons name="settings-outline" size={18} color="#000" />
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingServices ? (
            <ActivityIndicator size="small" color="#000" />
          ) : services.length > 0 ? (
            <View style={styles.servicesGrid}>
              {services.map((companyService) => {
                const service = companyService.service;
                if (!service) return null;

                return (
                  <View key={companyService.service_id} style={styles.serviceCard}>
                    {service.icon_name && (
                      <Ionicons 
                        name={getValidIconName(service.icon_name) as any} 
                        size={24} 
                        color="#000" 
                      />
                    )}
                    <Text style={styles.serviceName}>{service.name}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {service.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#e4e4e7" />
              <Text style={styles.emptyStateText}>No services added yet</Text>
              {canEdit() && onManageServices && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onManageServices(company)}
                >
                  <Text style={styles.addButtonText}>Add Services</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Team Members {members.length > 0 ? `(${members.length})` : ''}
            </Text>
            {canEdit() && onInviteMember && (
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => onInviteMember(company)}
              >
                <Ionicons name="person-add-outline" size={18} color="#000" />
                <Text style={styles.manageButtonText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingMembers ? (
            <ActivityIndicator size="small" color="#000" />
          ) : members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member) => (
                  <View key={member.user_id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      {member.user?.image_url ? (
                        <Image
                          source={{ uri: member.user.image_url }}
                          style={styles.memberAvatarImage}
                        />
                      ) : (
                        <View style={styles.memberAvatarPlaceholder}>
                          <Text style={styles.memberAvatarText}>
                            {member.user?.name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.user?.name || 'Unknown User'}</Text>
                      {member.user?.primary_role && (
                        <Text style={styles.memberRole}>
                          {member.user.primary_role.replace(/_/g, ' ')}
                        </Text>
                      )}
                      <View style={styles.memberRoleBadge}>
                        <View
                          style={[
                            styles.roleDot,
                            { backgroundColor: getRoleBadgeColor(member.role) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.roleText,
                            { color: getRoleBadgeColor(member.role) },
                          ]}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.memberActions}>
                      {isOwner() && member.role !== 'owner' && (
                        <>
                          {company.subcategory === 'academy' && (
                            <TouchableOpacity
                              style={styles.memberActionButton}
                              onPress={() => {
                                setSelectedUserIdForCertification(member.user_id);
                                setShowGrantCertificationModal(true);
                              }}
                            >
                              <Ionicons name="trophy-outline" size={20} color="#3b82f6" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleRemoveMember(member)}
                            disabled={removingMemberId === member.user_id}
                          >
                            {removingMemberId === member.user_id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#e4e4e7" />
              <Text style={styles.emptyStateText}>No members yet</Text>
              {canEdit() && onInviteMember && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onInviteMember(company)}
                >
                  <Text style={styles.addButtonText}>Invite Members</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Certifications Section (Academy Only) */}
        {company.subcategory === 'academy' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Certifications Granted {certifications.length > 0 && `(${certifications.length})`}
              </Text>
              {canEdit() && (
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => setShowGrantCertificationModal(true)}
                >
                  <Ionicons name="trophy-outline" size={18} color="#000" />
                  <Text style={styles.manageButtonText}>Grant</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingCertifications ? (
              <ActivityIndicator size="small" color="#000" />
            ) : certifications.length > 0 ? (
              <View style={styles.certificationsList}>
                {certifications.map((certification) => (
                  <CertificationCard
                    key={certification.id}
                    certification={certification}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="#e4e4e7" />
                <Text style={styles.emptyStateText}>No certifications granted yet</Text>
                {canEdit() && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowGrantCertificationModal(true)}
                  >
                    <Text style={styles.addButtonText}>Grant Certification</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <InfoRow label="Company ID" value={company.id} />
          {company.created_at && (
            <InfoRow
              label="Created"
              value={new Date(company.created_at).toLocaleDateString()}
            />
          )}
          {company.approved_at && (
            <InfoRow
              label="Approved"
              value={new Date(company.approved_at).toLocaleDateString()}
            />
          )}
        </View>
      </ScrollView>

      {/* Grant Certification Modal */}
      {company && (
        <GrantCertificationModal
          visible={showGrantCertificationModal}
          onClose={() => setShowGrantCertificationModal(false)}
          company={company}
          onCertificationGranted={() => {
            if (company.id) {
              loadCertifications(company.id);
            }
          }}
        />
      )}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f4f4f5',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    width: '100%',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  companyType: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 8,
  },
  rejectionBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    width: '100%',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#991b1b',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e4e4e7',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 24,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  contactText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
    textAlign: 'center',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 12,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#71717a',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberActionButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
  },
  // Certifications section styles
  certificationsList: {
    gap: 12,
    marginTop: 8,
  },
});

export default CompanyProfilePage;


