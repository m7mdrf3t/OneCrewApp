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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DatePicker from './DatePicker';
import MediaPickerService from '../services/MediaPickerService';
import { useApi } from '../contexts/ApiContext';

interface ProjectDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  project: any;
  onSave: (updatedProject: any) => Promise<void>;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  visible,
  onClose,
  project,
  onSave,
}) => {
  const { uploadFile } = useApi();
  const mediaPicker = MediaPickerService.getInstance();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    status: 'planning',
    startDate: '',
    endDate: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible && project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        type: project.type || 'film',
        status: project.status || 'planning',
        startDate: project.start_date || '',
        endDate: project.end_date || '',
      });
      setCoverImageUrl(project.cover_image_url || null);
      setCoverImageUri(project.cover_image_url || null);
    }
  }, [visible, project]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          setCoverImageUri(project?.cover_image_url || null);
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

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Project title is required');
      return;
    }

    // Validate cover image if it was changed
    if (coverImageUri && !coverImageUrl) {
      Alert.alert('Error', 'Please wait for the cover image to finish uploading');
      return;
    }

    setIsLoading(true);
    try {
      const updatedProject: any = {
        ...project,
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        status: formData.status,
        start_date: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        end_date: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        delivery_date: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      };

      // Include cover image URL if it was updated
      if (coverImageUrl) {
        updatedProject.cover_image_url = coverImageUrl;
      }

      await onSave(updatedProject);
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
      Alert.alert('Error', 'Failed to save project details');
    } finally {
      setIsLoading(false);
    }
  };

  const projectTypes = [
    { id: 'film', name: 'Film' },
    { id: 'series', name: 'Series' },
    { id: 'commercial', name: 'Commercial' },
    { id: 'music_video', name: 'Music Video' },
    { id: 'documentary', name: 'Documentary' },
  ];

  const projectStatuses = [
    { id: 'planning', name: 'Planning' },
    { id: 'in_production', name: 'In Production' },
    { id: 'completed', name: 'Completed' },
    { id: 'on_hold', name: 'On Hold' },
    { id: 'cancelled', name: 'Cancelled' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Project Details</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Cover Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cover Image</Text>
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
                      {isUploadingImage ? 'Uploading...' : 'Tap to change cover image'}
                    </Text>
                    {isUploadingImage && (
                      <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 8 }} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
              {coverImageUrl && !isUploadingImage && (
                <Text style={styles.coverImageSuccessText}>
                  ✓ Cover image ready
                </Text>
              )}
            </View>

            {/* Project Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Enter project title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Project Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Enter project description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Project Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Project Type</Text>
              <View style={styles.typeContainer}>
                {projectTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      formData.type === type.id && styles.typeOptionSelected,
                    ]}
                    onPress={() => handleInputChange('type', type.id)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.type === type.id && styles.typeOptionTextSelected,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Project Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                {projectStatuses.map((status) => (
                  <TouchableOpacity
                    key={status.id}
                    style={[
                      styles.statusOption,
                      formData.status === status.id && styles.statusOptionSelected,
                    ]}
                    onPress={() => handleInputChange('status', status.id)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === status.id && styles.statusOptionTextSelected,
                      ]}
                    >
                      {status.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.inputGroup}>
              <DatePicker
                label="Start Date"
                value={formData.startDate || null}
                onChange={(date) => handleInputChange('startDate', date || '')}
                placeholder="Select start date"
                mode="date"
                style={styles.datePicker}
              />
            </View>

            {/* End Date */}
            <View style={styles.inputGroup}>
              <DatePicker
                label="End Date"
                value={formData.endDate || null}
                onChange={(date) => handleInputChange('endDate', date || '')}
                placeholder="Select end date"
                mode="date"
                minimumDate={formData.startDate ? new Date(formData.startDate) : undefined}
                style={styles.datePicker}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 16,
    paddingTop: 20,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#ef4444',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  datePicker: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  typeOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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

export default ProjectDetailsModal;
