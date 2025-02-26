import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CloudManager } from '../lib/cloud/CloudManager';
import { LoadingOverlay } from '../components/LoadingOverlay';

export function CloudSettingsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cloudConfig, setCloudConfig] = useState(CloudManager.getInstance().getConfig());

  useEffect(() => {
    // Initialize cloud manager
    CloudManager.getInstance().initialize();
  }, []);

  const updateCloudConfig = async (updates: Partial<typeof cloudConfig>) => {
    try {
      const newConfig = { ...cloudConfig, ...updates };
      await CloudManager.getInstance().updateConfig(newConfig);
      setCloudConfig(newConfig);
    } catch (error) {
      Alert.alert('Error', 'Failed to update cloud settings');
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Enable Cloud Sync</Text>
              <Text style={styles.settingDescription}>
                Automatically sync your data to the cloud
              </Text>
            </View>
            <Switch
              value={cloudConfig.enabled}
              onValueChange={(value) => updateCloudConfig({ enabled: value })}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Cloud Provider</Text>
              <Text style={styles.settingDescription}>
                Choose where to store your data
              </Text>
            </View>
            <Picker
              selectedValue={cloudConfig.provider}
              onValueChange={(value) => updateCloudConfig({ provider: value })}
              style={styles.picker}
              enabled={cloudConfig.enabled}
            >
              <Picker.Item label="Google Drive" value="google" />
              <Picker.Item label="iCloud" value="icloud" />
              <Picker.Item label="Custom" value="custom" />
            </Picker>
          </View>

          {cloudConfig.provider === 'custom' && (
            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingTitle}>Custom Endpoint</Text>
                <Text style={styles.settingDescription}>
                  Enter your custom cloud storage endpoint
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={cloudConfig.customEndpoint}
                onChangeText={(value) => updateCloudConfig({ customEndpoint: value })}
                placeholder="https://your-endpoint.com"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Auto Sync</Text>
              <Text style={styles.settingDescription}>
                Automatically sync changes to cloud
              </Text>
            </View>
            <Switch
              value={cloudConfig.autoSync}
              onValueChange={(value) => updateCloudConfig({ autoSync: value })}
              disabled={!cloudConfig.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Sync Interval</Text>
              <Text style={styles.settingDescription}>
                How often to sync with cloud
              </Text>
            </View>
            <Picker
              selectedValue={cloudConfig.syncInterval}
              onValueChange={(value) => updateCloudConfig({ syncInterval: value })}
              style={styles.picker}
              enabled={cloudConfig.enabled && cloudConfig.autoSync}
            >
              <Picker.Item label="15 minutes" value={15} />
              <Picker.Item label="30 minutes" value={30} />
              <Picker.Item label="1 hour" value={60} />
              <Picker.Item label="2 hours" value={120} />
            </Picker>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>WiFi Only</Text>
              <Text style={styles.settingDescription}>
                Only sync when connected to WiFi
              </Text>
            </View>
            <Switch
              value={cloudConfig.wifiOnly}
              onValueChange={(value) => updateCloudConfig({ wifiOnly: value })}
              disabled={!cloudConfig.enabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingTitle}>Encrypt Backups</Text>
              <Text style={styles.settingDescription}>
                Encrypt data before uploading to cloud
              </Text>
            </View>
            <Switch
              value={cloudConfig.encryptBackups}
              onValueChange={(value) => updateCloudConfig({ encryptBackups: value })}
              disabled={!cloudConfig.enabled}
            />
          </View>
        </View>

        {cloudConfig.lastSync && (
          <Text style={styles.lastSync}>
            Last synced: {new Date(cloudConfig.lastSync).toLocaleString()}
          </Text>
        )}
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
  section: {
    backgroundColor: '#fff',
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingHeader: {
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  picker: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  lastSync: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
});