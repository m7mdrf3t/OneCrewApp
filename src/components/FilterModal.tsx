import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, semanticSpacing } from '../constants/spacing';

const { width } = Dimensions.get('window');

export interface FilterParams {
  search?: string;
  category?: 'talent' | 'crew' | 'company';
  role?: string;
  location?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  accent?: string;
  nationalities?: string[];
  skinTone?: string;
  hairColor?: string;
  skills?: string[];
  awards?: string[];
  currentLocation?: string;
  shootingLocation?: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams) => void;
  initialFilters?: FilterParams;
  availableRoles?: string[];
}

// Simple Range Slider Component
const RangeSlider: React.FC<{
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  unit?: string;
}> = ({ min, max, value, onChange, unit = '' }) => {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = (newMin: number) => {
    const newValue: [number, number] = [Math.min(newMin, localValue[1]), localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (newMax: number) => {
    const newValue: [number, number] = [localValue[0], Math.max(newMax, localValue[0])];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const percentageMin = ((localValue[0] - min) / (max - min)) * 100;
  const percentageMax = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderActiveTrack,
            {
              left: `${percentageMin}%`,
              width: `${percentageMax - percentageMin}%`,
            },
          ]}
        />
        <TouchableOpacity
          style={[styles.sliderHandle, { left: `${percentageMin}%` }]}
          onPress={() => {}}
        />
        <TouchableOpacity
          style={[styles.sliderHandle, { left: `${percentageMax}%` }]}
          onPress={() => {}}
        />
      </View>
      <Text style={styles.sliderValue}>
        {localValue[0]}{unit} - {localValue[1]}{unit}
      </Text>
    </View>
  );
};

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  availableRoles = [],
}) => {
  const [filters, setFilters] = useState<FilterParams>(initialFilters);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [accentInput, setAccentInput] = useState(initialFilters.accent || '');
  const [nationalityInput, setNationalityInput] = useState('');
  const [currentLocationInput, setCurrentLocationInput] = useState(initialFilters.currentLocation || '');
  const [shootingLocationInput, setShootingLocationInput] = useState(initialFilters.shootingLocation || '');

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setExpandedFilters(new Set());
      setAccentInput(initialFilters.accent || '');
      setCurrentLocationInput(initialFilters.currentLocation || '');
      setShootingLocationInput(initialFilters.shootingLocation || '');
      setNationalityInput('');
    }
  }, [visible, initialFilters]);

  const toggleFilter = (filterKey: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterKey)) {
        newSet.delete(filterKey);
      } else {
        newSet.add(filterKey);
      }
      return newSet;
    });
  };

  const handleGenderSelect = (gender: string) => {
    setFilters(prev => ({
      ...prev,
      gender: prev.gender === gender ? undefined : gender,
    }));
  };

  const handleAgeRangeChange = (value: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      minAge: value[0],
      maxAge: value[1],
    }));
  };

  const handleHeightRangeChange = (value: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      minHeight: value[0],
      maxHeight: value[1],
    }));
  };

  const handleWeightRangeChange = (value: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      minWeight: value[0],
      maxWeight: value[1],
    }));
  };

  const handleAccentChange = (text: string) => {
    setAccentInput(text);
    setFilters(prev => ({
      ...prev,
      accent: text.trim() || undefined,
    }));
  };

  const handleAddNationality = () => {
    if (nationalityInput.trim()) {
      setFilters(prev => ({
        ...prev,
        nationalities: [...(prev.nationalities || []), nationalityInput.trim()],
      }));
      setNationalityInput('');
    }
  };

  const handleRemoveNationality = (index: number) => {
    setFilters(prev => ({
      ...prev,
      nationalities: prev.nationalities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSkinToneSelect = (tone: string) => {
    setFilters(prev => ({
      ...prev,
      skinTone: prev.skinTone === tone ? undefined : tone,
    }));
  };

  const handleHairColorSelect = (color: string) => {
    setFilters(prev => ({
      ...prev,
      hairColor: prev.hairColor === color ? undefined : color,
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFilters(prev => {
      const currentSkills = prev.skills || [];
      const newSkills = currentSkills.includes(skill)
        ? currentSkills.filter(s => s !== skill)
        : [...currentSkills, skill];
      return {
        ...prev,
        skills: newSkills.length > 0 ? newSkills : undefined,
      };
    });
  };

  const handleAwardToggle = (award: string) => {
    setFilters(prev => {
      const currentAwards = prev.awards || [];
      const newAwards = currentAwards.includes(award)
        ? currentAwards.filter(a => a !== award)
        : [...currentAwards, award];
      return {
        ...prev,
        awards: newAwards.length > 0 ? newAwards : undefined,
      };
    });
  };

  const handleLocationChange = (type: 'current' | 'shooting', text: string) => {
    if (type === 'current') {
      setCurrentLocationInput(text);
      setFilters(prev => ({
        ...prev,
        currentLocation: text.trim() || undefined,
      }));
    } else {
      setShootingLocationInput(text);
      setFilters(prev => ({
        ...prev,
        shootingLocation: text.trim() || undefined,
      }));
    }
  };

  const handleClear = () => {
    const clearedFilters: FilterParams = {};
    setFilters(clearedFilters);
    setAccentInput('');
    setNationalityInput('');
    setCurrentLocationInput('');
    setShootingLocationInput('');
    setExpandedFilters(new Set());
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    handleClear();
    onApply({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.role) count++;
    if (filters.gender) count++;
    if (filters.minAge || filters.maxAge) count++;
    if (filters.minHeight || filters.maxHeight) count++;
    if (filters.minWeight || filters.maxWeight) count++;
    if (filters.accent) count++;
    if (filters.nationalities && filters.nationalities.length > 0) count++;
    if (filters.skinTone) count++;
    if (filters.hairColor) count++;
    if (filters.skills && filters.skills.length > 0) count++;
    if (filters.awards && filters.awards.length > 0) count++;
    if (filters.currentLocation) count++;
    if (filters.shootingLocation) count++;
    return count;
  };

  const skinTones = ['#F4E4BC', '#E6C79A', '#D4A574', '#B87333', '#8B4513'];
  const hairColors = ['#000000', '#3D2817', '#F5DEB3', '#A0522D', '#808080'];
  
  const commonSkills = ['Method Acting', 'Improvisation', 'Stage Combat', 'Voice Acting', 'Dialects & Accents', 'Singing', 'Dancing'];
  const commonAwards = ['Best Actor', 'Top Performer', 'Rising Star', 'Outstanding Performance'];

  const renderFilterContent = (filterKey: string) => {
    if (!expandedFilters.has(filterKey)) return null;

    switch (filterKey) {
      case 'gender':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('male')}
              >
                <Text style={[styles.genderText, filters.gender === 'male' && styles.genderTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  filters.gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => handleGenderSelect('female')}
              >
                <Text style={[styles.genderText, filters.gender === 'female' && styles.genderTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'physicalAttributes':
        return (
          <View style={styles.filterContent}>
            <View style={styles.blueLine} />
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="calendar-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Age</Text>
              </View>
              <RangeSlider
                min={18}
                max={80}
                value={[filters.minAge || 18, filters.maxAge || 40]}
                onChange={handleAgeRangeChange}
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="resize-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Height</Text>
              </View>
              <RangeSlider
                min={150}
                max={220}
                value={[filters.minHeight || 150, filters.maxHeight || 190]}
                onChange={handleHeightRangeChange}
                unit="cm"
              />
            </View>
            <View style={styles.physicalAttributeSection}>
              <View style={styles.attributeRow}>
                <Ionicons name="resize-outline" size={20} color="#000" style={styles.attributeIcon} />
                <Text style={styles.attributeLabel}>Weight</Text>
              </View>
              <RangeSlider
                min={50}
                max={150}
                value={[filters.minWeight || 50, filters.maxWeight || 90]}
                onChange={handleWeightRangeChange}
                unit="kg"
              />
            </View>
          </View>
        );

      case 'accent':
        return (
          <View style={styles.filterContent}>
            <View style={styles.inputContainer}>
              <Ionicons name="mic-outline" size={20} color="#000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accentInput}
                onChangeText={handleAccentChange}
                placeholder="Accent"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        );

      case 'nationality':
        return (
          <View style={styles.filterContent}>
            <Text style={styles.instructionText}>Add one or more nationalities.</Text>
            <View style={styles.addInputContainer}>
              <TextInput
                style={styles.addInput}
                value={nationalityInput}
                onChangeText={setNationalityInput}
                placeholder="e.g., Egyptian, American..."
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddNationality}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {filters.nationalities && filters.nationalities.length > 0 && (
              <>
                <View style={styles.selectedItems}>
                  {filters.nationalities.map((nat, index) => (
                    <View key={index} style={styles.selectedItem}>
                      <Text style={styles.selectedItemText}>{nat}</Text>
                      <TouchableOpacity onPress={() => handleRemoveNationality(index)}>
                        <Ionicons name="close" size={16} color="#000" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, nationalities: undefined }))}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );

      case 'skinTone':
        return (
          <View style={styles.filterContent}>
            <View style={styles.colorSwatches}>
              {skinTones.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    filters.skinTone === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => handleSkinToneSelect(color)}
                />
              ))}
            </View>
            {filters.skinTone && (
              <TouchableOpacity onPress={() => handleSkinToneSelect('')}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'hairColor':
        return (
          <View style={styles.filterContent}>
            <View style={styles.colorSwatches}>
              {hairColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    filters.hairColor === color && styles.colorSwatchActive,
                  ]}
                  onPress={() => handleHairColorSelect(color)}
                />
              ))}
            </View>
            {filters.hairColor && (
              <TouchableOpacity onPress={() => handleHairColorSelect('')}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'location':
        return (
          <View style={styles.filterContent}>
            <View style={styles.locationSection}>
              <Text style={styles.locationLabel}>Current location:</Text>
              <View style={styles.addInputContainer}>
                <TextInput
                  style={styles.addInput}
                  value={currentLocationInput}
                  onChangeText={(text) => handleLocationChange('current', text)}
                  placeholder="e.g., Cairo, Dubai..."
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.locationSection}>
              <Text style={styles.locationLabel}>Shooting location:</Text>
              <View style={styles.addInputContainer}>
                <TextInput
                  style={styles.addInput}
                  value={shootingLocationInput}
                  onChangeText={(text) => handleLocationChange('shooting', text)}
                  placeholder="e.g., Aswan, Siwa..."
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'skills':
        return (
          <View style={styles.filterContent}>
            <View style={styles.chipsContainer}>
              {commonSkills.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.chip,
                    filters.skills?.includes(skill) && styles.chipActive,
                  ]}
                  onPress={() => handleSkillToggle(skill)}
                >
                  <Text style={[styles.chipText, filters.skills?.includes(skill) && styles.chipTextActive]}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filters.skills && filters.skills.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, skills: undefined }))}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'awards':
        return (
          <View style={styles.filterContent}>
            <View style={styles.chipsContainer}>
              {commonAwards.map((award) => (
                <TouchableOpacity
                  key={award}
                  style={[
                    styles.chip,
                    filters.awards?.includes(award) && styles.chipActive,
                  ]}
                  onPress={() => handleAwardToggle(award)}
                >
                  <Text style={[styles.chipText, filters.awards?.includes(award) && styles.chipTextActive]}>
                    {award}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filters.awards && filters.awards.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, awards: undefined }))}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const userFilters = [
    { key: 'gender', label: 'Gender', icon: 'people-outline' },
    { key: 'physicalAttributes', label: 'Physical Attributes', icon: 'body-outline' },
    { key: 'accent', label: 'Accent', icon: 'mic-outline' },
    { key: 'nationality', label: 'Nationality', icon: 'globe-outline' },
    { key: 'skinTone', label: 'Skin Tone', icon: 'color-palette-outline' },
    { key: 'hairColor', label: 'Hair Color', icon: 'cut-outline' },
    { key: 'location', label: 'Location', icon: 'location-outline' },
    { key: 'skills', label: 'Skills', icon: 'star-outline' },
    { key: 'awards', label: 'Awards', icon: 'trophy-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {userFilters.map((filter) => {
              const isActive = filters[filter.key as keyof FilterParams] !== undefined && 
                filters[filter.key as keyof FilterParams] !== '' &&
                !(Array.isArray(filters[filter.key as keyof FilterParams]) && 
                  (filters[filter.key as keyof FilterParams] as any[]).length === 0);
              const isExpanded = expandedFilters.has(filter.key);
              
              return (
                <View key={filter.key} style={styles.filterCard}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => toggleFilter(filter.key)}
                  >
                    <Ionicons 
                      name={filter.icon as any} 
                      size={20} 
                      color="#000" 
                      style={styles.filterIcon}
                    />
                    <Text style={styles.filterText}>
                      {filter.label}
                    </Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#000" 
                    />
                  </TouchableOpacity>
                  {renderFilterContent(filter.key)}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '95%',
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: semanticSpacing.containerPaddingLarge,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: semanticSpacing.containerPaddingLarge,
  },
  filterCard: {
    marginBottom: spacing.md,
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  filterIcon: {
    marginRight: spacing.md,
  },
  filterText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  filterContent: {
    padding: semanticSpacing.containerPadding,
    paddingTop: 0,
  },
  blueLine: {
    height: 2,
    backgroundColor: '#3b82f6',
    marginBottom: spacing.md,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: semanticSpacing.borderRadius.md,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#e5e7eb',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  genderTextActive: {
    fontWeight: '700',
  },
  physicalAttributeSection: {
    marginBottom: spacing.lg,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attributeIcon: {
    marginRight: spacing.sm,
  },
  attributeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sliderContainer: {
    marginTop: spacing.sm,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  sliderActiveTrack: {
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
  sliderHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    position: 'absolute',
    top: -8,
    marginLeft: -10,
  },
  sliderValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.containerPadding,
    height: 44,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.md,
  },
  addInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: semanticSpacing.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: '#000',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: semanticSpacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: semanticSpacing.borderRadius.md,
    gap: spacing.xs,
  },
  selectedItemText: {
    fontSize: 14,
    color: '#000',
  },
  clearAllText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#000',
  },
  locationSection: {
    marginBottom: spacing.lg,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: semanticSpacing.borderRadius.md,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#e5e7eb',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  chipTextActive: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: semanticSpacing.containerPaddingLarge,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: semanticSpacing.containerPadding,
    borderRadius: semanticSpacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  applyButton: {
    backgroundColor: '#000',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FilterModal;
