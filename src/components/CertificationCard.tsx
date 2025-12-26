import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image, Modal } from 'react-native';
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
  const [showImageModal, setShowImageModal] = useState(false);

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

  const handleImagePress = () => {
    if (certification.certificate_image_url) {
      setShowImageModal(true);
    }
  };

  const expirationDate = certification.expiration_date;
  const expiringSoon = expirationDate && isExpiringSoon(expirationDate);
  const expired = expirationDate && isExpired(expirationDate);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, expired && styles.containerExpired]}
        onPress={() => onPress && onPress(certification)}
        activeOpacity={0.7}
      >
      {/* Certificate Image (v2.16.0) */}
      {certification.certificate_image_url ? (
        <TouchableOpacity
          onPress={handleImagePress}
          style={styles.certificateImageContainer}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: certification.certificate_image_url }}
            style={styles.certificateImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Ionicons name="expand" size={20} color="#fff" />
            <Text style={styles.imageOverlayText}>Tap to view full size</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.certificateImagePlaceholder}>
          <Ionicons
            name="trophy"
            size={48}
            color={expired ? '#ef4444' : expiringSoon ? '#f59e0b' : '#10b981'}
          />
          <Text style={styles.placeholderText}>Certificate Image</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {certification.certificate_image_url ? (
            <Image
              source={{ uri: certification.certificate_image_url }}
              style={styles.headerIconImage}
            />
          ) : (
            <Ionicons
              name="trophy"
              size={24}
              color={expired ? '#ef4444' : expiringSoon ? '#f59e0b' : '#10b981'}
            />
          )}
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

      {certification.certificate_image_url && (
        <TouchableOpacity
          style={styles.viewImageButton}
          onPress={handleImagePress}
        >
          <Ionicons name="image" size={16} color="#3b82f6" />
          <Text style={styles.viewImageText}>View Certificate Image</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>

    {/* Full Size Image Modal */}
    <Modal
      visible={showImageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowImageModal(false)}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity
          style={styles.imageModalCloseButton}
          onPress={() => setShowImageModal(false)}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {certification.certificate_image_url && (
          <Image
            source={{ uri: certification.certificate_image_url }}
            style={styles.imageModalImage}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
    </>
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
  certificateImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f9fafb',
  },
  certificateImage: {
    width: '100%',
    height: '100%',
  },
  certificateImagePlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  headerIconImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
    marginTop: 8,
  },
  viewImageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageModalImage: {
    width: '90%',
    height: '80%',
  },
});

export default CertificationCard;

