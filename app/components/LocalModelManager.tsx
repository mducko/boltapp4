import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useStore } from '@nanostores/react';
import { localModelStore, downloadModel, deleteModel } from '../stores/localModels';
import { formatBytes } from '../utils/storageQuotas';

export function LocalModelManager() {
  const { availableModels, isDownloading, downloadProgress } = useStore(localModelStore);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local Models</Text>
      
      {availableModels.map(model => (
        <View key={model.name} style={styles.modelCard}>
          <View>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelInfo}>
              Size: {formatBytes(model.size || 0)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => deleteModel(model.name)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}

      {isDownloading && (
        <View style={styles.downloadingContainer}>
          <ActivityIndicator size="small" color="#9C7DFF" />
          <Text style={styles.downloadingText}>
            Downloading... {downloadProgress.toFixed(1)}%
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
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modelCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
  },
  modelInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  downloadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});