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

/** Figma technician tab bar: Home · Jobs · Earnings · Profile */
export default function TechTabs() {
  const { s } = useStore();
  React.useEffect(() => { setDeviceRole('technician'); return () => setDeviceRole(null); }, []);
  const jobsBadge = s.queue.length || (s.jobId && s.status === JobStatus.Accepted ? '!' : undefined);
  if (!s.api) return <Redirect href="/" />;
  // A new technician registers and uploads their ID, then RepairHub's team approves them (on the admin side).
  if (s.techVerif === 'new') return <Redirect href="/tech-register" />;
  // Under review: they can look around (Home shows the review status); quoting unlocks once verified.
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'shift', tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: C.mute, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="tech-home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon('briefcase'), tabBarBadge: jobsBadge || undefined }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="me" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
