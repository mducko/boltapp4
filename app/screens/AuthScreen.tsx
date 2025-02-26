import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { BiometricAuth } from '../utils/biometrics';
import { storage } from '../stores/storage';
import { useNavigation } from '@react-navigation/native';

export function AuthScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState<string>('');
  const navigation = useNavigation();
  const biometricAuth = BiometricAuth.getInstance();

  useEffect(() => {
    initializeBiometrics();
  }, []);

  const initializeBiometrics = async () => {
    try {
      await biometricAuth.initialize();
      const type = biometricAuth.getBiometryType();
      setBiometricType(type || '');
    } catch (error) {
      console.error('Biometric initialization failed:', error);
      Alert.alert(
        'Error',
        'Failed to initialize biometric authentication'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await biometricAuth.authenticate(
        'Verify your identity to access Bolt.droid'
      );

      if (success) {
        // Generate and store biometric signature
        const { success: signSuccess, signature } = await biometricAuth.signData(
          'bolt.droid.auth'
        );

        if (signSuccess && signature) {
          await storage.set('biometric_signature', signature, {
            encrypt: true,
          });
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      Alert.alert(
        'Authentication Failed',
        'Please try again or use an alternative authentication method'
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Bolt.droid</Text>
      
      {biometricType ? (
        <TouchableOpacity
          style={styles.authButton}
          onPress={handleBiometricAuth}
        >
          <Text style={styles.authButtonText}>
            {Platform.select({
              ios: biometricType === 'FaceID' 
                ? 'Sign in with Face ID'
                : 'Sign in with Touch ID',
              android: 'Sign in with Biometrics',
            })}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.fallbackText}>
          Biometric authentication not available
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  authButton: {
    backgroundColor: '#9C7DFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});