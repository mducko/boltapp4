import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const logger = createScopedLogger('ThemeManager');

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: number;
      medium: number;
      large: number;
    };
    fontWeight: {
      regular: string;
      medium: string;
      bold: string;
    };
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
}

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme;
  private customThemes: Map<string, Theme> = new Map();

  private constructor() {
    this.currentTheme = this.getDefaultTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved theme
      const savedTheme = await AsyncStorage.getItem('current_theme');
      if (savedTheme) {
        this.currentTheme = JSON.parse(savedTheme);
      }

      // Load custom themes
      const customThemes = await AsyncStorage.getItem('custom_themes');
      if (customThemes) {
        const themes = JSON.parse(customThemes);
        for (const [id, theme] of Object.entries(themes)) {
          this.customThemes.set(id, theme as Theme);
        }
      }

      // Apply current theme
      await this.applyTheme(this.currentTheme);
      logger.info('Theme manager initialized');
    } catch (error) {
      logger.error('Failed to initialize theme manager:', error);
      throw error;
    }
  }

  private getDefaultTheme(): Theme {
    return {
      id: 'default',
      name: 'Default Light',
      isDark: false,
      colors: {
        primary: '#9C7DFF',
        secondary: '#6B7280',
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#1F2937',
        textSecondary: '#4B5563',
        border: '#E5E7EB',
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B'
      },
      typography: {
        fontFamily: 'System',
        fontSize: {
          small: 12,
          medium: 14,
          large: 16
        },
        fontWeight: {
          regular: '400',
          medium: '500',
          bold: '700'
        }
      },
      spacing: {
        small: 8,
        medium: 16,
        large: 24
      },
      borderRadius: {
        small: 4,
        medium: 8,
        large: 12
      }
    };
  }

  private async applyTheme(theme: Theme): Promise<void> {
    try {
      // Apply theme to native components
      await NativeModules.ThemeModule.applyTheme({
        isDark: theme.isDark,
        colors: theme.colors,
        typography: theme.typography
      });

      // Save current theme
      await AsyncStorage.setItem('current_theme', JSON.stringify(theme));

      logger.info(`Theme applied: ${theme.name}`);
    } catch (error) {
      logger.error('Failed to apply theme:', error);
      throw error;
    }
  }

  async createTheme(theme: Omit<Theme, 'id'>): Promise<Theme> {
    try {
      const id = Math.random().toString(36).substring(2);
      const newTheme: Theme = { ...theme, id };

      // Validate theme
      this.validateTheme(newTheme);

      // Save theme
      this.customThemes.set(id, newTheme);
      await this.saveCustomThemes();

      logger.info(`Theme created: ${theme.name}`);
      return newTheme;
    } catch (error) {
      logger.error('Failed to create theme:', error);
      throw error;
    }
  }

  async updateTheme(id: string, updates: Partial<Theme>): Promise<Theme> {
    try {
      const theme = this.customThemes.get(id);
      if (!theme) {
        throw new Error(`Theme not found: ${id}`);
      }

      const updatedTheme = { ...theme, ...updates };
      this.validateTheme(updatedTheme);

      this.customThemes.set(id, updatedTheme);
      await this.saveCustomThemes();

      // Update current theme if active
      if (this.currentTheme.id === id) {
        await this.setTheme(id);
      }

      logger.info(`Theme updated: ${updatedTheme.name}`);
      return updatedTheme;
    } catch (error) {
      logger.error('Failed to update theme:', error);
      throw error;
    }
  }

  async deleteTheme(id: string): Promise<void> {
    try {
      if (id === 'default') {
        throw new Error('Cannot delete default theme');
      }

      if (!this.customThemes.has(id)) {
        throw new Error(`Theme not found: ${id}`);
      }

      this.customThemes.delete(id);
      await this.saveCustomThemes();

      // Reset to default if current theme was deleted
      if (this.currentTheme.id === id) {
        await this.setTheme('default');
      }

      logger.info(`Theme deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete theme:', error);
      throw error;
    }
  }

  async setTheme(id: string): Promise<void> {
    try {
      let theme: Theme;
      if (id === 'default') {
        theme = this.getDefaultTheme();
      } else {
        const customTheme = this.customThemes.get(id);
        if (!customTheme) {
          throw new Error(`Theme not found: ${id}`);
        }
        theme = customTheme;
      }

      await this.applyTheme(theme);
      this.currentTheme = theme;
    } catch (error) {
      logger.error('Failed to set theme:', error);
      throw error;
    }
  }

  private validateTheme(theme: Theme): void {
    // Validate required properties
    const requiredColors = [
      'primary',
      'secondary',
      'background',
      'surface',
      'text',
      'textSecondary',
      'border',
      'error',
      'success',
      'warning'
    ];

    for (const color of requiredColors) {
      if (!theme.colors[color]) {
        throw new Error(`Missing required color: ${color}`);
      }
    }

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    for (const [key, value] of Object.entries(theme.colors)) {
      if (!colorRegex.test(value)) {
        throw new Error(`Invalid color format for ${key}: ${value}`);
      }
    }

    // Validate typography
    if (!theme.typography.fontFamily) {
      throw new Error('Missing font family');
    }

    if (!theme.typography.fontSize.small || 
        !theme.typography.fontSize.medium || 
        !theme.typography.fontSize.large) {
      throw new Error('Missing font sizes');
    }

    // Validate spacing
    if (!theme.spacing.small || 
        !theme.spacing.medium || 
        !theme.spacing.large) {
      throw new Error('Missing spacing values');
    }

    // Validate border radius
    if (!theme.borderRadius.small || 
        !theme.borderRadius.medium || 
        !theme.borderRadius.large) {
      throw new Error('Missing border radius values');
    }
  }

  private async saveCustomThemes(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'custom_themes',
        JSON.stringify(Object.fromEntries(this.customThemes))
      );
    } catch (error) {
      logger.error('Failed to save custom themes:', error);
      throw error;
    }
  }

  getCurrentTheme(): Theme {
    return { ...this.currentTheme };
  }

  getTheme(id: string): Theme | undefined {
    if (id === 'default') {
      return this.getDefaultTheme();
    }
    return this.customThemes.get(id);
  }

  getAllThemes(): Theme[] {
    return [
      this.getDefaultTheme(),
      ...Array.from(this.customThemes.values())
    ];
  }
}