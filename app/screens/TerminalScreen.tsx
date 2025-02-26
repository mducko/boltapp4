import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { TermuxTerminal } from '~/components/terminal/TermuxTerminal';
import { TermuxManager } from '~/lib/modules/llm/android/terminal/TermuxManager';

export function TerminalScreen() {
  const [output, setOutput] = useState<string[]>([]);
  const termuxManager = TermuxManager.getInstance();

  const handleOutput = (text: string) => {
    setOutput(prev => [...prev, text]);
  };

  const handleClear = () => {
    setOutput([]);
  };

  const handleUpdatePackages = async () => {
    try {
      await termuxManager.updatePackages();
    } catch (error) {
      console.error('Failed to update packages:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={handleClear}
        >
          <Text style={styles.toolbarButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={handleUpdatePackages}
        >
          <Text style={styles.toolbarButtonText}>Update</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.outputContainer}>
        {output.map((text, index) => (
          <Text key={index} style={styles.outputText}>
            {text}
          </Text>
        ))}
      </ScrollView>

      <TermuxTerminal onOutput={handleOutput} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  toolbarButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  toolbarButtonText: {
    color: '#fff',
  },
  outputContainer: {
    flex: 1,
    padding: 8,
  },
  outputText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});