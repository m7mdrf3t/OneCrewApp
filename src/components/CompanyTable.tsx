import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Company {
  id: string;
  name: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  website_url?: string;
  email?: string;
  phone?: string;
  location_text?: string;
  approval_status?: string;
  company_type_info?: {
    name: string;
  };
  members_count?: number;
  services_count?: number;
}

interface CompanyTableProps {
  title: string;
  companies: Company[];
  onCompanySelect?: (company: Company) => void;
  isDark?: boolean;
}

const CompanyTable: React.FC<CompanyTableProps> = ({
  title,
  companies,
  onCompanySelect,
  isDark = false,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getApprovalStatusColor = (status?: string): string => {
    switch (status) {
      case 'approved':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      case 'suspended':
        return '#ef4444';
      default:
        return '#71717a';
    }
  };

  const getApprovalStatusLabel = (status?: string): string => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Unknown';
    }
  };

  if (companies.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={isDark ? '#6b7280' : '#9ca3af'} />
          <Text style={[styles.emptyText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
            No {title.toLowerCase()} found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name="business" 
            size={20} 
            color="#45b7d1" 
          />
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
        </View>
        <Text style={[styles.count, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          {companies.length} {companies.length === 1 ? 'company' : 'companies'}
        </Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {companies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={[styles.companyCard, { backgroundColor: isDark ? '#374151' : '#f9fafb' }]}
            onPress={() => onCompanySelect?.(company)}
            activeOpacity={0.7}
          >
            <View style={styles.companyHeader}>
              <View style={[styles.logoContainer, { backgroundColor: '#45b7d1' }]}>
                {company.logo_url ? (
                  <Image
                    source={{ uri: company.logo_url }}
                    style={styles.logo}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.logoText}>{getInitials(company.name)}</Text>
                )}
              </View>
              <View style={styles.companyInfo}>
                <Text style={[styles.companyName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                  {company.name}
                </Text>
                {company.company_type_info?.name && (
                  <Text style={[styles.companyType, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                    {company.company_type_info.name}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.companyDetails}>
              {company.description || company.bio ? (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={2}>
                    {company.description || company.bio}
                  </Text>
                </View>
              ) : null}
              
              {company.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                    {company.email}
                  </Text>
                </View>
              )}
              
              {company.location_text && (
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
                    {company.location_text}
                  </Text>
                </View>
              )}
              
              {company.members_count !== undefined && (
                <View style={styles.detailRow}>
                  <Ionicons name="people" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {company.members_count} {company.members_count === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              )}
              
              {company.services_count !== undefined && (
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={[styles.detailText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                    {company.services_count} {company.services_count === 1 ? 'service' : 'services'}
                  </Text>
                </View>
              )}

              {company.approval_status && (
                <View style={styles.statusContainer}>
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
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    marginHorizontal: -4,
  },
  companyCard: {
    width: 200,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  companyType: {
    fontSize: 12,
  },
  companyDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default CompanyTable;

