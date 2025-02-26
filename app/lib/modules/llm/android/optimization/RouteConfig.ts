import type { RouteConfig } from './RouteLoader';

// Define route configurations for the app
export const ROUTE_CONFIGS: RouteConfig[] = [
  {
    id: 'chat',
    path: '/chat',
    component: '~/screens/ChatScreen',
    preload: true, // Preload main chat screen
    priority: 1,
    assets: [
      {
        id: 'chat-background',
        url: '/assets/images/chat-bg.webp',
        type: 'image'
      }
    ]
  },
  {
    id: 'settings',
    path: '/settings',
    component: '~/screens/SettingsScreen',
    priority: 0,
    dependencies: ['settings-header', 'settings-section']
  },
  {
    id: 'cloud-settings',
    path: '/cloud-settings',
    component: '~/screens/CloudSettingsScreen',
    priority: 0
  },
  {
    id: 'auth',
    path: '/auth',
    component: '~/screens/AuthScreen',
    preload: true, // Preload auth screen
    priority: 1,
    assets: [
      {
        id: 'auth-logo',
        url: '/assets/images/logo.webp',
        type: 'image'
      }
    ]
  }
];