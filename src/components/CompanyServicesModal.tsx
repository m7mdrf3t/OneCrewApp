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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && company?.id) {
      // Reset state before loading
      setAvailableServices([]);
      setCurrentServices([]);
      setSelectedServices(new Set());
      setSearchQuery('');
      setLoading(true);
      loadServices();
    }
  }, [visible, company?.id]);

  // Debug: Log when availableServices changes
  useEffect(() => {
    console.log('🔄 availableServices state updated:', availableServices.length, availableServices);
  }, [availableServices]);

  const loadServices = async () => {
    if (!company?.id) {
      console.error('❌ No company ID provided');
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      console.log('🏢 Loading services for company:', company.id);
      console.log('🏢 Company data:', JSON.stringify(company, null, 2));

      // Load both available services and current services in parallel
      let availableResponse: any = { success: false, error: 'Not loaded yet' };
      let currentResponse: any = { success: false, error: 'Not loaded yet' };

      try {
        [availableResponse, currentResponse] = await Promise.allSettled([
          getAvailableServicesForCompany(company.id),
          getCompanyServices(company.id),
        ]).then(results => {
          return results.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              console.error(`❌ Error loading ${index === 0 ? 'available' : 'current'} services:`, result.reason);
              return { 
                success: false, 
                error: result.reason?.message || String(result.reason) || 'Unknown error', 
                data: null 
              };
            }
          });
        });
      } catch (error: any) {
        console.error('❌ Error loading services:', error);
        Alert.alert('Error', `Failed to load services: ${error?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

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
          if (Array.isArray(availableResponse.data.items)) {
            services = availableResponse.data.items;
          }
        }
        
        console.log('✅ Parsed available services from getAvailableServicesForCompany:', services.length);
        
        // If no services found, try fallback methods
        if (services.length === 0) {
          console.log('⚠️ No services from getAvailableServicesForCompany, trying fallback...');
          
          // Fallback 1: Try getCompanyTypeServices with subcategory
          if (company.subcategory) {
            console.log('🔄 Trying getCompanyTypeServices with subcategory:', company.subcategory);
            try {
              const fallbackResponse = await getCompanyTypeServices(company.subcategory);
              if (fallbackResponse.success && Array.isArray(fallbackResponse.data)) {
                services = fallbackResponse.data;
                console.log('✅ Got services from getCompanyTypeServices (subcategory):', services.length);
              }
            } catch (err) {
              console.error('❌ Fallback 1 failed:', err);
            }
          }
          
          // Fallback 2: Try getCompanyTypeServices with company_type_info.code
          if (services.length === 0 && company.company_type_info?.code) {
            console.log('🔄 Trying getCompanyTypeServices with company_type_info.code:', company.company_type_info.code);
            try {
              const fallbackResponse2 = await getCompanyTypeServices(company.company_type_info.code);
              if (fallbackResponse2.success && Array.isArray(fallbackResponse2.data)) {
                services = fallbackResponse2.data;
                console.log('✅ Got services from getCompanyTypeServices (code):', services.length);
              }
            } catch (err) {
              console.error('❌ Fallback 2 failed:', err);
            }
          }
        }
        
        console.log('✅ Final available services:', services.length, services);
        setAvailableServices(services);
        
        // Don't show alert immediately - let the user see the empty state in the UI
        if (services.length === 0) {
          const errorInfo = {
            availableResponseError: availableResponse.error,
            currentResponseError: currentResponse.error,
            companySubcategory: company.subcategory,
            companyTypeCode: company.company_type_info?.code,
          };
          console.warn('⚠️ No available services found after all attempts. Company:', {
            id: company.id,
            subcategory: company.subcategory,
            company_type_info: company.company_type_info,
            'company_type_info.code': company.company_type_info?.code,
            errorInfo,
          });
          setLoadError(
            availableResponse.error 
              ? `Error: ${availableResponse.error}` 
              : 'No services available for this company type'
          );
        } else {
          setLoadError(null);
        }
      } else {
        console.error('❌ Failed to get available services:', availableResponse.error);
        setLoadError(availableResponse.error || 'Failed to load available services');
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
              // Priority: service_id (from company_service table) > service.id (from service object)
              const serviceId = s.service_id || s.service?.id || (s.service as any)?.service_id;
              console.log('🔍 Extracting current service ID from:', {
                service_id: s.service_id,
                'service.id': s.service?.id,
                extracted: serviceId
              });
              return serviceId;
            })
            .filter(Boolean)
        );
        console.log('✅ Current service IDs initialized:', Array.from(currentServiceIds));
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

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSelectedServices(new Set());
      setSearchQuery('');
      setAvailableServices([]);
      setCurrentServices([]);
    }
  }, [visible, company?.id]);

  const handleSave = async () => {
    try {
      setSaving(true);

      console.log('💾 Saving services for company:', company.id);
      console.log('📋 Current services:', currentServices);
      console.log('✅ Selected services:', Array.from(selectedServices));

      // Extract current service IDs - try multiple possible structures
      const currentServiceIds = new Set(
        currentServices
          .map((s) => {
            // Try different possible structures for service ID
            const serviceId = s.service_id || s.service?.id || (s.service as any)?.service_id;
            console.log('🔍 Extracting service ID from:', s, '→', serviceId);
            return serviceId;
          })
          .filter(Boolean)
      );

      console.log('📊 Current service IDs:', Array.from(currentServiceIds));

      // Find services to add
      const servicesToAdd = Array.from(selectedServices).filter(
        (id) => !currentServiceIds.has(id)
      );

      // Find services to remove
      const servicesToRemove = Array.from(currentServiceIds).filter(
        (id) => !selectedServices.has(id)
      );

      console.log('➕ Services to add:', servicesToAdd);
      console.log('➖ Services to remove:', servicesToRemove);

      if (servicesToAdd.length === 0 && servicesToRemove.length === 0) {
        Alert.alert('Info', 'No changes to save');
        setSaving(false);
        return;
      }

      // Add new services
      const addResults = await Promise.allSettled(
        servicesToAdd.map((serviceId) =>
          addCompanyService(company.id, serviceId)
        )
      );

      // Log add results
      addResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            console.log(`✅ Successfully added service ${servicesToAdd[index]}`);
          } else {
            console.error(`❌ Failed to add service ${servicesToAdd[index]}:`, result.value.error);
          }
        } else {
          console.error(`❌ Error adding service ${servicesToAdd[index]}:`, result.reason);
        }
      });

      // Remove services - need to find the correct service_id for removal
      const removeResults = await Promise.allSettled(
        servicesToRemove.map((serviceId) => {
          // Find the company service object to get the correct service_id
          // The serviceId here is the service.id from available services
          // We need to find the CompanyService that has this service_id
          const companyService = currentServices.find((s) => {
            // service_id in CompanyService is the actual service ID we need
            const sId = s.service_id || s.service?.id;
            const matches = sId === serviceId;
            console.log(`🔍 Matching removal: serviceId=${serviceId}, companyService.service_id=${s.service_id}, companyService.service?.id=${s.service?.id}, matches=${matches}`);
            return matches;
          });
          
          if (!companyService) {
            console.warn(`⚠️ Could not find company service for ID: ${serviceId}`);
            console.warn(`⚠️ Available current services:`, currentServices.map(s => ({
              service_id: s.service_id,
              'service.id': s.service?.id
            })));
            return Promise.resolve({ success: false, error: `Service not found: ${serviceId}` });
          }

          // Use service_id from CompanyService - this is what the API expects
          const idToRemove = companyService.service_id;
          if (!idToRemove) {
            console.error(`❌ CompanyService has no service_id:`, companyService);
            return Promise.resolve({ success: false, error: 'Service ID not found in company service' });
          }
          
          console.log(`🗑️ Removing service: service_id=${idToRemove} (matched from serviceId=${serviceId})`);
          
          return removeCompanyService(company.id, idToRemove);
        })
      );

      // Log remove results
      removeResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            console.log(`✅ Successfully removed service ${servicesToRemove[index]}`);
          } else {
            console.error(`❌ Failed to remove service ${servicesToRemove[index]}:`, result.value.error);
          }
        } else {
          console.error(`❌ Error removing service ${servicesToRemove[index]}:`, result.reason);
        }
      });

      // Check if any operations failed
      const addFailures = addResults.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );
      const removeFailures = removeResults.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );

      if (addFailures.length > 0 || removeFailures.length > 0) {
        const errorMessages: string[] = [];
        addFailures.forEach((failure, index) => {
          const error = failure.status === 'rejected' 
            ? failure.reason?.message || String(failure.reason)
            : failure.value.error || 'Unknown error';
          errorMessages.push(`Failed to add service: ${error}`);
        });
        removeFailures.forEach((failure, index) => {
          const error = failure.status === 'rejected'
            ? failure.reason?.message || String(failure.reason)
            : failure.value.error || 'Unknown error';
          errorMessages.push(`Failed to remove service: ${error}`);
        });

        Alert.alert(
          'Partial Success',
          `Some services were updated, but some operations failed:\n\n${errorMessages.join('\n')}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onServicesUpdated?.();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Services updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              onServicesUpdated?.();
              onClose();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('❌ Failed to save services:', error);
      const errorMessage = error?.message || error?.error || String(error) || 'Unknown error';
      Alert.alert('Error', `Failed to save services: ${errorMessage}`);
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

  // Debug logging
  console.log('🔍 Filtered services count:', filteredServices.length, 'Available services:', availableServices.length, 'Search query:', searchQuery);

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
            <ScrollView 
              style={styles.servicesList} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.servicesListContent}
            >
              {/* Debug info */}
              {__DEV__ && (
                <View style={styles.debugInfo}>
                  <Text style={styles.debugText}>
                    Debug: {filteredServices.length} filtered, {availableServices.length} available
                  </Text>
                </View>
              )}
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => {
                  const serviceId = service.id; // This is the service ID from AvailableCompanyService
                  const selected = isServiceSelected(serviceId);

                  console.log('🎯 Rendering service:', {
                    id: service.id,
                    name: service.name,
                    selected,
                    inSelectedSet: selectedServices.has(serviceId)
                  });

                  return (
                    <TouchableOpacity
                      key={serviceId}
                      style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                      onPress={() => {
                        console.log('👆 Toggling service:', serviceId, 'Current state:', selected);
                        toggleService(serviceId);
                      }}
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
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
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
                      : availableServices.length === 0
                      ? 'No services are currently available for this company type. This may be a temporary issue. Please try refreshing or contact support if the problem persists.'
                      : 'No services match your search criteria'}
                  </Text>
                  {!searchQuery && availableServices.length === 0 && (
                    <>
                      {loadError && (
                        <Text style={styles.errorText}>{loadError}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                          setLoadError(null);
                          loadServices();
                        }}
                      >
                        <Ionicons name="refresh" size={16} color="#000" style={{ marginRight: 4 }} />
                        <Text style={styles.retryButtonText}>Retry Loading Services</Text>
                      </TouchableOpacity>
                    </>
                  )}
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
    flexDirection: 'column',
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
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 16,
    minHeight: 200,
  },
  servicesListContent: {
    paddingBottom: 16,
    flexGrow: 1,
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
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  debugInfo: {
    backgroundColor: '#fef3c7',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#92400e',
    fontFamily: 'monospace',
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

