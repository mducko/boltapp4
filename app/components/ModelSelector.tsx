import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useStore } from '@nanostores/react';
import { modelStore } from '../stores/model';

export function ModelSelector() {
  const selectedModel = useStore(modelStore);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Model:</Text>
      <TouchableOpacity style={styles.selector}>
        <Text style={styles.modelName}>{selectedModel || 'Select Model'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    marginRight: 10,
  },
  selector: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  modelName: {
    fontSize: 14,
  },
});