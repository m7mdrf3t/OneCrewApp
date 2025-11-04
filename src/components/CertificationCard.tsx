import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserCertification } from '../types';

interface CertificationCardProps {
  certification: UserCertification;
  onPress?: (certification: UserCertification) => void;
}

const CertificationCard: React.FC<CertificationCardProps> = ({
  certification,
  onPress,
}) => {
  const isExpiringSoon = (expirationDate?: string): boolean => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expirationDate?: string): boolean => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const handleViewCertificate = async () => {
    if (certification.certificate_url) {
      const supported = await Linking.canOpenURL(certification.certificate_url);
      if (supported) {
        await Linking.openURL(certification.certificate_url);
      }
    }
  };

  const expirationDate = certification.expiration_date;
  const expiringSoon = expirationDate && isExpiringSoon(expirationDate);
  const expired = expirationDate && isExpired(expirationDate);

  return (
    <TouchableOpacity
      style={[styles.container, expired && styles.containerExpired]}
      onPress={() => onPress && onPress(certification)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="trophy"
            size={24}
            color={expired ? '#ef4444' : expiringSoon ? '#f59e0b' : '#10b981'}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {certification.certification_template?.name || 'Unknown Certification'}
          </Text>
          {certification.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            Issued by: {certification.company?.name || 'Unknown Academy'}
          </Text>
        </View>

        {certification.issued_at && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              Issued: {new Date(certification.issued_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {expirationDate && (
          <View style={styles.infoRow}>
            <Ionicons
              name="time"
              size={16}
              color={expired ? '#ef4444' : expiringSoon ? '#f59e0b' : '#6b7280'}
            />
            <Text
              style={[
                styles.infoText,
                expired && styles.expiredText,
                expiringSoon && !expired && styles.expiringText,
              ]}
            >
              Expires: {new Date(expirationDate).toLocaleDateString()}
            </Text>
            {expired && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>EXPIRED</Text>
              </View>
            )}
            {expiringSoon && !expired && (
              <View style={[styles.statusBadge, styles.expiringBadge]}>
                <Text style={[styles.statusBadgeText, styles.expiringBadgeText]}>
                  EXPIRING SOON
                </Text>
              </View>
            )}
          </View>
        )}

        {certification.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{certification.notes}</Text>
          </View>
        )}
      </View>

      {certification.certificate_url && (
        <TouchableOpacity
          style={styles.viewCertificateButton}
          onPress={handleViewCertificate}
        >
          <Ionicons name="document-text" size={16} color="#3b82f6" />
          <Text style={styles.viewCertificateText}>View Certificate</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  containerExpired: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  body: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  expiringText: {
    color: '#f59e0b',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  expiringBadge: {
    backgroundColor: '#fef3c7',
  },
  expiringBadgeText: {
    color: '#f59e0b',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  viewCertificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
  },
  viewCertificateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
});

export default CertificationCard;

