import { createScopedLogger } from '~/utils/logger';
import { LazyLoader } from './LazyLoader';
import type { ComponentType } from 'react';

const logger = createScopedLogger('ComponentLoader');

interface ComponentMetadata {
  id: string;
  path: string;
  priority: number;
  dependencies?: string[];
}

export class ComponentLoader {
  private static instance: ComponentLoader;
  private lazyLoader: LazyLoader;
  private loadedComponents: Set<string> = new Set();
  private componentCache: Map<string, ComponentType<any>> = new Map();

  private constructor() {
    this.lazyLoader = LazyLoader.getInstance();
  }

  static getInstance(): ComponentLoader {
    if (!ComponentLoader.instance) {
      ComponentLoader.instance = new ComponentLoader();
    }
    return ComponentLoader.instance;
  }

  async loadComponent(metadata: ComponentMetadata): Promise<ComponentType<any>> {
    try {
      // Check cache first
      if (this.componentCache.has(metadata.id)) {
        return this.componentCache.get(metadata.id)!;
      }

      // Load dependencies first if any
      if (metadata.dependencies) {
        await Promise.all(
          metadata.dependencies.map(depId =>
            this.lazyLoader.preloadComponent(depId)
          )
        );
      }

      // Queue component load
      await this.lazyLoader.queueLoad(
        metadata.id,
        async () => {
          const component = await import(metadata.path);
          this.componentCache.set(metadata.id, component.default);
          this.loadedComponents.add(metadata.id);
        },
        metadata.priority
      );

      // Wait for component to be available
      while (!this.componentCache.has(metadata.id)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return this.componentCache.get(metadata.id)!;
    } catch (error) {
      logger.error(`Failed to load component ${metadata.id}:`, error);
      throw error;
    }
  }

  async preloadComponent(metadata: ComponentMetadata): Promise<void> {
    try {
      if (this.loadedComponents.has(metadata.id)) {
        return;
      }

      await this.lazyLoader.preloadComponent(metadata.id);
      logger.debug(`Component preloaded: ${metadata.id}`);
    } catch (error) {
      logger.error(`Failed to preload component ${metadata.id}:`, error);
      throw error;
    }
  }

  clearCache(): void {
    this.componentCache.clear();
    this.loadedComponents.clear();
    logger.info('Component cache cleared');
  }

  isComponentLoaded(componentId: string): boolean {
    return this.loadedComponents.has(componentId);
  }
}