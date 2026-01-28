/**
 * Profile Switching Test Component
 * 
 * This component provides a test interface to repeatedly switch between
 * user and company profiles to verify the fixes work correctly.
 * 
 * Usage: Add this component to your app temporarily for testing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApi } from '../contexts/ApiContext';
import streamChatService from '../services/StreamChatService';

interface ProfileSwitchTestProps {
  onClose?: () => void;
}

export const ProfileSwitchTest: React.FC<ProfileSwitchTestProps> = ({ onClose }) => {
  const {
    user,
    currentProfileType,
    activeCompany,
    switchToUserProfile,
    switchToCompanyProfile,
    getUserCompanies,
  } = useApi();

  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    timestamp: string;
    type: 'switch' | 'error' | 'success';
    message: string;
  }>>([]);
  const [switchCount, setSwitchCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Load available companies
  useEffect(() => {
    const loadCompanies = async () => {
      if (!user?.id) return;
      
      setIsLoadingCompanies(true);
      try {
        const response = await getUserCompanies(user.id);
        if (response.success && response.data) {
          const responseData = response.data as any;
          const companies = Array.isArray(responseData)
            ? responseData
            : (responseData.data || []);
          
          // Filter to only owner/admin companies
          const eligibleCompanies = companies.filter((cm: any) => {
            const role = cm.role || cm.member?.role;
            return role === 'owner' || role === 'admin';
          });
          
          setAvailableCompanies(eligibleCompanies);
        }
      } catch (error: any) {
        addTestResult('error', `Failed to load companies: ${error.message}`);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, [user?.id, getUserCompanies]);

  const addTestResult = useCallback((type: 'switch' | 'error' | 'success', message: string) => {
    const result = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setTestResults(prev => [...prev.slice(-49), result]); // Keep last 50 results
  }, []);

  const checkStreamChatConnection = useCallback(() => {
    const client = streamChatService.getClient();
    const isConnected = streamChatService.isConnected();
    const connectionState = (client as any)?.connectionState;
    const userId = client?.userID;

    return {
      isConnected,
      connectionState,
      userId,
      hasClient: !!client,
    };
  }, []);

  const performSwitch = useCallback(async (targetType: 'user' | 'company') => {
    try {
      const beforeState = {
        profileType: currentProfileType,
        companyId: activeCompany?.id,
        streamChat: checkStreamChatConnection(),
      };

      addTestResult('switch', `Switching to ${targetType} profile...`);

      if (targetType === 'user') {
        await switchToUserProfile();
      } else {
        // Switch to first available company
        if (availableCompanies.length === 0) {
          addTestResult('error', 'No companies available to switch to');
          return false;
        }
        const companyId = availableCompanies[0].companies?.id || 
                        availableCompanies[0].company_id || 
                        availableCompanies[0].id;
        await switchToCompanyProfile(companyId);
      }

      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      const afterState = {
        profileType: currentProfileType,
        companyId: activeCompany?.id,
        streamChat: checkStreamChatConnection(),
      };

      // Verify switch was successful
      const switchSuccessful = targetType === 'user' 
        ? afterState.profileType === 'user'
        : afterState.profileType === 'company' && afterState.companyId;

      if (switchSuccessful) {
        addTestResult('success', `✅ Successfully switched to ${targetType} profile`);
        setSwitchCount(prev => prev + 1);
        return true;
      } else {
        addTestResult('error', `❌ Switch to ${targetType} failed - state mismatch`);
        setErrorCount(prev => prev + 1);
        return false;
      }
    } catch (error: any) {
      addTestResult('error', `❌ Error during switch: ${error.message || error}`);
      setErrorCount(prev => prev + 1);
      return false;
    }
  }, [
    currentProfileType,
    activeCompany,
    availableCompanies,
    switchToUserProfile,
    switchToCompanyProfile,
    checkStreamChatConnection,
    addTestResult,
  ]);

  const runContinuousTest = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setSwitchCount(0);
    setErrorCount(0);
    setTestResults([]);

    addTestResult('switch', '🚀 Starting continuous profile switching test...');

    const maxSwitches = 10; // Test 10 switches
    let currentTarget: 'user' | 'company' = currentProfileType === 'user' ? 'company' : 'user';

    for (let i = 0; i < maxSwitches; i++) {
      if (!isRunning) break; // Allow manual stop

      const success = await performSwitch(currentTarget);
      
      if (!success) {
        addTestResult('error', `⚠️ Switch ${i + 1} failed, continuing...`);
      }

      // Alternate between user and company
      currentTarget = currentTarget === 'user' ? 'company' : 'user';

      // Wait between switches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    addTestResult('success', `✅ Test completed: ${switchCount} successful switches, ${errorCount} errors`);
    setIsRunning(false);
  }, [isRunning, currentProfileType, performSwitch, switchCount, errorCount, addTestResult]);

  const stopTest = useCallback(() => {
    setIsRunning(false);
    addTestResult('switch', '⏹️ Test stopped by user');
  }, [addTestResult]);

  const clearResults = useCallback(() => {
    setTestResults([]);
    setSwitchCount(0);
    setErrorCount(0);
  }, []);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not authenticated</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Switching Test</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current Profile</Text>
          <Text style={styles.statValue}>
            {currentProfileType === 'company' ? activeCompany?.name || 'Company' : 'User'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Successful Switches</Text>
          <Text style={styles.statValue}>{switchCount}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Errors</Text>
          <Text style={[styles.statValue, errorCount > 0 && styles.errorValue]}>
            {errorCount}
          </Text>
        </View>
      </View>

      <View style={styles.streamChatInfo}>
        <Text style={styles.infoLabel}>StreamChat Status:</Text>
        {(() => {
          const status = checkStreamChatConnection();
          return (
            <View style={styles.statusDetails}>
              <Text style={styles.statusText}>
                Connected: {status.isConnected ? '✅' : '❌'}
              </Text>
              <Text style={styles.statusText}>
                State: {status.connectionState || 'unknown'}
              </Text>
              <Text style={styles.statusText}>
                User ID: {status.userId ? status.userId.substring(0, 20) + '...' : 'none'}
              </Text>
            </View>
          );
        })()}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isRunning && styles.disabledButton]}
          onPress={runContinuousTest}
          disabled={isRunning || isLoadingCompanies}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run Continuous Test (10 switches)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={performSwitch.bind(null, currentProfileType === 'user' ? 'company' : 'user')}
          disabled={isRunning || isLoadingCompanies || availableCompanies.length === 0}
        >
          <Text style={styles.buttonText}>
            Switch to {currentProfileType === 'user' ? 'Company' : 'User'}
          </Text>
        </TouchableOpacity>

        {isRunning && (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopTest}
          >
            <Text style={styles.buttonText}>Stop Test</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {isLoadingCompanies && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      )}

      {availableCompanies.length === 0 && !isLoadingCompanies && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ No companies available. You need to be owner/admin of at least one company.
          </Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.length === 0 ? (
          <Text style={styles.noResultsText}>No test results yet. Run a test to see results.</Text>
        ) : (
          testResults.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultItem,
                result.type === 'error' && styles.errorItem,
                result.type === 'success' && styles.successItem,
              ]}
            >
              <Text style={styles.resultTimestamp}>{result.timestamp}</Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  errorValue: {
    color: '#ef4444',
  },
  streamChatInfo: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusDetails: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#10b981',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  clearButton: {
    backgroundColor: '#6b7280',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6b7280',
  },
  warningContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  noResultsText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
  },
  errorItem: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  successItem: {
    borderLeftColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  resultTimestamp: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  resultMessage: {
    fontSize: 12,
    color: '#1f2937',
  },
});

export default ProfileSwitchTest;


