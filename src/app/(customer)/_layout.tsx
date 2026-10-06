import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ColorValue } from 'react-native';
import { JobStatus } from '../../shared/core/data';
import { setDeviceRole, useStore } from '../../shared/core/store';
import { C } from '../../shared/components/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
/** Filled icon when the tab is active, outline otherwise (iOS convention). */
const icon = (name: IconName) => ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={22} color={color as string} />;

/** Figma customer tab bar: Home · My Repairs · Profile */
export default function CustomerTabs() {
  const { s } = useStore();
  React.useEffect(() => { setDeviceRole('customer'); return () => setDeviceRole(null); }, []);
  // Quotes to compare, or a finished repair to confirm.
  const needsAction = s.status === JobStatus.Quoted || s.status === JobStatus.Completed;
  if (!s.api) return <Redirect href="/" />;
  // A new customer finishes their profile before they can use the app.
  if (!s.custOnboarded) return <Redirect href="/cust-setup" />;
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'shift', tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.mute, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="repairs" options={{ title: 'My Repairs', tabBarIcon: icon('receipt'), tabBarBadge: needsAction ? '!' : undefined }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
