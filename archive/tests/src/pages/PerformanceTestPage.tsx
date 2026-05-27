import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import performanceMonitor from '../services/PerformanceMonitor';
import type { PerformanceMetric } from '../services/PerformanceMonitor';

interface PerformanceTestPageProps {
  onBack: () => void;
}

const PerformanceTestPage: React.FC<PerformanceTestPageProps> = ({ onBack }) => {
  const { 
    api, 
    getUsersDirect, 
    getCompanies, 
    getRoles, 
    healthCheck,
    fetchCompleteUserProfile,
    getProjects,
    getAllProjects,
    getProjectById,
    getAcademyCourses,
    user,
    activeCompany
  } = useApi();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null);

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    const allMetrics = performanceMonitor.getRecentMetrics(100);
    setMetrics(allMetrics);
  }, []);

  // Load metrics on mount and subscribe to updates
  useEffect(() => {
    refreshMetrics();

    // Subscribe to new metrics
    const unsubscribe = performanceMonitor.addListener((metric) => {
      refreshMetrics();
    });

    return unsubscribe;
  }, [refreshMetrics]);

  // Format duration in milliseconds
  const formatDuration = (ms?: number): string => {
    if (ms === undefined) return 'N/A';
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Run performance tests
  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      // Test 1: Health Check
      await performanceMonitor.trackApiCall(
        'Health Check',
        '/api/health',
        'GET',
        () => healthCheck()
      );

      // Test 2: Get Users
      await performanceMonitor.trackApiCall(
        'Get Users',
        '/api/users',
        'GET',
        () => getUsersDirect({ limit: 20, page: 1 })
      );

      // Test 3: Get Companies
      await performanceMonitor.trackApiCall(
        'Get Companies',
        '/api/companies',
        'GET',
        () => getCompanies({ limit: 20, page: 1 })
      );

      // Test 4: Get Roles
      await performanceMonitor.trackApiCall(
        'Get Roles',
        '/api/roles',
        'GET',
        () => getRoles()
      );

      // Test 5: Multiple sequential calls
      const sequentialStart = performance.now();
      await getUsersDirect({ limit: 10, page: 1 });
      await getCompanies({ limit: 10, page: 1 });
      await getRoles();
      const sequentialEnd = performance.now();
      
      performanceMonitor.startMetric('Sequential Calls (3)', 'api');
      performanceMonitor.endMetric(
        performanceMonitor.getMetrics().find(m => m.name === 'Sequential Calls (3)')?.id || '',
        'success',
        undefined,
        undefined
      );

      // Test 6: Large data fetch
      await performanceMonitor.trackApiCall(
        'Get Users (Large)',
        '/api/users',
        'GET',
        () => getUsersDirect({ limit: 100, page: 1 })
      );

      // Test 7: Get Projects
      try {
        await performanceMonitor.trackApiCall(
          'Get Projects',
          '/api/projects',
          'GET',
          () => getProjects()
        );
      } catch (err) {
        console.warn('Get Projects test failed (may require authentication):', err);
      }

      // Test 8: Get All Projects
      try {
        await performanceMonitor.trackApiCall(
          'Get All Projects',
          '/api/projects/all',
          'GET',
          () => getAllProjects()
        );
      } catch (err) {
        console.warn('Get All Projects test failed (may require authentication):', err);
      }

      // Test 9: Get Specific Project (if projects exist)
      // Use getAllProjects() to ensure we only test projects the user has access to
      try {
        const projects = await getAllProjects();
        if (projects && projects.length > 0) {
          // Filter to only projects where user is owner or member (has access)
          const accessibleProjects = projects.filter((project: any) => {
            if (!user?.id) return false;
            // User is owner
            if (project.created_by === user.id) return true;
            // User is a member
            const members = project.members || project.project_members || [];
            return members.some((member: any) => {
              const memberUserId = member.user_id || member.user?.id || member.id;
              return memberUserId === user.id;
            });
          });
          
          if (accessibleProjects.length > 0) {
            const firstProjectId = accessibleProjects[0].id;
            await performanceMonitor.trackApiCall(
              'Get Project By ID',
              `/api/projects/${firstProjectId}`,
              'GET',
              () => getProjectById(firstProjectId)
            );
          } else {
            console.warn('Get Project By ID test skipped: No accessible projects found');
          }
        }
      } catch (err: any) {
        // Handle 403 errors gracefully (user doesn't have access)
        if (err?.message?.includes('Access denied') || err?.message?.includes('403')) {
          console.warn('Get Project By ID test skipped: Access denied (user may not have access to test project)');
        } else {
          console.warn('Get Project By ID test failed:', err);
        }
      }

      // Test 10: Fetch Complete User Profile (if user exists)
      try {
        if (user?.id) {
          await performanceMonitor.trackApiCall(
            'Fetch Complete User Profile',
            `/api/users/${user.id}`,
            'GET',
            () => fetchCompleteUserProfile(user.id)
          );
        }
      } catch (err) {
        console.warn('Fetch Complete User Profile test failed:', err);
      }

      // Test 11: Get Academy Courses (if company exists)
      try {
        if (activeCompany?.id) {
          await performanceMonitor.trackApiCall(
            'Get Academy Courses',
            `/api/companies/${activeCompany.id}/courses`,
            'GET',
            () => getAcademyCourses(activeCompany.id)
          );
        } else {
          // Try to get companies first, then test academy courses
          const companiesResponse = await getCompanies({ limit: 5, page: 1 });
          if (companiesResponse?.data && Array.isArray(companiesResponse.data) && companiesResponse.data.length > 0) {
            const companyWithAcademy = companiesResponse.data.find((c: any) => 
              c.subcategory === 'academy' || c.company_type_info?.code === 'academy'
            ) || companiesResponse.data[0];
            
            if (companyWithAcademy?.id) {
              await performanceMonitor.trackApiCall(
                'Get Academy Courses',
                `/api/companies/${companyWithAcademy.id}/courses`,
                'GET',
                () => getAcademyCourses(companyWithAcademy.id)
              );
            }
          }
        }
      } catch (err) {
        console.warn('Get Academy Courses test failed:', err);
      }

      Alert.alert('Tests Complete', 'Performance tests have been completed. Check the metrics below.');
    } catch (error: any) {
      Alert.alert('Test Error', error.message || 'An error occurred during testing');
    } finally {
      setIsRunning(false);
      refreshMetrics();
    }
  }, [
    api, 
    getUsersDirect, 
    getCompanies, 
    getRoles, 
    healthCheck, 
    getProjects,
    getAllProjects,
    getProjectById,
    fetchCompleteUserProfile,
    getAcademyCourses,
    user,
    activeCompany,
    refreshMetrics
  ]);

  // Clear all metrics
  const handleClearMetrics = () => {
    Alert.alert(
      'Clear Metrics',
      'Are you sure you want to clear all performance metrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            performanceMonitor.clearMetrics();
            refreshMetrics();
          },
        },
      ]
    );
  };

  // Export metrics
  const handleExportMetrics = async () => {
    try {
      const exportData = performanceMonitor.exportMetrics();
      await Share.share({
        message: exportData,
        title: 'Performance Metrics Export',
      });
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export metrics');
    }
  };

  // Get statistics
  const stats = performanceMonitor.getOverallStats();
  const summary = performanceMonitor.getSummary();

  // Group metrics by name for statistics
  const metricGroups = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Performance Monitor</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleClearMetrics} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportMetrics} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshMetrics} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Calls</Text>
              <Text style={styles.summaryValue}>{summary.totalCalls}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Response</Text>
              <Text style={styles.summaryValue}>{formatDuration(summary.avgResponseTime)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Success Rate</Text>
              <Text style={styles.summaryValue}>{stats.successRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Error Rate</Text>
              <Text style={[styles.summaryValue, { color: summary.errorRate > 10 ? '#ef4444' : '#000' }]}>
                {summary.errorRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Test Button */}
        <View style={styles.testSection}>
          <TouchableOpacity
            style={[styles.testButton, isRunning && styles.testButtonDisabled]}
            onPress={runTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.testButtonText}>Run Performance Tests</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Statistics by Metric Name */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics by Endpoint</Text>
          {Object.entries(metricGroups).map(([name, groupMetrics]) => {
            const completed = groupMetrics.filter(m => m.duration !== undefined);
            if (completed.length === 0) return null;

            const stats = performanceMonitor.getMetricStats(name);
            const successRate = stats.count > 0
              ? (stats.successCount / stats.count) * 100
              : 0;

            return (
              <View key={name} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Text style={styles.statName}>{name}</Text>
                  <Text style={styles.statCount}>{stats.count} calls</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg:</Text>
                  <Text style={styles.statValue}>{formatDuration(stats.avgDuration)}</Text>
                  <Text style={styles.statLabel}>Min:</Text>
                  <Text style={styles.statValue}>{formatDuration(stats.minDuration)}</Text>
                  <Text style={styles.statLabel}>Max:</Text>
                  <Text style={styles.statValue}>{formatDuration(stats.maxDuration)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Success:</Text>
                  <Text style={[styles.statValue, { color: '#10b981' }]}>
                    {stats.successCount} ({successRate.toFixed(1)}%)
                  </Text>
                  <Text style={styles.statLabel}>Errors:</Text>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>
                    {stats.errorCount}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Recent Metrics ({metrics.length})</Text>
          {metrics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No metrics recorded yet</Text>
              <Text style={styles.emptySubtext}>Run tests to start tracking performance</Text>
            </View>
          ) : (
            metrics.map((metric) => (
              <TouchableOpacity
                key={metric.id}
                style={[
                  styles.metricCard,
                  metric.status === 'error' && styles.metricCardError,
                  selectedMetric?.id === metric.id && styles.metricCardSelected,
                ]}
                onPress={() => setSelectedMetric(selectedMetric?.id === metric.id ? null : metric)}
              >
                <View style={styles.metricHeader}>
                  <View style={styles.metricTitleRow}>
                    <Ionicons
                      name={
                        metric.type === 'api'
                          ? 'cloud-outline'
                          : metric.type === 'database'
                          ? 'server-outline'
                          : 'globe-outline'
                      }
                      size={20}
                      color={metric.status === 'error' ? '#ef4444' : '#10b981'}
                    />
                    <Text style={styles.metricName}>{metric.name}</Text>
                  </View>
                  <View style={styles.metricBadges}>
                    <View
                      style={[
                        styles.statusBadge,
                        metric.status === 'success' && styles.statusBadgeSuccess,
                        metric.status === 'error' && styles.statusBadgeError,
                        metric.status === 'pending' && styles.statusBadgePending,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {metric.status === 'pending' ? '...' : metric.status}
                      </Text>
                    </View>
                    {metric.duration !== undefined && (
                      <Text style={styles.metricDuration}>
                        {formatDuration(metric.duration)}
                      </Text>
                    )}
                  </View>
                </View>
                {selectedMetric?.id === metric.id && (
                  <View style={styles.metricDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type:</Text>
                      <Text style={styles.detailValue}>{metric.type}</Text>
                    </View>
                    {metric.url && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>URL:</Text>
                        <Text style={styles.detailValue}>{metric.url}</Text>
                      </View>
                    )}
                    {metric.method && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Method:</Text>
                        <Text style={styles.detailValue}>{metric.method}</Text>
                      </View>
                    )}
                    {metric.responseSize && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Response Size:</Text>
                        <Text style={styles.detailValue}>
                          {(metric.responseSize / 1024).toFixed(2)} KB
                        </Text>
                      </View>
                    )}
                    {metric.error && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Error:</Text>
                        <Text style={[styles.detailValue, { color: '#ef4444' }]}>
                          {metric.error}
                        </Text>
                      </View>
                    )}
                    {metric.metadata && Object.keys(metric.metadata).length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Metadata:</Text>
                        <Text style={styles.detailValue}>
                          {JSON.stringify(metric.metadata, null, 2)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  summarySection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  testSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  statCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  metricsSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  metricCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricCardError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  metricCardSelected: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  metricBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  statusBadgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeError: {
    backgroundColor: '#fee2e2',
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
    textTransform: 'uppercase',
  },
  metricDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  metricDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 12,
    color: '#000',
    flex: 1,
  },
});

export default PerformanceTestPage;

