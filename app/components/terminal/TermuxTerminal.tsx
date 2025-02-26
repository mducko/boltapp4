import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  Dimensions,
  EmitterSubscription,
} from 'react-native';
import { TermuxManager } from '~/lib/modules/llm/android/terminal/TermuxManager';

interface TermuxTerminalProps {
  onOutput?: (output: string) => void;
}

export function TermuxTerminal({ onOutput }: TermuxTerminalProps) {
  const [input, setInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const keyboardListenerRef = useRef<EmitterSubscription>();
  const termuxManager = TermuxManager.getInstance();

  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        await termuxManager.initialize();
        await termuxManager.createSession();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
      }
    };

    initializeTerminal();

    // Handle keyboard events
    keyboardListenerRef.current = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardShow
    );

    return () => {
      keyboardListenerRef.current?.remove();
      termuxManager.closeSession();
    };
  }, []);

  const handleKeyboardShow = () => {
    const { height, width } = Dimensions.get('window');
    const columns = Math.floor(width / 8); // Approximate character width
    const rows = Math.floor(height / 16); // Approximate line height
    termuxManager.resizeTerminal(columns, rows);
  };

  const handleSubmit = async () => {
    if (!input.trim() || !isReady) return;

    try {
      const output = await termuxManager.executeCommand(input);
      onOutput?.(output);
      setInput('');
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={handleSubmit}
        placeholder={isReady ? '$ ' : 'Initializing...'}
        placeholderTextColor="#666"
        autoCapitalize="none"
        autoCorrect={false}
        editable={isReady}
        multiline
        blurOnSubmit={false}
        returnKeyType="send"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 8,
  },
});