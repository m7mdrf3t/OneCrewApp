import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, theme = 'light' }) => {
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.section, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: isDark ? '#9ca3af' : '#71717a' }]}>
            Last Updated: December 14, 2025
          </Text>

          <View style={styles.content}>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services, website, and mobile applications.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              1. Information We Collect
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              1.1 Personal Information
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We may collect personal information that you voluntarily provide to us when you:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Register for an account
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Subscribe to our newsletter or marketing communications
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Contact us for support or inquiries
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Use our services or applications
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Participate in surveys or promotional activities
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              This information may include:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Name and contact information (email address, phone number, mailing address)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Account credentials (username, password)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Payment information (processed through secure third-party payment processors)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Profile information and preferences
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              1.2 Automatically Collected Information
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              When you use our services, we may automatically collect certain information, including:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Device information (device type, operating system, unique device identifiers)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Usage data (pages visited, features used, time spent)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Location data (with your permission)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Log data (IP address, browser type, access times)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Cookies and similar tracking technologies
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              2. How We Use Your Information
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We use the information we collect to:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Provide, maintain, and improve our services
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Process transactions and send related information
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Send you technical notices, updates, and support messages
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Respond to your comments, questions, and requests
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Send you marketing communications (with your consent)
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Monitor and analyze trends, usage, and activities
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Detect, prevent, and address technical issues and security threats
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Comply with legal obligations
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              3. Information Sharing and Disclosure
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We do not sell your personal information. We may share your information in the following circumstances:
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              3.1 Service Providers
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We may share information with third-party service providers who perform services on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              3.2 Legal Requirements
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, government agencies).
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              3.3 Business Transfers
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
            </Text>

            <Text style={[styles.subheading, { color: isDark ? '#fff' : '#000' }]}>
              3.4 With Your Consent
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We may share your information with your explicit consent or at your direction.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              4. Data Security
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              5. Your Rights and Choices
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Access: Request access to your personal information
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Correction: Request correction of inaccurate or incomplete information
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Deletion: Request deletion of your personal information
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Portability: Request transfer of your information to another service
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Opt-out: Unsubscribe from marketing communications
            </Text>
            <Text style={[styles.listItem, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              • Restriction: Request restriction of processing your information
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              To exercise these rights, please contact us using the information provided below.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              6. Cookies and Tracking Technologies
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We use cookies and similar tracking technologies to collect and use personal information about you. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our services.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              7. Third-Party Links
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              Our services may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              8. Children's Privacy
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              Our services are not intended for children under the age of 13 (or the applicable age of consent in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              9. International Data Transfers
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our services, you consent to the transfer of your information to these countries.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              10. Changes to This Privacy Policy
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              11. California Privacy Rights
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete personal information, and the right to opt-out of the sale of personal information (we do not sell personal information).
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              12. European Privacy Rights
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              If you are located in the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR). We process your personal information based on legitimate interests, contract performance, consent, or legal obligations.
            </Text>

            <Text style={[styles.heading, { color: isDark ? '#fff' : '#000' }]}>
              13. Contact Us
            </Text>
            <Text style={[styles.paragraph, { color: isDark ? '#e5e7eb' : '#374151' }]}>
              If you have any questions about this Privacy Policy, please contact us at support@onecrew.com
            </Text>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 24,
  },
  content: {
    marginTop: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 8,
  },
});

export default PrivacyPolicyPage;

