import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore } from '@nanostores/react';
import { chatStore } from '../stores/chat';
import { offlineStore, addPendingMessage, saveMessages } from '../stores/offline';
import { Message } from '../components/Message';
import { ModelSelector } from '../components/ModelSelector';
import { OfflineIndicator } from '../components/OfflineIndicator';
import type { Message as MessageType } from 'ai';

export function ChatScreen() {
  const [input, setInput] = useState('');
  const messages = useStore(chatStore.messages);
  const { isOnline } = useStore(offlineStore);

  // Save messages to local storage when they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const messageContent = input.trim();
    setInput('');

    if (!isOnline) {
      // Store message for later if offline
      const pendingMessage = await addPendingMessage(messageContent);
      
      // Add to UI immediately with pending state
      const message: MessageType = {
        id: pendingMessage.id,
        role: 'user',
        content: messageContent,
        pending: true,
      };
      
      chatStore.setKey('messages', [...messages, message]);
    } else {
      // Send normally if online
      const message: MessageType = {
        id: Date.now().toString(),
        role: 'user',
        content: messageContent,
      };
      
      chatStore.setKey('messages', [...messages, message]);
      // Normal message sending logic here
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <OfflineIndicator />
      <ModelSelector />
      
      <FlatList
        data={messages}
        renderItem={({ item }) => <Message message={item} />}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
        >
          <Icon name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageList: {
    flex: 1,
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9C7DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});