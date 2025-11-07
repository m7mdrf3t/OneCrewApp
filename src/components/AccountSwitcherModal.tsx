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

  useEffect(() => {
    if (visible && user?.id) {
      loadCompanies();
    }
  }, [visible, user?.id]);

  const loadCompanies = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await getUserCompanies(user.id);
      if (response.success && response.data) {
        const companiesList = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        // Debug: Log the structure to understand the data format
        if (companiesList.length > 0) {
          console.log('📊 Company data structure:', JSON.stringify(companiesList[0], null, 2));
        }
        // Filter to only show companies where user is owner
        const ownedCompanies = companiesList.filter((company: any) => {
          const role = company.role || company.member?.role || company.company_member?.role;
          return role === 'owner';
        });
        setCompanies(ownedCompanies);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToUser = async () => {
    if (currentProfileType === 'user') {
      onClose();
      return;
    }
    try {
      setSwitching('user');
      await switchToUserProfile();
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

  const getCompanyData = (company: any) => {
    // Handle different API response structures:
    // 1. company.company (most common from getUserCompanies)
    // 2. company.companies (alternative structure)
    // 3. company itself (if already the company object)
    return company.company || company.companies || company;
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
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
                          <Text style={styles.accountType}>Company</Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
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
    padding: 20,
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

