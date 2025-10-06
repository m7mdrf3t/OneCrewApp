import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApi } from '../contexts/ApiContext';

interface ProfileValidationHelperProps {
  profileData: any;
  showRequirements?: boolean;
}

const ProfileValidationHelper: React.FC<ProfileValidationHelperProps> = ({ 
  profileData, 
  showRequirements = false 
}) => {
  const { getProfileRequirements } = useApi();
  const requirements = getProfileRequirements();

  const validateProfileData = (data: any) => {
    const errors: string[] = [];
    
    // Check required fields for basic profile
    if (!data.bio || data.bio.trim() === '') {
      errors.push('Bio is required');
    }
    
    if (!data.specialty || data.specialty.trim() === '') {
      errors.push('Specialty is required');
    }
    
    // Check talent-specific fields if user is talent
    if (data.about) {
      const about = data.about;
      
      // Check height if provided
      if (about.height && (isNaN(Number(about.height)) || Number(about.height) < 100 || Number(about.height) > 250)) {
        errors.push('Height must be between 100-250 cm');
      }
      
      // Check weight if provided
      if (about.weight && (isNaN(Number(about.weight)) || Number(about.weight) < 30 || Number(about.weight) > 300)) {
        errors.push('Weight must be between 30-300 kg');
      }
      
      // Check chest measurements if provided
      if (about.chestCm && (isNaN(Number(about.chestCm)) || Number(about.chestCm) < 50 || Number(about.chestCm) > 200)) {
        errors.push('Chest measurement must be between 50-200 cm');
      }
      
      // Check waist measurements if provided
      if (about.waistCm && (isNaN(Number(about.waistCm)) || Number(about.waistCm) < 40 || Number(about.waistCm) > 150)) {
        errors.push('Waist measurement must be between 40-150 cm');
      }
      
      // Check hips measurements if provided
      if (about.hipsCm && (isNaN(Number(about.hipsCm)) || Number(about.hipsCm) < 50 || Number(about.hipsCm) > 200)) {
        errors.push('Hips measurement must be between 50-200 cm');
      }
      
      // Check shoe size if provided
      if (about.shoeSizeEu && (isNaN(Number(about.shoeSizeEu)) || Number(about.shoeSizeEu) < 20 || Number(about.shoeSizeEu) > 60)) {
        errors.push('Shoe size must be between 20-60 EU');
      }
      
      // Check reel URL format if provided
      if (about.reelUrl && about.reelUrl.trim() !== '') {
        try {
          new URL(about.reelUrl);
        } catch {
          errors.push('Reel URL must be a valid URL');
        }
      }
    }
    
    return errors;
  };

  const validationErrors = validateProfileData(profileData);

  if (!showRequirements && validationErrors.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {validationErrors.length > 0 && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Profile Validation Errors:</Text>
          {validationErrors.map((error, index) => (
            <Text key={index} style={styles.errorText}>• {error}</Text>
          ))}
        </View>
      )}
      
      {showRequirements && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Profile Requirements:</Text>
          
          <Text style={styles.sectionTitle}>Required Fields:</Text>
          <Text style={styles.requirementText}>• Bio: {requirements.basic.bio.description}</Text>
          <Text style={styles.requirementText}>• Specialty: {requirements.basic.specialty.description}</Text>
          
          <Text style={styles.sectionTitle}>Optional Fields (with validation):</Text>
          <Text style={styles.requirementText}>• Height: {requirements.talent.measurements.height.description}</Text>
          <Text style={styles.requirementText}>• Weight: {requirements.talent.measurements.weight.description}</Text>
          <Text style={styles.requirementText}>• Chest: {requirements.talent.measurements.chest.description}</Text>
          <Text style={styles.requirementText}>• Waist: {requirements.talent.measurements.waist.description}</Text>
          <Text style={styles.requirementText}>• Hips: {requirements.talent.measurements.hips.description}</Text>
          <Text style={styles.requirementText}>• Shoe Size: {requirements.talent.measurements.shoeSize.description}</Text>
          <Text style={styles.requirementText}>• Reel URL: {requirements.talent.other.reelUrl.description}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 4,
  },
  requirementsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginTop: 8,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 2,
  },
});

export default ProfileValidationHelper;

