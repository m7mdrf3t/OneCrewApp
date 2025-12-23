import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import { RootStackScreenProps } from '../navigation/types';
import SkeletonProfilePage from '../components/SkeletonProfilePage';
import {
  Company,
  CompanyMember,
  CompanyService,
  CompanyMemberRole,
  CompanyApprovalStatus,
  UserCertification,
  CourseWithDetails,
  CompanyDocument,
  CompanyDocumentType,
} from '../types';
import * as ImagePicker from 'expo-image-picker';
import GrantCertificationModal from '../components/GrantCertificationModal';
import CertificationCard from '../components/CertificationCard';
import CourseCard from '../components/CourseCard';
import CourseRegistrationModal from '../components/CourseRegistrationModal';
import MediaPickerService from '../services/MediaPickerService';
import UploadProgressBar from '../components/UploadProgressBar';

// NOTE: FlashList runtime supports `estimatedItemSize`, but our current TS setup may not expose it.
// We cast to keep the perf optimization without blocking typecheck; revisit after dependency upgrades.
const FlashListUnsafe: React.ComponentType<any> = FlashList as any;

interface CompanyProfilePageProps {
  companyId: string;
  onBack: () => void;
  onEdit?: (company: Company) => void;
  onManageMembers?: (company: Company) => void;
  onManageServices?: (company: Company) => void;
  onInviteMember?: (company: Company) => void;
  onManageCourses?: (company: Company) => void;
  onCourseSelect?: (course: CourseWithDetails) => void;
  refreshTrigger?: number;
  onNavigate?: (page: string, data?: any) => void;
  readOnly?: boolean; // When true, always renders in public, read-only mode regardless of ownership
}

const CompanyProfilePage: React.FC<CompanyProfilePageProps> = ({
  companyId: companyIdProp,
  onBack: onBackProp,
  onEdit,
  onManageMembers,
  onManageServices,
  onInviteMember,
  onManageCourses,
  onCourseSelect,
  refreshTrigger,
  onNavigate: onNavigateProp,
  readOnly = false,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'companyProfile'>['route']>();
  const navigation = useNavigation();
  const routeParams = route.params;
  
  const { navigateTo, goBack } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  const onNavigate = onNavigateProp || navigateTo;
  const onBack = onBackProp || goBack;
  
  // Get companyId from route params or prop
  const companyId = companyIdProp || routeParams?.companyId || '';
  
  // If no companyId provided, show error
  if (!companyId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Company ID not provided</Text>
      </View>
    );
  }
  
  const {
    getCompany,
    getCompanyMembers,
    getPendingCompanyMembers,
    getCompanyServices,
    user,
    activeCompany,
    currentProfileType,
    getCompanyCertifications,
    getAuthorizedCertifications,
    // Mutation hooks - will be conditionally used (checked before use)
    removeCompanyMember,
    grantCertification,
    getAcademyCourses,
    uploadCompanyLogo,
    getCompanyDocuments,
    addCompanyDocument,
    deleteCompanyDocument,
    uploadFile,
    isGuest,
    isAuthenticated,
  } = useApi();

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [services, setServices] = useState<CompanyService[]>([]);
  const [expandedSection, setExpandedSection] = useState<'services' | 'members' | 'certifications' | null>(null);
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  // Edit-related state - only initialized when NOT in read-only mode
  const [showGrantCertificationModal, setShowGrantCertificationModal] = useState(false);
  const [showCourseRegistrationModal, setShowCourseRegistrationModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [selectedUserIdForCertification, setSelectedUserIdForCertification] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    visible: boolean;
    progress?: number;
    label: string;
  }>({
    visible: false,
    progress: undefined,
    label: 'Uploading...',
  });
  const mediaPicker = MediaPickerService.getInstance();
  const { width: screenWidth } = useWindowDimensions();
  const courseCardWidth = Math.min(360, Math.max(260, Math.round(screenWidth * 0.8)));

  const queryClient = useQueryClient();
  const refreshKey = refreshTrigger ?? 0;

  // In read-only mode (public browsing), avoid heavy relationship fetches unless the user asks for them.
  const [servicesRequested, setServicesRequested] = useState(!readOnly);
  const [membersRequested, setMembersRequested] = useState(!readOnly);
  const [documentsRequested, setDocumentsRequested] = useState(!readOnly);
  const [certificationsRequested, setCertificationsRequested] = useState(!readOnly);

  useEffect(() => {
    // Reset lazy-load toggles when switching companies or mode.
    setServicesRequested(!readOnly);
    setMembersRequested(!readOnly);
    setDocumentsRequested(!readOnly);
    setCertificationsRequested(!readOnly);
  }, [companyId, readOnly]);

  const companyCoreQuery = useQuery({
    queryKey: ['company', companyId, 'core', refreshKey],
    enabled: !!companyId,
    queryFn: async () => {
      if (refreshKey > 0) {
        // Clear legacy rate-limiter cache first to ensure fresh data
        try {
          const { rateLimiter } = await import('../utils/rateLimiter');
          await rateLimiter.clearCacheByPattern(`company-${companyId}`);
        } catch (err) {
          console.warn('⚠️ Could not clear cache:', err);
        }
      }

      const coreCompanyResponse = await getCompany(companyId);
      if (!coreCompanyResponse.success || !coreCompanyResponse.data) {
        throw new Error(coreCompanyResponse.error || 'Failed to load company');
      }
      return coreCompanyResponse.data as Company;
    },
  });

  // Sync query results into existing local UI state to minimize invasive refactors.
  // This keeps the "phase 1 (core)" behavior, but avoids loading heavy relationships by default in read-only mode.
  useEffect(() => {
    if (companyCoreQuery.data) {
      setCompany(companyCoreQuery.data);
    }
  }, [companyCoreQuery.data]);

  const isAcademy = (companyCoreQuery.data?.subcategory || company?.subcategory) === 'academy';

  const servicesQuery = useQuery<CompanyService[]>({
    queryKey: ['companyServices', companyId, refreshKey],
    enabled: !!companyId && (!readOnly || servicesRequested),
    queryFn: async () => {
      const response = await getCompanyServices(companyId);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load services');
      }
      const payload = response.data?.data ?? response.data;
      const servicesArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.services)
          ? payload.services
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      return servicesArray;
    },
  });

  useEffect(() => {
    if (servicesQuery.data) {
      setServices(servicesQuery.data);
    }
  }, [servicesQuery.data]);

  // Query for active (accepted) members
  const membersQuery = useQuery<CompanyMember[]>({
    queryKey: ['companyMembers', companyId, refreshKey],
    enabled: !!companyId && (!readOnly || membersRequested),
    queryFn: async () => {
      let response = await getCompanyMembers(companyId, {
        page: 1,
        limit: 50,
        sort: 'joined_at',
        order: 'asc',
      });

      // If first attempt fails with 500, try without sort parameters
      if (!response?.success && response?.error?.includes('500')) {
        response = await getCompanyMembers(companyId, { page: 1, limit: 50 });
      }

      if (response?.success) {
        let membersArray: CompanyMember[] = [];
        const data = response.data;
        if (data?.data && Array.isArray(data.data)) {
          membersArray = data.data;
        } else if (Array.isArray(data)) {
          membersArray = data;
        } else if (data?.members && Array.isArray(data.members)) {
          membersArray = data.members;
        }
        // Only return accepted members - pending members are handled separately
        const acceptedMembers = membersArray.filter((m) => m.invitation_status === 'accepted');
        return acceptedMembers;
      }

      // Graceful fallback: show empty list
      return [];
    },
  });

  // Query for pending members using the dedicated endpoint
  const pendingMembersQuery = useQuery<CompanyMember[]>({
    queryKey: ['companyPendingMembers', companyId, refreshKey],
    enabled: !!companyId && (!readOnly || membersRequested),
    queryFn: async () => {
      try {
        const response = await getPendingCompanyMembers(companyId, {
          page: 1,
          limit: 50,
          sort: 'created_at',
          order: 'desc',
        });

        if (response?.success && response.data) {
          // The API returns data as an array directly in response.data, not response.data.data
          // Check if data is an array or if it's nested in a data property
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          }
          return [];
        }

        // Graceful fallback: show empty list
        return [];
      } catch (error) {
        console.warn('⚠️ Failed to load pending members, falling back to empty list:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    // Combine accepted and pending members for display
    const acceptedMembers = membersQuery.data || [];
    const pendingMembers = pendingMembersQuery.data || [];
    setMembers([...acceptedMembers, ...pendingMembers]);
  }, [membersQuery.data, pendingMembersQuery.data]);

  const documentsQuery = useQuery<CompanyDocument[]>({
    queryKey: ['companyDocuments', companyId, refreshKey],
    enabled: !!companyId && (!readOnly || documentsRequested),
    queryFn: async () => {
      const response = await getCompanyDocuments(companyId);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load documents');
      }
      const docsArray = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return docsArray.filter((doc: CompanyDocument) => !doc?.deleted_at);
    },
  });

  useEffect(() => {
    if (documentsQuery.data) {
      setDocuments(documentsQuery.data);
    }
  }, [documentsQuery.data]);

  const coursesQuery = useQuery<CourseWithDetails[]>({
    queryKey: ['academyCourses', companyId, refreshKey],
    enabled: !!companyId && isAcademy,
    queryFn: async () => {
      const coursesData = await getAcademyCourses(companyId);
      return Array.isArray(coursesData) ? coursesData : [];
    },
  });

  useEffect(() => {
    if (!isAcademy) {
      setCourses([]);
      return;
    }
    if (coursesQuery.data) {
      setCourses(coursesQuery.data);
    }
  }, [isAcademy, coursesQuery.data]);

  const certificationsQuery = useQuery<UserCertification[]>({
    queryKey: ['companyCertifications', companyId, refreshKey],
    enabled: !!companyId && isAcademy && (!readOnly || certificationsRequested),
    queryFn: async () => {
      const certs = await getCompanyCertifications(companyId);
      return Array.isArray(certs) ? certs : [];
    },
  });

  useEffect(() => {
    if (!isAcademy) {
      setCertifications([]);
      return;
    }
    if (certificationsQuery.data) {
      setCertifications(certificationsQuery.data);
    }
  }, [isAcademy, certificationsQuery.data]);

  const loading = companyCoreQuery.isLoading && !company;
  const error: string | null = (() => {
    const err: any = companyCoreQuery.error;
    if (!err) return null;
    return err instanceof Error ? err.message : String(err);
  })();

  const loadingMembers = membersQuery.isFetching || pendingMembersQuery.isFetching;
  const loadingServices = servicesQuery.isFetching;
  const loadingDocuments = documentsQuery.isFetching;
  const loadingCertifications = certificationsQuery.isFetching;
  const loadingCourses = coursesQuery.isFetching;

  const handleRemoveMember = async (member: CompanyMember) => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to remove member in read-only mode - operation blocked');
      return;
    }
    if (!company?.id || !removeCompanyMember) return;

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
      // Backwards-compatible helper for existing call sites (retry/upload flows).
      // With TanStack Query, the page's UI state is driven by the cached query data.
      await companyCoreQuery.refetch();
      if (!readOnly || servicesRequested) await servicesQuery.refetch();
      if (!readOnly || membersRequested) await membersQuery.refetch();
      if (!readOnly || documentsRequested) await documentsQuery.refetch();
      if (isAcademy) await coursesQuery.refetch();
      if (isAcademy && (!readOnly || certificationsRequested)) await certificationsQuery.refetch();
    } catch (err: any) {
      console.error('Failed to load company data:', err);
      Alert.alert('Error', err.message || 'Failed to load company profile');
    } finally {
      // no-op: loading UI is derived from query state
    }
  };

  const loadMembers = async (_id: string) => {
    try {
      setMembersRequested(true);
      await membersQuery.refetch();
    } catch (err) {
      console.warn('⚠️ Failed to refresh members:', err);
    }
  };

  const loadCertifications = async (_id: string) => {
    try {
      setCertificationsRequested(true);
      await certificationsQuery.refetch();
    } catch (err) {
      console.warn('⚠️ Failed to refresh certifications:', err);
    }
  };

  const loadCourses = async (_id: string) => {
    try {
      await coursesQuery.refetch();
    } catch (err) {
      console.warn('⚠️ Failed to refresh courses:', err);
    }
  };

  // Create default handlers that use navigation when callback props aren't provided
  const handleManageMembers = React.useCallback((company: Company) => {
    if (onManageMembers) {
      onManageMembers(company);
    } else if (onNavigate) {
      // Navigate to members management page
      const userMember = members.find(m => m.user_id === user?.id);
      onNavigate('companyMembersManagement', {
        company,
        currentUserId: user?.id || '',
        currentUserRole: (userMember?.role || 'member') as CompanyMemberRole,
      });
    }
  }, [onManageMembers, onNavigate, members, user]);

  const handleManageCourses = React.useCallback((company: Company) => {
    if (onManageCourses) {
      onManageCourses(company);
    } else if (onNavigate) {
      // Navigate to courses management page
      onNavigate('coursesManagement', {
        companyId: company.id,
        readOnly: false,
      });
    }
  }, [onManageCourses, onNavigate]);

  const handleInviteMember = React.useCallback((company: Company) => {
    if (onInviteMember) {
      onInviteMember(company);
    } else if (onNavigate) {
      // Navigate to members management page and show invite modal
      const userMember = members.find(m => m.user_id === user?.id);
      onNavigate('companyMembersManagement', {
        company,
        currentUserId: user?.id || '',
        currentUserRole: (userMember?.role || 'member') as CompanyMemberRole,
        showInviteModal: true,
      });
    }
  }, [onInviteMember, onNavigate, members, user]);

  const handleEditCompany = React.useCallback((company: Company) => {
    if (onEdit) {
      onEdit(company);
    } else if (onNavigate) {
      // Navigate to company edit page
      onNavigate('companyEdit', { company });
    }
  }, [onEdit, onNavigate]);

  const loadDocuments = async (_id: string) => {
    try {
      setDocumentsRequested(true);
      await documentsQuery.refetch();
    } catch (err) {
      console.warn('⚠️ Failed to refresh documents:', err);
    }
  };

  const handleUploadDocument = async (documentType: CompanyDocumentType) => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to upload document in read-only mode - operation blocked');
      return;
    }
    if (!company?.id || !addCompanyDocument || !uploadFile) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadDocumentFile(company.id, {
          document_type: documentType,
          file_uri: asset.uri,
          file_name: asset.fileName || `document_${Date.now()}.jpg`,
        });
      }
    } catch (error: any) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadDocumentFile = async (companyId: string, doc: { document_type: CompanyDocumentType; file_uri: string; file_name: string }) => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to upload document file in read-only mode - operation blocked');
      return;
    }
    if (!addCompanyDocument || !uploadFile) return;

    try {
      setUploadingDocument(true);

      // Step 1: Upload file to storage
      const uploadResponse = await uploadFile({
        uri: doc.file_uri,
        type: 'image/jpeg',
        name: doc.file_name,
      });

      const documentUrl = uploadResponse?.data?.url || uploadResponse?.url;
      if (!documentUrl) {
        throw new Error('Failed to upload document file');
      }

      // Step 2: Attach the uploaded document to the company
      const attachResponse = await addCompanyDocument(companyId, {
        document_type: doc.document_type,
        file_url: documentUrl,
        file_name: doc.file_name,
      });

      if (attachResponse.success) {
        Alert.alert('Success', 'Document uploaded successfully!');
        await loadDocuments(companyId);
      } else {
        throw new Error(attachResponse.error || 'Failed to attach document');
      }
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      Alert.alert('Error', error.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to delete document in read-only mode - operation blocked');
      return;
    }
    if (!company?.id || !deleteCompanyDocument) return;

    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteCompanyDocument(company.id, documentId);
              if (response.success) {
                Alert.alert('Success', 'Document deleted successfully!');
                await loadDocuments(company.id);
              } else {
                throw new Error(response.error || 'Failed to delete document');
              }
            } catch (error: any) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', error.message || 'Failed to delete document. Please try again.');
            }
          },
        },
      ]
    );
  };

  const loadServices = async (_id: string) => {
    try {
      setServicesRequested(true);
      await servicesQuery.refetch();
    } catch (err) {
      console.warn('⚠️ Failed to refresh services:', err);
    }
  };

  const isOwner = () => {
    // In read-only mode, never detect ownership - always return false
    if (readOnly) return false;
    
    if (!company || !user) return false;
    // Check multiple ways: owner.id or activeCompany match
    const isOwnerById = company.owner?.id === user.id;
    const isActiveCompany = activeCompany?.id === company.id;
    // Also check if company was created by this user (created_by field if available)
    const isCreator = (company as any).created_by === user.id;
    return isOwnerById || isActiveCompany || isCreator;
  };

  const canEdit = () => {
    // In read-only mode, never allow editing - always return false
    if (readOnly) return false;
    
    if (!company || !user) return false;
    // Owner, or user viewing their own active company, or user is a member with edit permissions
    const isOwnerCheck = isOwner();
    const isActiveCompany = currentProfileType === 'company' && activeCompany?.id === company.id;
    
    // Also check if user is a member with admin/owner role
    const userMember = members.find(m => m.user_id === user.id);
    const hasEditPermission = userMember && (userMember.role === 'owner' || userMember.role === 'admin');
    
    return isOwnerCheck || isActiveCompany || hasEditPermission;
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

  const handleSocialMediaPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Failed to open social media link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleStartChat = () => {
    if (!company) return;
    
    if (isGuest || !isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to start a conversation with the academy.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => {
              // Navigate to login if onNavigate is available
              if (onNavigate) {
                onNavigate('auth', { page: 'login' });
              }
            }
          }
        ]
      );
      return;
    }

    // Navigate to chat with academy
    if (onNavigate) {
      const participant = {
        id: company.id,
        category: 'company' as const,
        name: company.name,
        logo_url: company.logo_url,
      };
      onNavigate('chat', { participant });
    }
  };

  const handleUploadLogo = async () => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to upload logo in read-only mode - operation blocked');
      return;
    }
    if (!company?.id || !uploadCompanyLogo) return;

    try {
      // Request permissions
      const hasPermission = await mediaPicker.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Camera and media library permissions are required to upload a logo.');
        return;
      }

      // Show action sheet to choose between camera and gallery
      Alert.alert(
        'Upload Company Logo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              try {
                const result = await mediaPicker.pickImage({
                  allowsEditing: true,
                  quality: 0.8,
                  aspect: [1, 1],
                  maxWidth: 1024,
                  maxHeight: 1024,
                });

                if (result) {
                  await uploadLogoFile(result);
                }
              } catch (error: any) {
                console.error('Error picking image:', error);
                Alert.alert('Error', error.message || 'Failed to pick image.');
              }
            },
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                const result = await mediaPicker.takePhoto({
                  allowsEditing: true,
                  quality: 0.8,
                  aspect: [1, 1],
                });

                if (result) {
                  await uploadLogoFile(result);
                }
              } catch (error: any) {
                console.error('Error taking photo:', error);
                Alert.alert('Error', error.message || 'Failed to take photo.');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in handleUploadLogo:', error);
      Alert.alert('Error', error.message || 'Failed to upload logo.');
    }
  };

  const uploadLogoFile = async (imageResult: any) => {
    // STRICT READ-ONLY: This function should never execute in read-only mode
    if (readOnly) {
      console.warn('⚠️ Attempted to upload logo file in read-only mode - operation blocked');
      return;
    }
    if (!company?.id || !uploadCompanyLogo) return;

    try {
      setUploadingLogo(true);
      setUploadProgress({
        visible: true,
        progress: undefined,
        label: 'Uploading company logo...',
      });

      const file = {
        uri: imageResult.uri,
        type: 'image/jpeg',
        name: imageResult.fileName || `company_logo_${Date.now()}.jpg`,
      };

      const response = await uploadCompanyLogo(company.id, file);

      setUploadProgress({ visible: false, label: '' });
      if (response.success && response.data?.url) {
        // Reload company data to show new logo
        await loadCompanyData();
        Alert.alert('Success', 'Company logo uploaded successfully!');
      } else {
        throw new Error(response.error || 'Failed to upload logo');
      }
    } catch (error: any) {
      console.error('Failed to upload logo:', error);
      setUploadProgress({ visible: false, label: '' });
      const errorMessage = error.message || 'Failed to upload company logo.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('storage') || errorMessage.includes('500')) {
        Alert.alert(
          'Upload Error',
          'The server encountered an error while uploading the logo. This may be a temporary issue. Please try again in a moment, or contact support if the problem persists.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return <SkeletonProfilePage isDark={false} />;
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
        {/* STRICT READ-ONLY: Edit button completely removed when readOnly is true */}
        {!readOnly && canEdit() && (
          <TouchableOpacity onPress={() => handleEditCompany(company)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Upload Progress Bar */}
        {uploadProgress.visible && (
          <View style={{ padding: 16 }}>
            <UploadProgressBar
              progress={uploadProgress.progress}
              label={uploadProgress.label}
              visible={uploadProgress.visible}
            />
          </View>
        )}
        
        {/* Company/Academy Name at Top */}
        <View style={styles.companyNameHeader}>
          <Text style={styles.companyNameHeaderText}>{company.name}</Text>
          {company.company_type_info && (
            <Text style={styles.companyTypeHeader}>{company.company_type_info.name}</Text>
          )}
        </View>
        
        {company.subcategory === 'academy' ? (
          /* Academy Layout - Matching Design */
          <>
            {/* Company Profile Image Banner */}
            <View style={styles.academyImageContainer}>
              {company.logo_url ? (
                <Image
                  source={{ uri: company.logo_url }}
                  style={styles.academyImage}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.academyImagePlaceholder}>
                  <Ionicons name="school" size={50} color="#71717a" />
                </View>
              )}
              
              {/* Chat Icon - Top Right Corner */}
              {!canEdit() && (
                <TouchableOpacity
                  style={styles.chatIconButton}
                  onPress={handleStartChat}
                  activeOpacity={0.7}
                >
                  <View style={styles.chatIconContainer}>
                    <Ionicons name="chatbubble" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
              
              {/* STRICT READ-ONLY: Upload Logo Button completely removed when readOnly is true */}
              {!readOnly && canEdit() && (
                <TouchableOpacity
                  style={styles.uploadLogoButton}
                  onPress={handleUploadLogo}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* About Section with Contact and Metrics */}
            <View style={styles.section}>
              {/* About Title and Description */}
              {(company.description || company.bio) && (
                <View style={styles.aboutSection}>
                  <Text style={styles.sectionTitle}>About</Text>
                  {company.description && (
                    <Text style={styles.description}>{company.description}</Text>
                  )}
                  {company.bio && (
                    <>
                      {company.description && <View style={styles.bioSeparator} />}
                      <Text style={styles.bioText}>{company.bio}</Text>
                    </>
                  )}
                </View>
              )}

              {/* Social Media Icons in Academy Layout */}
              {company.social_media_links && Object.keys(company.social_media_links).length > 0 && (
                <View style={styles.socialMediaIcons}>
                  {company.social_media_links.instagram && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.instagram!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                    </TouchableOpacity>
                  )}
                  {company.social_media_links.facebook && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.facebook!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                    </TouchableOpacity>
                  )}
                  {company.social_media_links.twitter && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.twitter!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                    </TouchableOpacity>
                  )}
                  {company.social_media_links.linkedin && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.linkedin!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="logo-linkedin" size={20} color="#0077B5" />
                    </TouchableOpacity>
                  )}
                  {company.social_media_links.youtube && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.youtube!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                    </TouchableOpacity>
                  )}
                  {company.social_media_links.tiktok && (
                    <TouchableOpacity
                      onPress={() => handleSocialMediaPress(company.social_media_links!.tiktok!)}
                      style={styles.socialIconButton}
                    >
                      <Ionicons name="musical-notes" size={20} color="#000000" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Contact Information */}
              {(company.email || company.phone || company.location_text || company.address || company.city || company.country) && (
                <View style={styles.contactSection}>
                  {company.email && (
                    <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                      <Ionicons name="mail-outline" size={16} color="#000" />
                      <Text style={styles.contactText}>Email {company.email}</Text>
                    </TouchableOpacity>
                  )}

                  {company.phone && (
                    <View style={styles.contactItem}>
                      <Ionicons name="call-outline" size={16} color="#000" />
                      <Text style={styles.contactText}>{company.phone}</Text>
                      <TouchableOpacity 
                        style={styles.callButton}
                        onPress={handlePhonePress}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={20} color="#22c55e" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Location - prefer structured fields, fallback to location_text */}
                  {(company.address || company.city || company.country || company.location_text) && (
                    <View style={styles.contactItem}>
                      <Ionicons name="location-outline" size={16} color="#000" />
                      <Text style={styles.contactText}>
                        {(() => {
                          const parts: string[] = [];
                          if (company.address) parts.push(company.address);
                          if (company.city) parts.push(company.city);
                          if (company.country) parts.push(company.country);
                          return parts.length > 0 ? parts.join(', ') : company.location_text || '';
                        })()}
                      </Text>
                    </View>
                  )}
                </View>
              )}


              {/* Metrics Row */}
              <View style={styles.metricsRow}>
                {(company.establishment_date || company.created_at) && (
                  <View style={styles.metricItem}>
                    <Ionicons name="calendar-outline" size={18} color="#000" />
                    <Text style={styles.metricLabel}>
                      Team Size: {loadingMembers ? '...' : `${members.length}+`}
                    </Text>
                    <Text style={styles.metricValue}>
                      Created: {company.establishment_date
                        ? new Date(company.establishment_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                        : new Date(company.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    </Text>
                  </View>
                )}

                <View style={styles.metricItem}>
                  <Ionicons name="people-outline" size={18} color="#000" />
                  <Text style={styles.metricLabel}>Active Users</Text>
                  <Text style={styles.metricValue}>
                    {(!readOnly || membersRequested) ? (loadingMembers ? '...' : `${members.length}+`) : '—'}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Ionicons name="bar-chart-outline" size={18} color="#000" />
                  <Text style={styles.metricLabel}>Active</Text>
                  <Text style={styles.metricValue}>
                    {(!readOnly || membersRequested) ? (loadingMembers ? '...' : `${members.length}+`) : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Team & Metrics Section with Courses */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team & Metrics</Text>
                {/* STRICT READ-ONLY: Manage button completely removed when readOnly is true */}
                {!readOnly && canEdit() && company.approval_status === 'approved' && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => handleManageCourses(company)}
                  >
                    <Ionicons name="school-outline" size={14} color="#000" />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingCourses ? (
                <ActivityIndicator size="small" color="#000" />
              ) : courses.length > 0 ? (
                <>
                  <FlashListUnsafe
                    horizontal
                    data={courses}
                    keyExtractor={(course: CourseWithDetails) => String(course.id)}
                    showsHorizontalScrollIndicator={false}
                    style={styles.coursesHorizontalScroll}
                    contentContainerStyle={styles.coursesHorizontalContent}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    estimatedItemSize={courseCardWidth}
                    renderItem={({ item: course }: { item: CourseWithDetails }) => (
                      <View style={{ width: courseCardWidth }}>
                        <CourseCard
                          course={course}
                          onSelect={() => {
                            // STRICT READ-ONLY: In read-only mode, only allow viewing course details
                            if (readOnly && onCourseSelect) {
                              onCourseSelect(course);
                            } else if (!readOnly && onCourseSelect) {
                              onCourseSelect(course);
                            } else if (!readOnly && onManageCourses) {
                              onManageCourses(company);
                            }
                          }}
                        />
                      </View>
                    )}
                  />
                  {/* STRICT READ-ONLY: In read-only mode, only allow viewing courses, not managing */}
                  {readOnly && onCourseSelect ? (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => {
                        // In read-only mode, navigate to courses management page in read-only mode
                        if (onNavigate) {
                          onNavigate('coursesManagement', { companyId: company.id, readOnly: true });
                        }
                      }}
                    >
                      <Text style={styles.viewAllButtonText}>View All Courses</Text>
                    </TouchableOpacity>
                  ) : !readOnly ? (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => {
                        handleManageCourses(company);
                      }}
                    >
                      <Text style={styles.viewAllButtonText}>View All Courses</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="school-outline" size={48} color="#e4e4e7" />
                  <Text style={styles.emptyStateText}>No courses available yet</Text>
                  {/* STRICT READ-ONLY: Create Course button completely removed when readOnly is true */}
                  {!readOnly && canEdit() && company.approval_status === 'approved' && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleManageCourses(company)}
                    >
                      <Text style={styles.addButtonText}>Create Course</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* STRICT READ-ONLY: Course Registrations Section completely removed when readOnly is true */}
            {!readOnly && canEdit() && company.approval_status === 'approved' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Course Registrations</Text>
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => setShowCourseRegistrationModal(true)}
                  >
                    <Ionicons name="people-outline" size={14} color="#000" />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.description}>
                  Register and manage users for your academy courses. Only academy owners and admins can manage registrations.
                </Text>
                <TouchableOpacity
                  style={styles.manageRegistrationsButton}
                  onPress={() => setShowCourseRegistrationModal(true)}
                >
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.manageRegistrationsButtonText}>Manage Course Registrations</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STRICT READ-ONLY: Invite Admin Users Section completely removed when readOnly is true */}
            {!readOnly && canEdit() && company.subcategory === 'academy' && company.approval_status === 'approved' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Admin Management</Text>
                </View>
                <Text style={styles.description}>
                  Invite users as administrators to help manage your academy. Admin users have full management privileges including the ability to add other admin users, manage courses, and grant certifications.
                </Text>
                <View style={styles.adminManagementButtons}>
                  <TouchableOpacity
                    style={[styles.manageRegistrationsButton, { backgroundColor: '#6366f1', marginBottom: 8 }]}
                    onPress={() => handleManageMembers(company)}
                  >
                    <Ionicons name="settings-outline" size={18} color="#fff" />
                    <Text style={styles.manageRegistrationsButtonText}>Manage All Members</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.manageRegistrationsButton, styles.inviteAdminButton]}
                    onPress={() => handleInviteMember(company)}
                  >
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.manageRegistrationsButtonText}>Invite Admin User</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* User Management Section - For all company types */}
            {!readOnly && canEdit() && company.approval_status === 'approved' && company.subcategory !== 'academy' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>User Management</Text>
                </View>
                <Text style={styles.description}>
                  Manage all company members, view pending invitations, edit roles, and remove members.
                </Text>
                <TouchableOpacity
                  style={[styles.manageRegistrationsButton, { backgroundColor: '#3b82f6' }]}
                  onPress={() => handleManageMembers(company)}
                >
                  <Ionicons name="people-outline" size={18} color="#fff" />
                  <Text style={styles.manageRegistrationsButtonText}>Manage Members</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STRICT READ-ONLY: Grant Certification Section completely removed when readOnly is true */}
            {!readOnly && canEdit() && company.subcategory === 'academy' && company.approval_status === 'approved' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Grant Certifications</Text>
                </View>
                <Text style={styles.description}>
                  Manually grant certifications to users. You can also grant certifications from the Team Members section by clicking the trophy icon next to any member.
                </Text>
                <TouchableOpacity
                  style={styles.manageRegistrationsButton}
                  onPress={() => {
                    setSelectedUserIdForCertification(null);
                    setShowGrantCertificationModal(true);
                  }}
                >
                  <Ionicons name="trophy-outline" size={18} color="#fff" />
                  <Text style={styles.manageRegistrationsButtonText}>Grant Certification</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* Regular Company Layout */
          <>
            {/* Company Header */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                {company.logo_url ? (
                  <Image
                    source={{ uri: company.logo_url }}
                    style={styles.logo}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="business" size={48} color="#71717a" />
                  </View>
                )}
                {/* STRICT READ-ONLY: Upload Logo Button completely removed when readOnly is true */}
                {!readOnly && canEdit() && (
                  <TouchableOpacity
                    style={styles.uploadLogoButton}
                    onPress={handleUploadLogo}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                {company.company_type_info && (
                  <Text style={styles.companyType}>{company.company_type_info.name}</Text>
                )}

                {/* Social Media Icons in Header */}
                {company.social_media_links && Object.keys(company.social_media_links).length > 0 && (
                  <View style={styles.socialMediaIcons}>
                    {company.social_media_links.instagram && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.instagram!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                      </TouchableOpacity>
                    )}
                    {company.social_media_links.facebook && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.facebook!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                      </TouchableOpacity>
                    )}
                    {company.social_media_links.twitter && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.twitter!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                      </TouchableOpacity>
                    )}
                    {company.social_media_links.linkedin && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.linkedin!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="logo-linkedin" size={20} color="#0077B5" />
                      </TouchableOpacity>
                    )}
                    {company.social_media_links.youtube && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.youtube!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                      </TouchableOpacity>
                    )}
                    {company.social_media_links.tiktok && (
                      <TouchableOpacity
                        onPress={() => handleSocialMediaPress(company.social_media_links!.tiktok!)}
                        style={styles.socialIconButton}
                      >
                        <Ionicons name="musical-notes" size={20} color="#000000" />
                      </TouchableOpacity>
                    )}
                  </View>
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
                  <>
                    {company.description && <View style={styles.bioSeparator} />}
                    <Text style={styles.bioText}>{company.bio}</Text>
                  </>
                )}
              </View>
            )}


            {/* Contact Information */}
            {(company.website_url || company.email || company.phone || company.location_text || company.address || company.city || company.country) && (
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
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={20} color="#000" />
                    <Text style={styles.contactText}>{company.phone}</Text>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={handlePhonePress}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={20} color="#22c55e" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Location - prefer structured fields, fallback to location_text */}
                {(company.address || company.city || company.country || company.location_text) && (
                  <View style={styles.contactItem}>
                    <Ionicons name="location-outline" size={20} color="#000" />
                    <Text style={styles.contactText}>
                      {(() => {
                        const parts: string[] = [];
                        if (company.address) parts.push(company.address);
                        if (company.city) parts.push(company.city);
                        if (company.country) parts.push(company.country);
                        return parts.length > 0 ? parts.join(', ') : company.location_text || '';
                      })()}
                    </Text>
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
                  Services We Provide {((!readOnly || servicesRequested) && services.length > 0) ? `(${services.length})` : ''}
                </Text>
                {/* STRICT READ-ONLY: Manage Services button completely removed when readOnly is true */}
                {!readOnly && canEdit() && onManageServices && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => onManageServices(company)}
                  >
                    <Ionicons name="settings-outline" size={18} color="#000" />
                    <Text style={styles.manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
                {readOnly && !servicesRequested && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => loadServices(company.id)}
                  >
                    <Ionicons name="download-outline" size={18} color="#000" />
                    <Text style={styles.manageButtonText}>Load</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingServices ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (!readOnly || servicesRequested) && services.length > 0 ? (
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
                  <Text style={styles.emptyStateText}>
                    {readOnly && !servicesRequested ? 'Tap "Load" to view services' : 'No services added yet'}
                  </Text>
                  {/* STRICT READ-ONLY: Add Services button completely removed when readOnly is true */}
                  {!readOnly && canEdit() && onManageServices && (
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
                <View style={styles.memberActionButtons}>
                  {/* STRICT READ-ONLY: Manage Members button completely removed when readOnly is true */}
                  {!readOnly && canEdit() && company.approval_status === 'approved' && (
                    <TouchableOpacity
                      style={styles.manageButton}
                      onPress={() => handleManageMembers(company)}
                    >
                      <Ionicons name="settings-outline" size={18} color="#000" />
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                  )}
                {/* STRICT READ-ONLY: Invite Member button completely removed when readOnly is true */}
                {!readOnly && canEdit() && company.approval_status === 'approved' && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => handleInviteMember(company)}
                  >
                    <Ionicons name="person-add-outline" size={18} color="#000" />
                    <Text style={styles.manageButtonText}>Invite</Text>
                  </TouchableOpacity>
                )}
                </View>
                {readOnly && !membersRequested && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => loadMembers(company.id)}
                  >
                    <Ionicons name="download-outline" size={18} color="#000" />
                    <Text style={styles.manageButtonText}>Load</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadingMembers ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (!readOnly || membersRequested) && members.length > 0 ? (
                <View style={styles.membersList}>
                  {members.map((member) => (
                      <View key={member.user_id} style={styles.memberCard}>
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
                          {/* STRICT READ-ONLY: Member action buttons completely removed when readOnly is true */}
                          {!readOnly && canEdit() && member.role !== 'owner' && (
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
                              {isOwner() && (
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
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#e4e4e7" />
                  <Text style={styles.emptyStateText}>
                    {readOnly && !membersRequested ? 'Tap "Load" to view team members' : 'No members yet'}
                  </Text>
                  {/* STRICT READ-ONLY: Management buttons completely removed when readOnly is true */}
                  {!readOnly && canEdit() && company.approval_status === 'approved' && (
                    <View style={styles.emptyStateButtons}>
                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#3b82f6', marginBottom: 8 }]}
                        onPress={() => handleManageMembers(company)}
                      >
                        <Ionicons name="settings-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.addButtonText}>Manage Members</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleInviteMember(company)}
                      >
                        <Text style={styles.addButtonText}>Invite Members</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Documents Section - Show when company is pending or rejected, allow document upload */}
            {/* STRICT READ-ONLY: Documents section completely removed when readOnly is true */}
            {!readOnly && (company.approval_status === 'pending' || company.approval_status === 'rejected') && (isOwner() || canEdit()) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Documents</Text>
                </View>
                <Text style={styles.description}>
                  Upload required documents to complete your company profile. Documents help speed up the approval process.
                </Text>
                {loadingDocuments ? (
                  <ActivityIndicator size="small" color="#000" style={{ marginTop: 12 }} />
                ) : (
                  <>
                    {/* Show required documents if available */}
                    {company.company_type_info?.required_documents && company.company_type_info.required_documents.length > 0 ? (
                      company.company_type_info.required_documents.map((docType) => {
                        const uploadedDoc = documents.find((d) => d.document_type === docType);
                        return (
                          <View key={docType} style={styles.documentCard}>
                            <View style={styles.documentHeader}>
                              <View style={styles.documentInfo}>
                                <Ionicons
                                  name={uploadedDoc ? 'checkmark-circle' : 'document-text-outline'}
                                  size={20}
                                  color={uploadedDoc ? '#22c55e' : '#71717a'}
                                />
                                <View style={styles.documentText}>
                                  <Text style={styles.documentType}>
                                    {docType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Text>
                                  {uploadedDoc && (
                                    <Text style={styles.documentFileName}>
                                      {uploadedDoc.file_name || 'Uploaded'}
                                      {uploadedDoc.verified && (
                                        <Text style={styles.verifiedBadge}> • Verified</Text>
                                      )}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              {uploadedDoc && (
                                <TouchableOpacity
                                  onPress={() => handleDeleteDocument(uploadedDoc.id)}
                                  style={styles.removeButton}
                                  disabled={uploadingDocument}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                              )}
                            </View>
                            {!uploadedDoc && (
                              <TouchableOpacity
                                style={[styles.uploadButton, uploadingDocument && styles.uploadButtonDisabled]}
                                onPress={() => handleUploadDocument(docType)}
                                disabled={uploadingDocument}
                              >
                                {uploadingDocument ? (
                                  <ActivityIndicator size="small" color="#000" />
                                ) : (
                                  <>
                                    <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                                    <Text style={styles.uploadButtonText}>Upload Document</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      /* If no required documents defined, show a generic upload option */
                      <View style={styles.documentCard}>
                        <Text style={[styles.emptyStateText, { marginBottom: 12 }]}>
                          Upload documents to complete your company profile
                        </Text>
                        <TouchableOpacity
                          style={[styles.uploadButton, uploadingDocument && styles.uploadButtonDisabled]}
                          onPress={() => handleUploadDocument('other')}
                          disabled={uploadingDocument}
                        >
                          {uploadingDocument ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <>
                              <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                              <Text style={styles.uploadButtonText}>Upload Document</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* Show uploaded documents that aren't in required_documents list */}
                    {documents.filter(doc => {
                      const requiredDocs = company.company_type_info?.required_documents || [];
                      return !requiredDocs.includes(doc.document_type);
                    }).length > 0 && (
                      <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Additional Documents</Text>
                        {documents.filter(doc => {
                          const requiredDocs = company.company_type_info?.required_documents || [];
                          return !requiredDocs.includes(doc.document_type);
                        }).map((doc) => (
                          <View key={doc.id} style={styles.documentCard}>
                            <View style={styles.documentHeader}>
                              <View style={styles.documentInfo}>
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                <View style={styles.documentText}>
                                  <Text style={styles.documentType}>
                                    {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Text>
                                  <Text style={styles.documentFileName}>
                                    {doc.file_name || 'Uploaded'}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleDeleteDocument(doc.id)}
                                style={styles.removeButton}
                                disabled={uploadingDocument}
                              >
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {documents.length > 0 && company.company_type_info?.required_documents && company.company_type_info.required_documents.length > 0 && (
                      <View style={styles.documentsProgress}>
                        <Text style={styles.progressText}>
                          {documents.filter(d => company.company_type_info?.required_documents?.includes(d.document_type)).length} of {company.company_type_info.required_documents.length} required documents uploaded
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Additional Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
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
          </>
        )}
      </ScrollView>

      {/* STRICT READ-ONLY: Grant Certification Modal completely removed when readOnly is true */}
      {!readOnly && company && (
        <GrantCertificationModal
          visible={showGrantCertificationModal}
          onClose={() => {
            setShowGrantCertificationModal(false);
            setSelectedUserIdForCertification(null);
          }}
          company={company}
          preselectedUserId={selectedUserIdForCertification || undefined}
          onCertificationGranted={() => {
            if (company.id) {
              loadCertifications(company.id);
            }
          }}
        />
      )}

      {/* STRICT READ-ONLY: Course Registration Modal completely removed when readOnly is true */}
      {!readOnly && company && company.subcategory === 'academy' && canEdit() && (
        <CourseRegistrationModal
          visible={showCourseRegistrationModal}
          onClose={() => setShowCourseRegistrationModal(false)}
          company={company}
          onRegistrationUpdated={() => {
            // Reload courses to update registration counts
            if (company.id) {
              loadCourses(company.id);
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
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
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
  companyNameHeader: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  companyNameHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  companyTypeHeader: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
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
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  logoContainer: {
    marginBottom: 8,
    position: 'relative',
    width: '100%',
  },
  logo: {
    width: '100%',
    height: 280,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: 280,
    borderRadius: 8,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  companyType: {
    fontSize: 13,
    color: '#71717a',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusMessage: {
    fontSize: 11,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 4,
  },
  rejectionBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    width: '100%',
  },
  rejectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 3,
  },
  rejectionText: {
    fontSize: 11,
    color: '#991b1b',
  },
  section: {
    backgroundColor: '#fff',
    padding: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e4e4e7',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  academyImageContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 0,
  },
  academyImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#f4f4f5',
    resizeMode: 'cover',
  },
  academyImagePlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutSection: {
    marginBottom: 12,
  },
  contactSection: {
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 11,
    color: '#000',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  coursesHorizontalScroll: {
    marginTop: 8,
  },
  coursesHorizontalContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
    paddingVertical: 4,
  },
  chatIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  chatIconContainer: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadLogoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#000',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  description: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 18,
    marginBottom: 8,
  },
  bioSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  bioText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  contactText: {
    fontSize: 12,
    color: '#000',
    marginLeft: 10,
    flex: 1,
  },
  callButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    marginLeft: 8,
  },
  socialMediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  socialIconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
  },
  socialMediaList: {
    gap: 8,
  },
  socialMediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialMediaText: {
    fontSize: 14,
    color: '#000',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 3,
    textAlign: 'center',
  },
  membersList: {
    gap: 6,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 2,
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
    fontSize: 10,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberActionButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 8,
    marginBottom: 10,
  },
  emptyStateButtons: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 200,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginLeft: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  infoLabel: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 11,
    color: '#000',
  },
  // Certifications section styles
  certificationsList: {
    gap: 12,
    marginTop: 8,
  },
  // Courses section styles
  coursesList: {
    gap: 12,
    marginTop: 8,
  },
  viewAllButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    marginTop: 12,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  adminManagementButtons: {
    gap: 8,
    marginTop: 8,
  },
  manageRegistrationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  inviteAdminButton: {
    backgroundColor: '#6366f1',
    borderWidth: 2,
    borderColor: '#4f46e5',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  manageRegistrationsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Documents section styles
  documentCard: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentText: {
    marginLeft: 10,
    flex: 1,
  },
  documentType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  documentFileName: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  verifiedBadge: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  removeButton: {
    padding: 6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  documentsProgress: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});

export default CompanyProfilePage;


