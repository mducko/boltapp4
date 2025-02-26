import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '@nanostores/react';
import { storageStats } from '../stores/storage';
import { formatBytes } from '../utils/storageQuotas';

export function StorageStats() {
  const stats = useStore(storageStats);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Total Storage Used:</Text>
        <Text style={styles.value}>{formatBytes(stats.totalSize)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Messages:</Text>
        <Text style={styles.value}>{stats.messageCount}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Attachments:</Text>
        <Text style={styles.value}>{formatBytes(stats.attachmentSize)}</Text>
      </View>
      
      {stats.lastChecked && (
        <View style={styles.row}>
          <Text style={styles.label}>Last Synced:</Text>
          <Text style={styles.value}>
            {new Date(stats.lastChecked).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});