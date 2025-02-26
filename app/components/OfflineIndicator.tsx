import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useStore } from '@nanostores/react';
import { offlineStore } from '../stores/offline';

export function OfflineIndicator() {
  const { isOnline, pendingMessages, syncInProgress } = useStore(offlineStore);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: !isOnline || pendingMessages.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, pendingMessages.length]);

  if (isOnline && pendingMessages.length === 0) {
    return null;
  }

  const failedMessages = pendingMessages.filter(msg => msg.retryCount >= 5);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[
        styles.indicator,
        { backgroundColor: syncInProgress ? '#FFF' : '#FF9800' }
      ]} />
      <View style={styles.contentContainer}>
        <Text style={styles.text}>
          {!isOnline 
            ? 'You are offline - Messages will be sent when connection is restored'
            : syncInProgress
              ? `Syncing ${pendingMessages.length} pending messages...`
              : `${pendingMessages.length} messages waiting to sync`
          }
        </Text>
        {failedMessages.length > 0 && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              // Reset retry counts and trigger sync
              const resetMessages = pendingMessages.map(msg => ({
                ...msg,
                retryCount: 0,
                lastRetry: null,
              }));
              offlineStore.setKey('pendingMessages', resetMessages);
            }}
          >
            <Text style={styles.retryText}>
              {failedMessages.length} failed - Tap to retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF9800',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
  },
  retryButton: {
    marginTop: 4,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});