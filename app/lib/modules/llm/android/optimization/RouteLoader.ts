import { createScopedLogger } from '~/utils/logger';
import { LazyLoader } from './LazyLoader';
import { ComponentLoader } from './ComponentLoader';
import { AssetLoader } from './AssetLoader';
import type { ComponentType } from 'react';

const logger = createScopedLogger('RouteLoader');

interface RouteConfig {
  id: string;
  path: string;
  component: string;
  preload?: boolean;
  priority?: number;
  assets?: {
    id: string;
    url: string;
    type: 'image' | 'font' | 'audio' | 'video';
  }[];
  dependencies?: string[];
}

interface RouteCache {
  component: ComponentType<any>;
  lastAccessed: number;
}

export class RouteLoader {
  private static instance: RouteLoader;
  private lazyLoader: LazyLoader;
  private componentLoader: ComponentLoader;
  private assetLoader: AssetLoader;
  private routeCache: Map<string, RouteCache> = new Map();
  private preloadedRoutes: Set<string> = new Set();

  private constructor() {
    this.lazyLoader = LazyLoader.getInstance();
    this.componentLoader = ComponentLoader.getInstance();
    this.assetLoader = AssetLoader.getInstance();
  }

  static getInstance(): RouteLoader {
    if (!RouteLoader.instance) {
      RouteLoader.instance = new RouteLoader();
    }
    return RouteLoader.instance;
  }

  async loadRoute(config: RouteConfig): Promise<ComponentType<any>> {
    try {
      // Check cache first
      const cached = this.routeCache.get(config.id);
      if (cached) {
        cached.lastAccessed = Date.now();
        return cached.component;
      }

      // Load dependencies first
      if (config.dependencies) {
        await Promise.all(
          config.dependencies.map(depId =>
            this.componentLoader.preloadComponent({
              id: depId,
              path: `${config.path}/${depId}`,
              priority: config.priority || 0
            })
          )
        );
      }

      // Load route component
      const component = await this.componentLoader.loadComponent({
        id: config.id,
        path: config.component,
        priority: config.priority || 0,
        dependencies: config.dependencies
      });

      // Load route assets
      if (config.assets) {
        await Promise.all(
          config.assets.map(asset =>
            this.assetLoader.loadAsset({
              id: asset.id,
              url: asset.url,
              type: asset.type,
              priority: config.priority || 0
            })
          )
        );
      }

      // Cache the loaded route
      this.routeCache.set(config.id, {
        component,
        lastAccessed: Date.now()
      });

      logger.info(`Route loaded: ${config.id}`);
      return component;
    } catch (error) {
      logger.error(`Failed to load route ${config.id}:`, error);
      throw error;
    }
  }

  async preloadRoute(config: RouteConfig): Promise<void> {
    try {
      if (this.preloadedRoutes.has(config.id)) {
        return;
      }

      // Preload component
      await this.componentLoader.preloadComponent({
        id: config.id,
        path: config.component,
        priority: config.priority || 0,
        dependencies: config.dependencies
      });

      // Preload assets
      if (config.assets) {
        await Promise.all(
          config.assets.map(asset =>
            this.assetLoader.preloadAsset({
              id: asset.id,
              url: asset.url,
              type: asset.type,
              priority: config.priority || 0
            })
          )
        );
      }

      this.preloadedRoutes.add(config.id);
      logger.debug(`Route preloaded: ${config.id}`);
    } catch (error) {
      logger.error(`Failed to preload route ${config.id}:`, error);
      throw error;
    }
  }

  async preloadRoutes(routes: RouteConfig[]): Promise<void> {
    try {
      // Sort routes by priority
      const sortedRoutes = [...routes].sort((a, b) => 
        (b.priority || 0) - (a.priority || 0)
      );

      // Preload routes in order
      for (const route of sortedRoutes) {
        if (route.preload) {
          await this.preloadRoute(route);
        }
      }
    } catch (error) {
      logger.error('Failed to preload routes:', error);
      throw error;
    }
  }

  clearCache(olderThan?: number): void {
    const now = Date.now();
    for (const [id, cache] of this.routeCache.entries()) {
      if (!olderThan || (now - cache.lastAccessed > olderThan)) {
        this.routeCache.delete(id);
        this.preloadedRoutes.delete(id);
      }
    }
    logger.info('Route cache cleared');
  }

  isRouteLoaded(routeId: string): boolean {
    return this.routeCache.has(routeId);
  }

  isRoutePreloaded(routeId: string): boolean {
    return this.preloadedRoutes.has(routeId);
  }
}