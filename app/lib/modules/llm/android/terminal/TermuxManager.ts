import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('TermuxManager');

interface TermuxConfig {
  enabled: boolean;
  defaultShell: string;
  fontFamily: string;
  fontSize: number;
  termType: string;
  bellEnabled: boolean;
  vibrationEnabled: boolean;
  backIsEscape: boolean;
  extraKeys: string[];
}

export class TermuxManager {
  private static instance: TermuxManager;
  private terminalSession: any = null;
  private isInitialized = false;

  private config: TermuxConfig = {
    enabled: true,
    defaultShell: 'bash',
    fontFamily: 'Fira Code',
    fontSize: 14,
    termType: 'xterm-256color',
    bellEnabled: true,
    vibrationEnabled: true,
    backIsEscape: false,
    extraKeys: ['ESC', 'TAB', 'CTRL', 'ALT']
  };

  private constructor() {}

  static getInstance(): TermuxManager {
    if (!TermuxManager.instance) {
      TermuxManager.instance = new TermuxManager();
    }
    return TermuxManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('termux_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Initialize Termux service
      await NativeModules.TermuxModule.initialize({
        shell: this.config.defaultShell,
        termType: this.config.termType,
        fontSize: this.config.fontSize,
        fontFamily: this.config.fontFamily,
        bellEnabled: this.config.bellEnabled,
        vibrationEnabled: this.config.vibrationEnabled,
        backIsEscape: this.config.backIsEscape,
        extraKeys: this.config.extraKeys
      });

      this.isInitialized = true;
      logger.info('Termux manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Termux manager:', error);
      throw error;
    }
  }

  async createSession(): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Termux manager not initialized');
      }

      this.terminalSession = await NativeModules.TermuxModule.createSession();
      logger.info('Terminal session created');
    } catch (error) {
      logger.error('Failed to create terminal session:', error);
      throw error;
    }
  }

  async executeCommand(command: string): Promise<string> {
    try {
      if (!this.terminalSession) {
        throw new Error('No active terminal session');
      }

      const result = await NativeModules.TermuxModule.executeCommand(
        this.terminalSession,
        command
      );
      return result;
    } catch (error) {
      logger.error('Failed to execute command:', error);
      throw error;
    }
  }

  async resizeTerminal(columns: number, rows: number): Promise<void> {
    try {
      if (!this.terminalSession) {
        throw new Error('No active terminal session');
      }

      await NativeModules.TermuxModule.resizeTerminal(
        this.terminalSession,
        columns,
        rows
      );
    } catch (error) {
      logger.error('Failed to resize terminal:', error);
      throw error;
    }
  }

  async installPackage(packageName: string): Promise<void> {
    try {
      await NativeModules.TermuxModule.installPackage(packageName);
      logger.info(`Package installed: ${packageName}`);
    } catch (error) {
      logger.error('Failed to install package:', error);
      throw error;
    }
  }

  async updatePackages(): Promise<void> {
    try {
      await NativeModules.TermuxModule.updatePackages();
      logger.info('Packages updated successfully');
    } catch (error) {
      logger.error('Failed to update packages:', error);
      throw error;
    }
  }

  async closeSession(): Promise<void> {
    try {
      if (this.terminalSession) {
        await NativeModules.TermuxModule.closeSession(this.terminalSession);
        this.terminalSession = null;
        logger.info('Terminal session closed');
      }
    } catch (error) {
      logger.error('Failed to close terminal session:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<TermuxConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('termux_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  getConfig(): TermuxConfig {
    return { ...this.config };
  }

  isSessionActive(): boolean {
    return this.terminalSession !== null;
  }
}