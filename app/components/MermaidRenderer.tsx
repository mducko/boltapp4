import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  theme?: 'default' | 'dark';
}

export function MermaidRenderer({ chart, theme = 'default' }: MermaidRendererProps) {
  try {
    // Initialize mermaid with mobile-optimized settings
    mermaid.initialize({
      startOnLoad: true,
      theme: theme,
      securityLevel: 'loose',
      fontSize: 16,
    });
  } catch (error) {
    console.error('Failed to initialize Mermaid:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to render diagram</Text>
      </View>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <style>
          body { margin: 0; padding: 8px; background: transparent; }
          #diagram { width: 100%; }
        </style>
      </head>
      <body>
        <div class="mermaid" id="diagram">
          ${chart}
        </div>
        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: '${theme}',
            fontSize: 16,
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={(event) => {
          // Handle any messages from the WebView if needed
          console.log('WebView message:', event.nativeEvent.data);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginVertical: 8,
  },
  webview: {
    backgroundColor: 'transparent',
    height: 300, // Default height, can be adjusted based on content
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
});