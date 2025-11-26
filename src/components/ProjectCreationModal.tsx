import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  ProjectCreationModalProps, 
  ProjectCreationData, 
  ProjectStage, 
  ProjectType,
  ProjectStatus
} from '../types';
import ReferenceDataService from '../services/ReferenceDataService';
import DatePicker from './DatePicker';
import { spacing, semanticSpacing } from '../constants/spacing';
import MediaPickerService from '../services/MediaPickerService';
import { useApi } from '../contexts/ApiContext';

const { width } = Dimensions.get('window');

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { uploadFile } = useApi();
  const mediaPicker = MediaPickerService.getInstance();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectCreationData>({
    title: '',
    type: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    budget: undefined,
    status: 'planning',
    stages: [],
  });

  // Remove date picker state variables - using text inputs instead

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setFormData({
        title: '',
        type: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        budget: undefined,
        status: 'planning',
        stages: [],
      });
      setCoverImageUri(null);
      setCoverImageUrl(null);
      setCurrentStep(1);
      
      // Fetch reference data
      loadReferenceData();
    }
  }, [visible]);

  const loadReferenceData = async () => {
    try {
      const [types, stages] = await Promise.all([
        ReferenceDataService.getProjectTypes(),
        ReferenceDataService.getProjectStages(),
      ]);
      
      setProjectTypes(types);
      setProjectStages(stages);
      
      // Update form data with stages
      setFormData(prev => ({
        ...prev,
        stages: stages.map(stage => ({ ...stage, isSelected: false })),
      }));
    } catch (error) {
      console.error('Failed to load reference data:', error);
      Alert.alert('Error', 'Failed to load project types and stages');
    }
  };

  const handleInputChange = (field: keyof ProjectCreationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStageToggle = (stageId: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.map(stage =>
        stage.id === stageId
          ? { ...stage, isSelected: !stage.isSelected }
          : stage
      ),
    }));
  };

  const handleStageDateChange = (stageId: string, field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.map(stage =>
        stage.id === stageId
          ? { ...stage, [field]: value }
          : stage
      ),
    }));
  };

  // Date validation helper
  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handlePickCoverImage = async () => {
    try {
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9], // Standard cover image aspect ratio
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (result) {
        // Validate file size (max 10MB)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 10)) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          return;
        }

        setCoverImageUri(result.uri);
        setIsUploadingImage(true);

        // Upload the file
        try {
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `project_cover_${Date.now()}.jpg`,
          });

          if (uploadResult?.data?.url || uploadResult?.url) {
            const imageUrl = uploadResult?.data?.url || uploadResult?.url;
            setCoverImageUrl(imageUrl);
            Alert.alert('Success', 'Cover image uploaded successfully!');
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', 'Failed to upload cover image. Please try again.');
          setCoverImageUri(null);
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const validateStep1 = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a project title');
      return false;
    }
    if (!formData.type) {
      Alert.alert('Error', 'Please select a project type');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a project description');
      return false;
    }
    if (!formData.startDate) {
      Alert.alert('Error', 'Please select a start date');
      return false;
    }
    if (!formData.endDate) {
      Alert.alert('Error', 'Please select an end date');
      return false;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    if (!coverImageUrl) {
      Alert.alert('Error', 'Please upload a cover image for the project');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const selectedStages = formData.stages.filter(stage => stage.isSelected);
    if (selectedStages.length === 0) {
      Alert.alert('Error', 'Please select at least one project stage');
      return false;
    }

    // Validate stage dates are within project timeline
    const projectStart = new Date(formData.startDate);
    const projectEnd = new Date(formData.endDate);

    for (const stage of selectedStages) {
      if (stage.startDate && new Date(stage.startDate) < projectStart) {
        Alert.alert('Error', `${stage.name} start date must be within project timeline`);
        return false;
      }
      if (stage.endDate && new Date(stage.endDate) > projectEnd) {
        Alert.alert('Error', `${stage.name} end date must be within project timeline`);
        return false;
      }
      if (stage.startDate && stage.endDate && new Date(stage.startDate) >= new Date(stage.endDate)) {
        Alert.alert('Error', `${stage.name} end date must be after start date`);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!coverImageUrl) {
      Alert.alert('Error', 'Please upload a cover image for the project');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        coverImageUrl,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Project Details</Text>
      
      {/* Cover Image */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cover Image *</Text>
        <TouchableOpacity
          style={styles.coverImageContainer}
          onPress={handlePickCoverImage}
          disabled={isUploadingImage}
        >
          {coverImageUri ? (
            <View style={styles.coverImageWrapper}>
              <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
              {isUploadingImage && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.uploadText}>Uploading...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#9ca3af" />
              <Text style={styles.coverImagePlaceholderText}>
                {isUploadingImage ? 'Uploading...' : 'Tap to add cover image'}
              </Text>
              {isUploadingImage && (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 8 }} />
              )}
            </View>
          )}
        </TouchableOpacity>
        {coverImageUrl && (
          <Text style={styles.coverImageSuccessText}>
            ✓ Cover image uploaded successfully
          </Text>
        )}
      </View>

      {/* Project Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Title *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.title}
          onChangeText={(value) => handleInputChange('title', value)}
          placeholder="Enter project title"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Project Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Type *</Text>
        <View style={styles.typeGrid}>
          {projectTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                formData.type === type.id && styles.typeCardSelected,
              ]}
              onPress={() => handleInputChange('type', type.id)}
            >
              <Text style={[
                styles.typeName,
                formData.type === type.id && styles.typeNameSelected,
              ]}>
                {type.name}
              </Text>
              <Text style={[
                styles.typeDescription,
                formData.type === type.id && styles.typeDescriptionSelected,
              ]}>
                {type.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          placeholder="Describe your project..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Dates */}
      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <DatePicker
            label="Start Date"
            value={formData.startDate || null}
            onChange={(date) => handleInputChange('startDate', date || '')}
            placeholder="Select start date"
            mode="date"
            required
            style={styles.datePicker}
          />
        </View>

        <View style={styles.dateInput}>
          <DatePicker
            label="End Date"
            value={formData.endDate || null}
            onChange={(date) => handleInputChange('endDate', date || '')}
            placeholder="Select end date"
            mode="date"
            required
            minimumDate={formData.startDate ? new Date(formData.startDate) : undefined}
            style={styles.datePicker}
          />
        </View>
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.location}
          onChangeText={(value) => handleInputChange('location', value)}
          placeholder="Enter filming location"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Budget */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Budget (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={formData.budget?.toString() || ''}
          onChangeText={(value) => handleInputChange('budget', value ? parseFloat(value) : undefined)}
          placeholder="Enter budget amount"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
        />
      </View>

      {/* Project Status */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Project Status *</Text>
        <View style={styles.statusContainer}>
          {(['planning', 'in_production', 'completed', 'on_hold', 'cancelled'] as ProjectStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                formData.status === status && styles.statusOptionSelected,
              ]}
              onPress={() => handleInputChange('status', status)}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  formData.status === status && styles.statusOptionTextSelected,
                ]}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Project Stages</Text>
      <Text style={styles.stepSubtitle}>
        Select the stages for your project and set their timelines
      </Text>

      {formData.stages.map((stage) => (
        <View key={stage.id} style={styles.stageCard}>
          <TouchableOpacity
            style={styles.stageHeader}
            onPress={() => handleStageToggle(stage.id)}
          >
            <View style={styles.stageInfo}>
              <View style={styles.stageTitleRow}>
                <View style={[
                  styles.stageCheckbox,
                  stage.isSelected && styles.stageCheckboxSelected,
                ]}>
                  {stage.isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.stageName}>{stage.name}</Text>
              </View>
              <Text style={styles.stageDescription}>{stage.description}</Text>
            </View>
          </TouchableOpacity>

          {stage.isSelected && (
            <View style={styles.stageDates}>
              <View style={styles.stageDateRow}>
                <View style={styles.stageDateInput}>
                  <Text style={styles.stageDateLabel}>Start Date</Text>
                  <TextInput
                    style={styles.stageDateTextInput}
                    value={stage.startDate || ''}
                    onChangeText={(text) => handleStageDateChange(stage.id, 'startDate', text)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.stageDateInput}>
                  <Text style={styles.stageDateLabel}>End Date</Text>
                  <TextInput
                    style={styles.stageDateTextInput}
                    value={stage.endDate || ''}
                    onChangeText={(text) => handleStageDateChange(stage.id, 'endDate', text)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Project</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 2) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of 2</Text>
        </View>

        {/* Content */}
        {currentStep === 1 ? renderStep1() : renderStep2()}

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={styles.nextButtonText}>
              {isLoading ? 'Creating...' : currentStep === 2 ? 'Create Project' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date pickers removed - using text inputs instead */}
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: semanticSpacing.containerPadding,
  },
  typeCard: {
    width: (width - 64) / 2,
    padding: semanticSpacing.containerPaddingLarge,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: spacing.sm,
    backgroundColor: '#fff',
  },
  typeCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  typeNameSelected: {
    color: '#3b82f6',
  },
  typeDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  typeDescriptionSelected: {
    color: '#3b82f6',
  },
  dateRow: {
    flexDirection: 'row',
    gap: semanticSpacing.containerPadding,
  },
  dateInput: {
    flex: 1,
  },
  dateTextInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  datePicker: {
    marginBottom: 0,
  },
  stageDateTextInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  statusOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusOptionTextSelected: {
    color: '#ffffff',
  },
  stageCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  stageHeader: {
    padding: semanticSpacing.containerPaddingLarge,
  },
  stageInfo: {
    flex: 1,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCheckboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  stageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  stageDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  stageDates: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  stageDateRow: {
    flexDirection: 'row',
    gap: semanticSpacing.containerPadding,
    marginTop: semanticSpacing.containerPaddingLarge,
  },
  stageDateInput: {
    flex: 1,
  },
  stageDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  stageDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  stageDateButtonText: {
    fontSize: 14,
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: semanticSpacing.containerPaddingLarge,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: semanticSpacing.containerPadding,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  coverImageContainer: {
    marginBottom: 8,
  },
  coverImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  coverImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  coverImageSuccessText: {
    marginTop: 4,
    fontSize: 12,
    color: '#10b981',
  },
});

export default ProjectCreationModal;
