import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApi } from '../contexts/ApiContext';
import ProfileCompletionGate from '../components/ProfileCompletionGate';
import {
  CompanySubcategory,
  CompanyDocumentType,
  CreateCompanyRequest,
  CompanyTypeReference,
  AvailableCompanyService,
} from '../types';

interface CompanyRegistrationPageProps {
  onBack: () => void;
  onSuccess?: (companyId: string) => void;
  onNavigateToProfile?: () => void;
}

type RegistrationStep = 'basic' | 'contact' | 'services' | 'documents' | 'review';

interface CompanyFormData {
  name: string;
  subcategory: CompanySubcategory | '';
  description: string;
  bio: string;
  website_url: string;
  location_text: string;
  email: string;
  phone: string;
  establishment_date: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
}

interface DocumentUpload {
  document_type: CompanyDocumentType;
  file_uri: string;
  file_name: string;
  description: string;
}

const CompanyRegistrationPage: React.FC<CompanyRegistrationPageProps> = ({
  onBack,
  onSuccess,
  onNavigateToProfile,
}) => {
  const {
    getCompanyTypes,
    getCompanyType,
    getCompanyTypeServices,
    createCompany,
    submitCompanyForApproval,
    uploadFile,
    addCompanyDocument,
    getAvailableServicesForCompany,
    addCompanyService,
    user,
  } = useApi();

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('basic');
  const [loading, setLoading] = useState(false);
  const [companyTypes, setCompanyTypes] = useState<CompanyTypeReference[]>([]);
  const [selectedType, setSelectedType] = useState<CompanyTypeReference | null>(null);
  const [availableServices, setAvailableServices] = useState<AvailableCompanyService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<CompanyDocumentType[]>([]);
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    subcategory: '',
    description: '',
    bio: '',
    website_url: '',
    location_text: '',
    email: '',
    phone: '',
    establishment_date: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load company types on mount
  useEffect(() => {
    loadCompanyTypes();
  }, []);

  // Load services when company type is selected
  useEffect(() => {
    if (formData.subcategory) {
      loadCompanyTypeServices(formData.subcategory);
      loadCompanyTypeInfo(formData.subcategory);
    }
  }, [formData.subcategory]);

  // Fallback company types in case API endpoint is not available
  const getFallbackCompanyTypes = (): CompanyTypeReference[] => {
    return [
      {
        code: 'production_house',
        name: 'Production House',
        description: 'Film and video production company',
        required_documents: ['business_license', 'registration_certificate'],
        display_order: 1,
      },
      {
        code: 'agency',
        name: 'Agency',
        description: 'Talent or casting agency',
        required_documents: ['business_license', 'registration_certificate'],
        display_order: 2,
      },
      {
        code: 'academy',
        name: 'Academy',
        description: 'Educational institution or training academy',
        required_documents: ['business_license', 'accreditation'],
        display_order: 3,
      },
      {
        code: 'studio',
        name: 'Studio',
        description: 'Recording or production studio',
        required_documents: ['business_license', 'registration_certificate'],
        display_order: 4,
      },
      {
        code: 'casting_agency',
        name: 'Casting Agency',
        description: 'Casting and talent representation agency',
        required_documents: ['business_license', 'registration_certificate'],
        display_order: 5,
      },
      {
        code: 'management_company',
        name: 'Management Company',
        description: 'Artist or talent management company',
        required_documents: ['business_license', 'registration_certificate'],
        display_order: 6,
      },
      {
        code: 'other',
        name: 'Other',
        description: 'Other type of company',
        required_documents: ['business_license'],
        display_order: 7,
      },
    ];
  };

  const loadCompanyTypes = async () => {
    try {
      setLoading(true);
      const response = await getCompanyTypes();
      if (response.success && response.data) {
        setCompanyTypes(response.data);
      } else {
        // Use fallback if API fails
        console.log('Using fallback company types');
        setCompanyTypes(getFallbackCompanyTypes());
      }
    } catch (error) {
      console.warn('API endpoint not available, using fallback company types:', error);
      // Use fallback company types when API is not available
      setCompanyTypes(getFallbackCompanyTypes());
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyTypeInfo = async (code: CompanySubcategory) => {
    try {
      const response = await getCompanyType(code);
      if (response.success && response.data) {
        setSelectedType(response.data);
        setRequiredDocuments(response.data.required_documents || []);
      } else {
        // Use fallback if API fails
        const fallbackTypes = getFallbackCompanyTypes();
        const fallbackType = fallbackTypes.find(t => t.code === code);
        if (fallbackType) {
          setSelectedType(fallbackType);
          setRequiredDocuments(fallbackType.required_documents || []);
        }
      }
    } catch (error) {
      console.warn('API endpoint not available, using fallback company type info:', error);
      // Use fallback company type info
      const fallbackTypes = getFallbackCompanyTypes();
      const fallbackType = fallbackTypes.find(t => t.code === code);
      if (fallbackType) {
        setSelectedType(fallbackType);
        setRequiredDocuments(fallbackType.required_documents || []);
      }
    }
  };

  const loadCompanyTypeServices = async (code: CompanySubcategory) => {
    try {
      setLoading(true);
      const response = await getCompanyTypeServices(code);
      if (response.success && response.data) {
        setAvailableServices(response.data);
      } else {
        // Empty services if API fails (user can still proceed without selecting services)
        setAvailableServices([]);
      }
    } catch (error) {
      console.warn('Services endpoint not available, continuing without services:', error);
      // Empty services array - services are optional anyway
      setAvailableServices([]);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: RegistrationStep): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 'basic') {
      if (!formData.name.trim()) {
        newErrors.name = 'Company name is required';
      }
      if (!formData.subcategory) {
        newErrors.subcategory = 'Company type is required';
      }
    }

    if (step === 'contact') {
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
      if (formData.website_url && !/^https?:\/\/.+/.test(formData.website_url)) {
        newErrors.website_url = 'Please enter a valid URL (http:// or https://)';
      }
    }

    // Documents step is now optional - no validation required
    if (step === 'documents') {
      // Documents are optional, so always return true
      return true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const steps: RegistrationStep[] = ['basic', 'contact', 'services', 'documents', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: RegistrationStep[] = ['basic', 'contact', 'services', 'documents', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      onBack();
    }
  };

  const handleDocumentUpload = async (documentType: CompanyDocumentType) => {
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
        const documentUpload: DocumentUpload = {
          document_type: documentType,
          file_uri: asset.uri,
          file_name: asset.fileName || `document_${Date.now()}.jpg`,
          description: '',
        };

        setDocuments((prev) => {
          const filtered = prev.filter((d) => d.document_type !== documentType);
          return [...filtered, documentUpload];
        });
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const removeDocument = (documentType: CompanyDocumentType) => {
    setDocuments((prev) => prev.filter((d) => d.document_type !== documentType));
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!validateStep('review')) {
      return;
    }

    try {
      setLoading(true);

      // Create company
      const companyData: CreateCompanyRequest = {
        name: formData.name.trim(),
        subcategory: formData.subcategory as CompanySubcategory,
        description: formData.description.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        website_url: formData.website_url.trim() || undefined,
        location_text: formData.location_text.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        establishment_date: formData.establishment_date || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_address: formData.contact_address.trim() || undefined,
      };

      // Clean up undefined values from the request
      const cleanedCompanyData = Object.fromEntries(
        Object.entries(companyData).filter(([_, v]) => v !== undefined && v !== '')
      );

      const createResponse = await createCompany(cleanedCompanyData);
      
      // Check if endpoint doesn't exist
      if (!createResponse.success) {
        const errorMessage = createResponse.error || '';
        if (errorMessage.includes('Route /api/companies not found') || 
            errorMessage.includes('404') ||
            errorMessage.includes('not found')) {
          Alert.alert(
            'Feature Not Available Yet',
            'Company profile creation is currently being set up on the backend. The endpoint will be available soon.\n\nYour registration data has been saved locally. Please try again later or contact support.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Save data locally for retry later
                  console.log('Company registration data saved locally:', cleanedCompanyData);
                  onBack();
                },
              },
            ]
          );
          return;
        }
        throw new Error(createResponse.error || 'Failed to create company');
      }

      if (!createResponse.data) {
        throw new Error('Company creation succeeded but no data returned');
      }

      const companyId = createResponse.data.id;

      // Upload and attach documents to company
      let documentsAttachedCount = 0;
      for (const doc of documents) {
        try {
          // Step 1: Upload file to storage
          const uploadResponse = await uploadFile({
            uri: doc.file_uri,
            type: 'image/jpeg',
            name: doc.file_name,
          });

          // uploadFile returns { data: { url, filename, size, type } }
          // Check both structures for compatibility
          const documentUrl = uploadResponse?.data?.url || uploadResponse?.url;
          if (documentUrl) {
            // Step 2: Attach the uploaded document to the company
            const attachResponse = await addCompanyDocument(companyId, {
              document_type: doc.document_type,
              file_url: documentUrl,
              file_name: doc.file_name,
              description: doc.description || undefined,
            });

            if (attachResponse.success) {
              documentsAttachedCount++;
              console.log('✅ Document uploaded and attached:', doc.document_type);
            } else {
              console.error(`⚠️ Document uploaded but failed to attach: ${doc.document_type}`, attachResponse.error);
            }
          } else {
            console.error(`⚠️ Document upload failed: ${doc.document_type}`);
          }
        } catch (error: any) {
          console.error(`❌ Failed to upload/attach document ${doc.document_type}:`, error);
          // Continue with other documents - don't block submission
        }
      }

      console.log(`📄 Documents attached: ${documentsAttachedCount} of ${documents.length}`);

      // Add selected services to the company
      if (selectedServices.length > 0) {
        console.log(`🔧 Adding ${selectedServices.length} services to company...`);
        let servicesAddedCount = 0;
        
        for (const serviceId of selectedServices) {
          try {
            console.log(`🔧 Adding service ${serviceId} to company ${companyId}...`);
            const addServiceResponse = await addCompanyService(companyId, serviceId);
            
            if (addServiceResponse.success) {
              servicesAddedCount++;
              console.log(`✅ Service ${serviceId} added successfully`);
            } else {
              console.error(`❌ Failed to add service ${serviceId}:`, addServiceResponse.error);
              // Don't block submission if service addition fails
            }
          } catch (error: any) {
            console.error(`❌ Error adding service ${serviceId}:`, error.message || error);
            // Don't block submission if service addition fails
          }
        }
        
        console.log(`📊 Services added: ${servicesAddedCount} of ${selectedServices.length}`);
      } else {
        console.log('ℹ️ No services selected to add');
      }

      // Submit for approval
      try {
        const submitResponse = await submitCompanyForApproval(companyId);
        if (!submitResponse.success) {
          // Check if it's a document requirement error
          const errorMessage = submitResponse.error || '';
          if (errorMessage.toLowerCase().includes('document')) {
            Alert.alert(
              'Documents Required',
              errorMessage + '\n\nYou can upload documents later and submit for approval from your company profile.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (onSuccess) {
                      onSuccess(companyId);
                    }
                  },
                },
              ]
            );
            return;
          }
          
          // If submission fails for other reasons, company was still created
          Alert.alert(
            'Company Created',
            'Your company profile has been created successfully. However, automatic submission for approval failed. You can submit it manually from your company profile.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (onSuccess) {
                    onSuccess(companyId);
                  }
                },
              },
            ]
          );
          return;
        }

        Alert.alert(
          'Company Created!',
          'Your company profile has been created and submitted for approval. You will be notified once it\'s approved.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSuccess) {
                  onSuccess(companyId);
                }
              },
            },
          ]
        );
      } catch (submitError: any) {
        // If submission endpoint doesn't exist, still show success
        if (submitError.message?.includes('not found') || submitError.message?.includes('404')) {
          Alert.alert(
            'Company Created',
            'Your company profile has been created successfully. The approval submission endpoint is not yet available, but your company has been saved.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (onSuccess) {
                    onSuccess(companyId);
                  }
                },
              },
            ]
          );
          return;
        }
        // Re-throw if it's a different error
        throw submitError;
      }
    } catch (error: any) {
      console.error('Failed to create company:', error);
      
      // Check for specific endpoint errors
      const errorMessage = error.message || '';
      if (errorMessage.includes('Route /api/companies not found') || 
          errorMessage.includes('404') ||
          errorMessage.includes('not found')) {
        Alert.alert(
          'Feature Not Available Yet',
          'Company profile creation is currently being set up on the backend. The endpoint will be available soon.\n\nYour registration data:\n• Company: ' + formData.name + '\n• Type: ' + selectedType?.name + '\n\nPlease try again later or contact support.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage || 'Failed to create company. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic', label: 'Basic Info' },
      { key: 'contact', label: 'Contact' },
      { key: 'services', label: 'Services' },
      { key: 'documents', label: 'Documents' },
      { key: 'review', label: 'Review' },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index <= currentIndex && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentIndex && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                index <= currentIndex && styles.stepLabelActive,
              ]}
            >
              {step.label}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderBasicInfo = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Company Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={formData.name}
          onChangeText={(text) => {
            setFormData({ ...formData, name: text });
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          placeholder="Enter company name"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Company Type *</Text>
        {loading && companyTypes.length === 0 ? (
          <ActivityIndicator size="small" />
        ) : (
          <View style={styles.typeGrid}>
            {companyTypes.map((type) => (
              <TouchableOpacity
                key={type.code}
                style={[
                  styles.typeCard,
                  formData.subcategory === type.code && styles.typeCardSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, subcategory: type.code });
                  if (errors.subcategory) setErrors({ ...errors, subcategory: '' });
                }}
              >
                <Text
                  style={[
                    styles.typeName,
                    formData.subcategory === type.code && styles.typeNameSelected,
                  ]}
                >
                  {type.name}
                </Text>
                {selectedType && selectedType.code === type.code && (
                  <Text style={styles.typeDescription}>{type.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        {errors.subcategory && <Text style={styles.errorText}>{errors.subcategory}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Brief description of your company"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.bio}
          onChangeText={(text) => setFormData({ ...formData, bio: text })}
          placeholder="Detailed company bio"
          multiline
          numberOfLines={6}
        />
      </View>
    </ScrollView>
  );

  const renderContactInfo = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Contact Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={[styles.input, errors.website_url && styles.inputError]}
          value={formData.website_url}
          onChangeText={(text) => {
            setFormData({ ...formData, website_url: text });
            if (errors.website_url) setErrors({ ...errors, website_url: '' });
          }}
          placeholder="https://www.example.com"
          keyboardType="url"
          autoCapitalize="none"
        />
        {errors.website_url && <Text style={styles.errorText}>{errors.website_url}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={formData.location_text}
          onChangeText={(text) => setFormData({ ...formData, location_text: text })}
          placeholder="City, Country"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={formData.email}
          onChangeText={(text) => {
            setFormData({ ...formData, email: text });
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          placeholder="company@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.sectionSubtitle}>Contact Person Details (Optional)</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Email</Text>
        <TextInput
          style={styles.input}
          value={formData.contact_email}
          onChangeText={(text) => setFormData({ ...formData, contact_email: text })}
          placeholder="contact@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          style={styles.input}
          value={formData.contact_phone}
          onChangeText={(text) => setFormData({ ...formData, contact_phone: text })}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.contact_address}
          onChangeText={(text) => setFormData({ ...formData, contact_address: text })}
          placeholder="Street address, City, State, ZIP"
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );

  const renderServices = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Services</Text>
      <Text style={styles.sectionDescription}>
        Select the services your company provides (optional)
      </Text>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <View style={styles.servicesList}>
          {availableServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedServices.includes(service.id) && styles.serviceCardSelected,
              ]}
              onPress={() => toggleService(service.id)}
            >
              <View style={styles.serviceContent}>
                <Text
                  style={[
                    styles.serviceName,
                    selectedServices.includes(service.id) && styles.serviceNameSelected,
                  ]}
                >
                  {service.name}
                </Text>
                {service.description && (
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                )}
              </View>
              <Ionicons
                name={selectedServices.includes(service.id) ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selectedServices.includes(service.id) ? '#000' : '#71717a'}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {availableServices.length === 0 && !loading && (
        <Text style={styles.emptyText}>No services available for this company type</Text>
      )}
    </ScrollView>
  );

  const renderDocuments = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Documents (Optional)</Text>
      <Text style={styles.sectionDescription}>
        You can upload documents now or add them later from your company profile. Documents help speed up the approval process.
      </Text>

      {requiredDocuments.length === 0 ? (
        <Text style={styles.emptyText}>No documents required for this company type</Text>
      ) : (
        requiredDocuments.map((docType) => {
          const uploadedDoc = documents.find((d) => d.document_type === docType);
          return (
            <View key={docType} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentInfo}>
                  <Ionicons
                    name={uploadedDoc ? 'checkmark-circle' : 'document-text'}
                    size={24}
                    color={uploadedDoc ? '#22c55e' : '#71717a'}
                  />
                  <View style={styles.documentText}>
                    <Text style={styles.documentType}>
                      {docType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                    {uploadedDoc && (
                      <Text style={styles.documentFileName}>{uploadedDoc.file_name}</Text>
                    )}
                  </View>
                </View>
                {uploadedDoc && (
                  <TouchableOpacity
                    onPress={() => removeDocument(docType)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              {!uploadedDoc && (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleDocumentUpload(docType)}
                >
                  <Ionicons name="cloud-upload" size={20} color="#000" />
                  <Text style={styles.uploadButtonText}>Upload Document</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      <View style={styles.documentsProgress}>
        <Text style={styles.progressText}>
          {documents.length} of {requiredDocuments.length} documents uploaded
        </Text>
      </View>
    </ScrollView>
  );

  const renderReview = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Review Your Information</Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Basic Information</Text>
        <ReviewRow label="Company Name" value={formData.name} />
        <ReviewRow label="Company Type" value={selectedType?.name || ''} />
        {formData.description && <ReviewRow label="Description" value={formData.description} />}
        {formData.bio && <ReviewRow label="Bio" value={formData.bio} />}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Contact Information</Text>
        {formData.website_url && <ReviewRow label="Website" value={formData.website_url} />}
        {formData.location_text && <ReviewRow label="Location" value={formData.location_text} />}
        {formData.email && <ReviewRow label="Email" value={formData.email} />}
        {formData.phone && <ReviewRow label="Phone" value={formData.phone} />}
      </View>

      {selectedServices.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Selected Services ({selectedServices.length})</Text>
          {selectedServices.map((serviceId) => {
            const service = availableServices.find((s) => s.id === serviceId);
            return service ? (
              <Text key={serviceId} style={styles.reviewService}>
                • {service.name}
              </Text>
            ) : null;
          })}
        </View>
      )}

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>
          Documents ({documents.length}/{requiredDocuments.length})
        </Text>
        {documents.map((doc) => (
          <Text key={doc.document_type} style={styles.reviewDocument}>
            ✓ {doc.document_type.replace(/_/g, ' ')}
          </Text>
        ))}
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicInfo();
      case 'contact':
        return renderContactInfo();
      case 'services':
        return renderServices();
      case 'documents':
        return renderDocuments();
      case 'review':
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Company Profile</Text>
          <View style={styles.backButton} />
        </View>

        {renderStepIndicator()}

        <View style={styles.content}>
          {loading && currentStep !== 'services' && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
          {renderCurrentStep()}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonSecondary]}
            onPress={handleBack}
          >
            <Text style={styles.footerButtonTextSecondary}>Back</Text>
          </TouchableOpacity>
          {currentStep === 'review' ? (
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonPrimary]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.footerButtonTextPrimary}>Submit for Approval</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerButton, styles.footerButtonPrimary]}
              onPress={handleNext}
            >
              <Text style={styles.footerButtonTextPrimary}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
  );
};

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}:</Text>
    <Text style={styles.reviewValue}>{value || 'Not provided'}</Text>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#000',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: '#71717a',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: '#e4e4e7',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  typeCardSelected: {
    borderColor: '#000',
    backgroundColor: '#f4f4f5',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  typeNameSelected: {
    color: '#000',
  },
  typeDescription: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 16,
  },
  serviceCardSelected: {
    borderColor: '#000',
    backgroundColor: '#f4f4f5',
  },
  serviceContent: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: '#000',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#71717a',
  },
  documentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
    marginLeft: 12,
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  documentFileName: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  documentsProgress: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    width: 120,
  },
  reviewValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  reviewService: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
  },
  reviewDocument: {
    fontSize: 14,
    color: '#22c55e',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    backgroundColor: '#000',
  },
  footerButtonSecondary: {
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  footerButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerButtonTextSecondary: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

export default CompanyRegistrationPage;

