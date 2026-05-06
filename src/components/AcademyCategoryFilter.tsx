import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AcademyService, ServicesByCategory, getCategoryMetadata } from '../hooks/useAcademyServices';

interface AcademyCategoryFilterProps {
  servicesByCategory: ServicesByCategory;
  selectedServiceIds: Set<string>;
  onApplySelectedServices: (serviceIds: Set<string>) => void;
  servicesLoading?: boolean;
  isDark?: boolean;
}

const AcademyCategoryFilter: React.FC<AcademyCategoryFilterProps> = ({
  servicesByCategory,
  selectedServiceIds,
  onApplySelectedServices,
  servicesLoading = false,
  isDark = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempSelectedServiceIds, setTempSelectedServiceIds] = useState<Set<string>>(new Set(selectedServiceIds));

  const categoryEntries = useMemo(() => {
    const entries = Object.entries(servicesByCategory)
      .filter(([, services]) => Array.isArray(services) && services.length > 0)
      .map(([categoryKey, services]) => {
        const metadata = getCategoryMetadata(categoryKey);
        const sortedServices = [...services].sort((a: AcademyService, b: AcademyService) => {
          return (a.display_order || 0) - (b.display_order || 0);
        });
        return {
          key: categoryKey,
          label: metadata?.label || categoryKey,
          services: sortedServices,
        };
      });

    return entries;
  }, [servicesByCategory]);

  const styles = useMemo(() => {
    return StyleSheet.create({
      filterButton: {
        paddingHorizontal: 8,
        paddingVertical: 8,
      },
      filterIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isDark ? '#27272a' : '#f4f4f5',
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        paddingHorizontal: 16,
      },
      modalContent: {
        backgroundColor: isDark ? '#18181b' : '#fff',
        borderRadius: 18,
        maxHeight: '86%',
      },
      modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#27272a' : '#e4e4e7',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: isDark ? '#fff' : '#000',
      },
      closeButton: {
        padding: 8,
      },
      categoryList: {
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      categorySection: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#27272a' : '#e4e4e7',
      },
      categorySectionLast: {
        borderBottomWidth: 0,
      },
      categoryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: isDark ? '#f4f4f5' : '#111827',
        marginBottom: 10,
      },
      servicesGrid: {
        flexDirection: 'row',
        columnGap: 24,
      },
      servicesColumn: {
        flex: 1,
        rowGap: 12,
      },
      serviceOption: {
        flexDirection: 'row',
        alignItems: 'flex-start',
      },
      checkbox: {
        width: 24,
        height: 24,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: isDark ? '#71717a' : '#3f3f46',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 1,
        backgroundColor: isDark ? '#18181b' : '#fff',
      },
      checkboxChecked: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
      },
      serviceLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        color: isDark ? '#d4d4d8' : '#27272a',
      },
      buttonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? '#27272a' : '#e4e4e7',
      },
      showResultsButton: {
        width: '100%',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#000',
        alignItems: 'center',
      },
      showResultsButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
      },
      badgeContainer: {
        position: 'absolute',
        top: 0,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
      },
      badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
      },
    });
  }, [isDark]);

  const handleToggleService = (serviceId: string) => {
    const updated = new Set(tempSelectedServiceIds);
    if (updated.has(serviceId)) {
      updated.delete(serviceId);
    } else {
      updated.add(serviceId);
    }
    setTempSelectedServiceIds(updated);
  };

  const handleShowResults = () => {
    onApplySelectedServices(tempSelectedServiceIds);
    setShowModal(false);
  };

  const handleCancel = () => {
    setTempSelectedServiceIds(new Set(selectedServiceIds));
    setShowModal(false);
  };

  const selectedCount = selectedServiceIds.size;

  return (
    <>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setTempSelectedServiceIds(new Set(selectedServiceIds));
          setShowModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.filterIcon}>
          <Ionicons
            name="funnel"
            size={18}
            color={isDark ? '#a1a1aa' : '#71717a'}
          />
          {selectedCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{selectedCount > 9 ? '9+' : selectedCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Academies</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#a1a1aa' : '#71717a'}
                />
              </TouchableOpacity>
            </View>

            {/* Services Grouped By Category */}
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {categoryEntries.map((group, groupIndex) => {
                const leftColumn = group.services.filter((_, i) => i % 2 === 0);
                const rightColumn = group.services.filter((_, i) => i % 2 === 1);

                return (
                  <View
                    key={group.key}
                    style={[
                      styles.categorySection,
                      groupIndex === categoryEntries.length - 1 && styles.categorySectionLast,
                    ]}
                  >
                    <Text style={styles.categoryTitle}>{group.label}</Text>

                    <View style={styles.servicesGrid}>
                      <View style={styles.servicesColumn}>
                        {leftColumn.map((service) => {
                          const isSelected = tempSelectedServiceIds.has(service.id);
                          return (
                            <TouchableOpacity
                              key={service.id}
                              style={styles.serviceOption}
                              activeOpacity={0.7}
                              onPress={() => handleToggleService(service.id)}
                            >
                              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                {isSelected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                              </View>
                              <Text style={styles.serviceLabel}>{service.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.servicesColumn}>
                        {rightColumn.map((service) => {
                          const isSelected = tempSelectedServiceIds.has(service.id);
                          return (
                            <TouchableOpacity
                              key={service.id}
                              style={styles.serviceOption}
                              activeOpacity={0.7}
                              onPress={() => handleToggleService(service.id)}
                            >
                              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                {isSelected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                              </View>
                              <Text style={styles.serviceLabel}>{service.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Action Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.showResultsButton, servicesLoading && { opacity: 0.6 }]}
                onPress={servicesLoading ? undefined : handleShowResults}
                activeOpacity={servicesLoading ? 1 : 0.8}
              >
                {servicesLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.showResultsButtonText}>Show Results</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default AcademyCategoryFilter;
