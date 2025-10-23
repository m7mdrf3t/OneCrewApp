import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProjectDashboardData } from '../types';

interface LegalTrackerProps {
  project: ProjectDashboardData;
  onUpdateLegalStatus: (legalId: string, status: string) => void;
}

interface LegalService {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'expired';
  required: boolean;
  description: string;
  dueDate: string;
  assignedTo?: string;
  notes?: string;
  documents?: string[];
}

const LegalTracker: React.FC<LegalTrackerProps> = ({
  project,
  onUpdateLegalStatus,
}) => {
  const [legalServices, setLegalServices] = useState<LegalService[]>([
    {
      id: '1',
      name: 'Public Filming Permit',
      status: 'pending',
      required: true,
      description: 'Required for filming in public spaces',
      dueDate: '2024-01-15',
      assignedTo: 'Legal Team',
    },
    {
      id: '2',
      name: 'Censorship Approval',
      status: 'approved',
      required: true,
      description: 'Content review and approval',
      dueDate: '2024-01-10',
      assignedTo: 'Content Review Board',
    },
    {
      id: '3',
      name: 'Location Release Forms',
      status: 'in_progress',
      required: true,
      description: 'Legal agreements for filming locations',
      dueDate: '2024-01-20',
      assignedTo: 'Location Manager',
    },
    {
      id: '4',
      name: 'Drone Permit',
      status: 'pending',
      required: false,
      description: 'Required for aerial filming with drones',
      dueDate: '2024-01-25',
    },
    {
      id: '5',
      name: 'Insurance Coverage',
      status: 'in_progress',
      required: true,
      description: 'Production insurance and liability coverage',
      dueDate: '2024-01-18',
      assignedTo: 'Insurance Agent',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'in_progress':
        return 'time';
      case 'pending':
        return 'ellipse';
      case 'rejected':
        return 'close-circle';
      case 'expired':
        return 'alert-circle';
      default:
        return 'ellipse';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleStatusUpdate = (legalId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Are you sure you want to mark this as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            setLegalServices(prev =>
              prev.map(service =>
                service.id === legalId
                  ? { ...service, status: newStatus as any }
                  : service
              )
            );
            onUpdateLegalStatus(legalId, newStatus);
          },
        },
      ]
    );
  };

  const renderLegalService = (service: LegalService) => (
    <View key={service.id} style={styles.legalCard}>
      <View style={styles.legalHeader}>
        <View style={styles.legalInfo}>
          <View style={styles.legalTitleRow}>
            <Text style={styles.legalName}>{service.name}</Text>
            {service.required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <Text style={styles.legalDescription}>{service.description}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(service.status) },
          ]}>
            <Ionicons
              name={getStatusIcon(service.status)}
              size={12}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {getStatusText(service.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.legalDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={14} color="#6b7280" />
          <Text style={[
            styles.detailText,
            isOverdue(service.dueDate) && styles.overdueText,
          ]}>
            Due: {new Date(service.dueDate).toLocaleDateString()}
            {isOverdue(service.dueDate) && ' (Overdue)'}
          </Text>
        </View>

        {service.assignedTo && (
          <View style={styles.detailRow}>
            <Ionicons name="person" size={14} color="#6b7280" />
            <Text style={styles.detailText}>Assigned to: {service.assignedTo}</Text>
          </View>
        )}

        {service.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{service.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.legalActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Handle view documents
            Alert.alert('Documents', 'Document viewer coming soon!');
          }}
        >
          <Ionicons name="document" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Handle add notes
            Alert.alert('Add Notes', 'Note editor coming soon!');
          }}
        >
          <Ionicons name="create" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Handle status update
            Alert.alert(
              'Update Status',
              'Select new status:',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Pending', onPress: () => handleStatusUpdate(service.id, 'pending') },
                { text: 'In Progress', onPress: () => handleStatusUpdate(service.id, 'in_progress') },
                { text: 'Approved', onPress: () => handleStatusUpdate(service.id, 'approved') },
                { text: 'Rejected', onPress: () => handleStatusUpdate(service.id, 'rejected') },
              ]
            );
          }}
        >
          <Ionicons name="refresh" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCompletionStats = () => {
    const total = legalServices.length;
    const completed = legalServices.filter(s => s.status === 'approved').length;
    const inProgress = legalServices.filter(s => s.status === 'in_progress').length;
    const pending = legalServices.filter(s => s.status === 'pending').length;
    const overdue = legalServices.filter(s => isOverdue(s.dueDate) && s.status !== 'approved').length;

    return { total, completed, inProgress, pending, overdue };
  };

  const stats = getCompletionStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Legal & Permits</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, stats.overdue > 0 && styles.overdueNumber]}>
            {stats.overdue}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(stats.completed / stats.total) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((stats.completed / stats.total) * 100)}% Complete
        </Text>
      </View>

      {/* Legal Services List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {legalServices.map(renderLegalService)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  overdueNumber: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  legalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  legalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  legalInfo: {
    flex: 1,
    marginRight: 12,
  },
  legalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  requiredText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '500',
  },
  legalDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  legalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  overdueText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  legalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default LegalTracker;
