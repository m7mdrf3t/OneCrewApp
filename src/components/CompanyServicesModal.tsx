import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Company, AvailableCompanyService, CompanyService } from '../types';
import { spacing, semanticSpacing } from '../constants/spacing';

interface CompanyServicesModalProps {
  visible: boolean;
  company: Company;
  onClose: () => void;
  onServicesUpdated?: () => void;
}

const CompanyServicesModal: React.FC<CompanyServicesModalProps> = ({
  visible,
  company,
  onClose,
  onServicesUpdated,
}) => {
  const {
    getAvailableServicesForCompany,
    getCompanyServices,
    addCompanyService,
    removeCompanyService,
    getCompanyTypeServices,
  } = useApi();

  const [availableServices, setAvailableServices] = useState<AvailableCompanyService[]>([]);
  const [currentServices, setCurrentServices] = useState<CompanyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && company?.id) {
      loadServices();
    } else {
      // Reset state when modal closes
      setSelectedServices(new Set());
      setSearchQuery('');
    }
  }, [visible, company?.id]);

  const loadServices = async () => {
    try {
      setLoading(true);

      console.log('🏢 Loading services for company:', company.id);
      console.log('🏢 Company data:', JSON.stringify(company, null, 2));

      // Load both available services and current services in parallel
      const [availableResponse, currentResponse] = await Promise.all([
        getAvailableServicesForCompany(company.id),
        getCompanyServices(company.id),
      ]);

      console.log('📦 Available services response:', JSON.stringify(availableResponse, null, 2));
      console.log('📦 Current services response:', JSON.stringify(currentResponse, null, 2));

      // Handle available services response
      let services: AvailableCompanyService[] = [];
      
      if (availableResponse.success) {
        // Try different response structures
        if (Array.isArray(availableResponse.data)) {
          services = availableResponse.data;
        } else if (Array.isArray(availableResponse.data?.data)) {
          services = availableResponse.data.data;
        } else if (Array.isArray(availableResponse.data?.services)) {
          services = availableResponse.data.services;
        } else if (availableResponse.data && typeof availableResponse.data === 'object') {
          // If data is an object, check if it has a services property or is a single service
          if (Array.isArray(availableResponse.data.items)) {
            services = availableResponse.data.items;
          } else if (availableResponse.data.name) {
            // Single service object
            services = [availableResponse.data];
          }
        }
        
        console.log('✅ Parsed available services from getAvailableServicesForCompany:', services.length);
      } else {
        console.error('❌ Failed to get available services:', availableResponse.error);
      }
      
      // Fallback: If no services found and company has subcategory, try getCompanyTypeServices
      if (services.length === 0 && company.subcategory) {
        console.log('⚠️ No services from getAvailableServicesForCompany, trying getCompanyTypeServices with subcategory:', company.subcategory);
        try {
          const typeServicesResponse = await getCompanyTypeServices(company.subcategory);
          if (typeServicesResponse.success && typeServicesResponse.data) {
            if (Array.isArray(typeServicesResponse.data)) {
              services = typeServicesResponse.data;
            } else if (Array.isArray(typeServicesResponse.data?.data)) {
              services = typeServicesResponse.data.data;
            }
            console.log('✅ Got services from getCompanyTypeServices:', services.length);
          }
        } catch (error) {
          console.error('❌ Failed to get services from getCompanyTypeServices:', error);
        }
      }
      
      console.log('✅ Final available services:', services.length, services);
      setAvailableServices(services);
      
      if (services.length === 0) {
        console.warn('⚠️ No available services found after all attempts. Company:', {
          id: company.id,
          subcategory: company.subcategory,
          company_type_info: company.company_type_info,
        });
      }

      // Handle current services response
      if (currentResponse.success) {
        let services: CompanyService[] = [];
        
        // Try different response structures
        if (Array.isArray(currentResponse.data)) {
          services = currentResponse.data;
        } else if (Array.isArray(currentResponse.data?.data)) {
          services = currentResponse.data.data;
        } else if (Array.isArray(currentResponse.data?.services)) {
          services = currentResponse.data.services;
        } else if (currentResponse.data && typeof currentResponse.data === 'object') {
          if (Array.isArray(currentResponse.data.items)) {
            services = currentResponse.data.items;
          }
        }
        
        console.log('✅ Parsed current services:', services.length, services);
        setCurrentServices(services);

        // Initialize selected services with current services
        const currentServiceIds = new Set(
          services
            .map((s: CompanyService) => {
              // Try different possible structures for service ID
              return s.service_id || s.service?.id || s.id || (s.service as any)?.service_id;
            })
            .filter(Boolean)
        );
        console.log('✅ Current service IDs:', Array.from(currentServiceIds));
        setSelectedServices(currentServiceIds);
      } else {
        console.error('❌ Failed to get current services:', currentResponse.error);
      }
    } catch (error: any) {
      console.error('❌ Failed to load services:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Failed to load services: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const currentServiceIds = new Set(
        currentServices
          .map((s) => {
            // Try different possible structures for service ID
            return s.service_id || s.service?.id || s.id || (s.service as any)?.service_id;
          })
          .filter(Boolean)
      );

      // Find services to add
      const servicesToAdd = Array.from(selectedServices).filter(
        (id) => !currentServiceIds.has(id)
      );

      // Find services to remove
      const servicesToRemove = Array.from(currentServiceIds).filter(
        (id) => !selectedServices.has(id)
      );

      // Add new services
      const addPromises = servicesToAdd.map((serviceId) =>
        addCompanyService(company.id, serviceId)
      );

      // Remove services
      const removePromises = servicesToRemove.map((serviceId) => {
        const companyService = currentServices.find(
          (s) => (s.service_id || s.service?.id) === serviceId
        );
        return companyService
          ? removeCompanyService(company.id, companyService.service_id || serviceId)
          : Promise.resolve({ success: true });
      });

      await Promise.all([...addPromises, ...removePromises]);

      Alert.alert('Success', 'Services updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            onServicesUpdated?.();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Failed to save services:', error);
      Alert.alert('Error', 'Failed to save services. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = availableServices.filter((service) =>
    searchQuery
      ? service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const isServiceSelected = (serviceId: string) => selectedServices.has(serviceId);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Services</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Services List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : (
            <ScrollView style={styles.servicesList} showsVerticalScrollIndicator={false}>
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => {
                  const serviceId = service.id;
                  const selected = isServiceSelected(serviceId);

                  return (
                    <TouchableOpacity
                      key={serviceId}
                      style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                      onPress={() => toggleService(serviceId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.serviceContent}>
                        {service.icon_name && (
                          <Ionicons
                            name={getValidIconName(service.icon_name) as any}
                            size={24}
                            color={selected ? '#000' : '#71717a'}
                            style={styles.serviceIcon}
                          />
                        )}
                        <View style={styles.serviceInfo}>
                          <Text
                            style={[
                              styles.serviceName,
                              selected && styles.serviceNameSelected,
                            ]}
                          >
                            {service.name}
                          </Text>
                          {service.description && (
                            <Text style={styles.serviceDescription} numberOfLines={2}>
                              {service.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'circle-outline'}
                        size={24}
                        color={selected ? '#000' : '#71717a'}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={48} color="#e4e4e7" />
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'No services found matching your search'
                      : 'No services available for this company type'}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, saving && styles.buttonDisabled]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: semanticSpacing.containerPaddingLarge,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: 10,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717a',
  },
  servicesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: semanticSpacing.containerPaddingLarge,
    marginBottom: semanticSpacing.containerPadding,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e4e4e7',
  },
  serviceCardSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#000',
  },
  serviceContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: '#000',
    fontWeight: '700',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 18,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    gap: semanticSpacing.containerPadding,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CompanyServicesModal;

