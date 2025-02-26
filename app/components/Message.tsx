import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { Message as MessageType } from 'ai';
import Markdown from 'react-native-markdown-display';
import { MermaidRenderer } from './MermaidRenderer';

interface MessageProps {
  message: MessageType & { pending?: boolean };
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  // Extract Mermaid diagrams from the message content
  const renderContent = () => {
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(message.content)) !== null) {
      // Add text before the diagram
      if (match.index > lastIndex) {
        parts.push(
          <Markdown key={lastIndex} style={markdownStyles}>
            {message.content.slice(lastIndex, match.index)}
          </Markdown>
        );
      }

      // Add the Mermaid diagram
      parts.push(
        <MermaidRenderer
          key={`mermaid-${match.index}`}
          chart={match[1]}
          theme={isUser ? 'default' : 'dark'}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last diagram
    if (lastIndex < message.content.length) {
      parts.push(
        <Markdown key={lastIndex} style={markdownStyles}>
          {message.content.slice(lastIndex)}
        </Markdown>
      );
    }

    return parts;
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userMessage : styles.assistantMessage,
      message.pending && styles.pendingMessage
    ]}>
      {renderContent()}
      
      {message.pending && (
        <View style={styles.pendingIndicator}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.pendingText}>Waiting to send...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#9C7DFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  pendingMessage: {
    opacity: 0.7,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

const markdownStyles = {
  body: {
    color: '#000',
  },
  code_inline: {
    backgroundColor: '#eee',
    borderRadius: 3,
    padding: 2,
  },
  code_block: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
  link: {
    color: '#9C7DFF',
  },
};