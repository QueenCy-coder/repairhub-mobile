import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ColorValue } from 'react-native';
import { setDeviceRole, useStore } from '../../shared/core/store';
import { C } from '../../shared/components/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
/** Filled icon when the tab is active, outline otherwise (iOS convention). */
const icon = (name: IconName) => function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) { return <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={22} color={color as string} />; };

/** Service center tab bar: Home · Jobs · Team · Earnings · Profile */
export default function CenterTabs() {
  const { s } = useStore();
  React.useEffect(() => { setDeviceRole('service_center'); return () => setDeviceRole(null); }, []);
  if (!s.api) return <Redirect href="/" />;
  // A new center sets up its business and sends its documents, then RepairHub's team verifies it.
  if (s.centerVerif === 'new') return <Redirect href="/center-setup" />;
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'shift', tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.mute, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="center-home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="center-jobs" options={{ title: 'Jobs', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="center-team" options={{ title: 'Team', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="center-earnings" options={{ title: 'Earnings', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="center-profile" options={{ title: 'Profile', tabBarIcon: icon('storefront') }} />
    </Tabs>
  );
}