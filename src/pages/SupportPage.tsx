import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SupportPageProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

const SupportPage: React.FC<SupportPageProps> = ({ onBack, theme = 'light' }) => {
  const isDark = theme === 'dark';
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSendEmail = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please fill in both subject and message.');
      return;
    }

    const email = 'support@onecrew.com';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(mailtoLink).then((supported) => {
      if (supported) {
        Linking.openURL(mailtoLink);
      } else {
        Alert.alert('Error', 'Unable to open email client. Please contact us at support@onecrew.com');
      }
    });
  };

  const handleOpenFAQ = () => {
    // TODO: Navigate to FAQ page when implemented
    Alert.alert('FAQ', 'Frequently Asked Questions page coming soon!');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.section, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
            Get Help
          </Text>
          <Text style={[styles.sectionDescription, { color: isDark ? '#9ca3af' : '#71717a' }]}>
            We're here to help! Contact our support team or check out our resources below.
          </Text>

          <TouchableOpacity
            style={[styles.supportOption, { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', borderColor: isDark ? '#1f2937' : '#e5e7eb' }]}
            onPress={handleOpenFAQ}
          >
            <Ionicons name="help-circle" size={24} color={isDark ? '#fff' : '#000'} />
            <View style={styles.supportOptionContent}>
              <Text style={[styles.supportOptionTitle, { color: isDark ? '#fff' : '#000' }]}>
                Frequently Asked Questions
              </Text>
              <Text style={[styles.supportOptionDescription, { color: isDark ? '#9ca3af' : '#71717a' }]}>
                Find answers to common questions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#9ca3af' : '#71717a'} />
          </TouchableOpacity>

          <View style={[styles.contactSection, { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb' }]}>
            <Text style={[styles.contactTitle, { color: isDark ? '#fff' : '#000' }]}>
              Contact Support
            </Text>
            <Text style={[styles.contactDescription, { color: isDark ? '#9ca3af' : '#71717a' }]}>
              Send us an email and we'll get back to you as soon as possible.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Subject</Text>
              <View style={[
                styles.inputWrapper, 
                { backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#1f2937' : '#d4d4d8' }
              ]}>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder="What can we help you with?"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Message</Text>
              <View style={[
                styles.inputWrapper, 
                { backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#1f2937' : '#d4d4d8' }
              ]}>
                <TextInput
                  style={[styles.textArea, { color: isDark ? '#fff' : '#000' }]}
                  placeholder="Describe your issue or question..."
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sendButton, (!subject.trim() || !message.trim()) && styles.sendButtonDisabled]}
              onPress={handleSendEmail}
              disabled={!subject.trim() || !message.trim()}
            >
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send Email</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.contactInfo, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="mail" size={20} color="#3b82f6" />
            <View style={styles.contactInfoContent}>
              <Text style={[styles.contactInfoLabel, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                Email us directly:
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('mailto:support@onecrew.com')}
              >
                <Text style={[styles.contactInfoValue, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                  support@onecrew.com
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 24,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  supportOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  supportOptionDescription: {
    fontSize: 14,
    color: '#71717a',
  },
  contactSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    fontSize: 16,
    color: '#000',
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  contactInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  contactInfoLabel: {
    fontSize: 13,
    color: '#1e40af',
    marginBottom: 4,
  },
  contactInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    textDecorationLine: 'underline',
  },
});

export default SupportPage;


