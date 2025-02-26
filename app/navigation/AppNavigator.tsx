import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteLoader } from '~/lib/modules/llm/android/optimization/RouteLoader';
import { ROUTE_CONFIGS } from '~/lib/modules/llm/android/optimization/RouteConfig';
import { LoadingOverlay } from '~/components/LoadingOverlay';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [routes, setRoutes] = React.useState<{
    [key: string]: React.ComponentType<any>;
  }>({});

  useEffect(() => {
    const routeLoader = RouteLoader.getInstance();

    // Load initial routes
    const loadRoutes = async () => {
      try {
        // Preload high priority routes first
        await routeLoader.preloadRoutes(ROUTE_CONFIGS);

        // Load route components
        const loadedRoutes: typeof routes = {};
        for (const config of ROUTE_CONFIGS) {
          loadedRoutes[config.id] = await routeLoader.loadRoute(config);
        }

        setRoutes(loadedRoutes);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load routes:', error);
        // Handle error appropriately
      }
    };

    loadRoutes();
  }, []);

  if (isLoading) {
    return <LoadingOverlay message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#9C7DFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen 
          name="Auth" 
          component={routes.auth}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Chat" 
          component={routes.chat}
          options={{
            title: 'Bolt.droid',
            headerRight: () => (
              <SettingsButton />
            ),
          }}
        />
        <Stack.Screen 
          name="Settings" 
          component={routes.settings}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="CloudSettings"
          component={routes['cloud-settings']}
          options={{ title: 'Cloud Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}