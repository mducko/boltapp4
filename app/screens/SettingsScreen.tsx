import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StorageStats } from '../components/StorageStats';
import { SettingsSection } from '../components/SettingsSection';
import { storage } from '../stores/storage';
import { offlineStore } from '../stores/offline';
import { exportData, importData } from '../utils/dataTransfer';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { AutoBackupManager } from '../lib/backup/AutoBackupManager';
import { useNavigation } from '@react-navigation/native';

export function SettingsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [backupConfig, setBackupConfig] = useState(AutoBackupManager.getInstance().getConfig());
  const navigation = useNavigation();

  useEffect(() => {
    // Initialize auto backup manager
    AutoBackupManager.getInstance().initialize();
  }, []);

  const clearData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your messages and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              setLoadingMessage('Clearing data...');
              await storage.clear();
              offlineStore.set({
                isOnline: true,
                pendingMessages: [],
                lastSyncTimestamp: null,
                syncInProgress: false,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Preparing backup...');
      await exportData();
      Alert.alert('Success', 'Data exported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Restoring backup...');
      await importData();
      Alert.alert('Success', 'Data imported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBackupConfig = async (updates: Partial<typeof backupConfig>) => {
    try {
      const newConfig = { ...backupConfig, ...updates };
      await AutoBackupManager.getInstance().updateConfig(newConfig);
      setBackupConfig(newConfig);
    } catch (error) {
      Alert.alert('Error', 'Failed to update backup settings');
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <StorageStats />
        
        <SettingsSection
          title="Cloud Storage"
          items={[
            {
              title: 'Cloud Settings',
              description: 'Configure cloud backup and sync',
              action: () => navigation.navigate('CloudSettings'),
            },
          ]}
        />

        <SettingsSection
          title="Auto Backup"
          items={[
            {
              title: 'Enable Auto Backup',
              description: 'Automatically backup your data periodically',
              component: (
                <Switch
                  value={backupConfig.enabled}
                  onValueChange={(value) => updateBackupConfig({ enabled: value })}
                />
              ),
            },
            {
              title: 'Backup Interval',
              description: 'How often to create backups',
              component: (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Every</Text>
                  <Picker
                    selectedValue={backupConfig.interval}
                    onValueChange={(value) => updateBackupConfig({ interval: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="6 hours" value={6} />
                    <Picker.Item label="12 hours" value={12} />
                    <Picker.Item label="24 hours" value={24} />
                    <Picker.Item label="48 hours" value={48} />
                  </Picker>
                </View>
              ),
            },
            {
              title: 'WiFi Only',
              description: 'Only backup when connected to WiFi',
              component: (
                <Switch
                  value={backupConfig.wifiOnly}
                  onValueChange={(value) => updateBackupConfig({ wifiOnly: value })}
                />
              ),
            },
            {
              title: 'Keep Backups',
              description: 'Number of backups to retain',
              component: (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Keep</Text>
                  <Picker
                    selectedValue={backupConfig.retainCount}
                    onValueChange={(value) => updateBackupConfig({ retainCount: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="3 backups" value={3} />
                    <Picker.Item label="5 backups" value={5} />
                    <Picker.Item label="7 backups" value={7} />
                    <Picker.Item label="10 backups" value={10} />
                  </Picker>
                </View>
              ),
            },
          ]}
        />
        
        <SettingsSection
          title="Manual Backup"
          items={[
            {
              title: 'Clear All Data',
              description: 'Delete all stored messages and settings',
              action: clearData,
              destructive: true,
            },
            {
              title: 'Export Data',
              description: 'Save your data as a backup file',
              action: handleExport,
            },
            {
              title: 'Import Data',
              description: 'Restore from a backup file',
              action: handleImport,
            },
          ]}
        />
      </ScrollView>

      {isLoading && <LoadingOverlay message={loadingMessage} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#666',
  },
  picker: {
    flex: 1,
    height: 40,
  },
});