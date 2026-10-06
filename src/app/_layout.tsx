import '../shared/core/webShim';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Text, View } from 'react-native';
import { consumeExternal, onLaunch, playLaunch } from '../shared/core/lifecycle';
import { Image } from 'expo-image';
import { AlertHost } from '../shared/components/alertHost';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../shared/core/store';
import { C } from '../shared/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Toast() {
  const { s } = useStore();
  const insets = useSafeAreaInsets();
  if (!s.toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 90, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.ink, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, maxWidth: 420 }}>
        <Text style={{ color: '#fff', fontSize: 14 }}>{s.toast}</Text>
      </View>
    </View>
  );
}

/** Blue launch screen (logo + name) shown on every app open and role switch, then lands on `target`. */
function LaunchSplash() {
  const { get } = useStore();
  // Signed in on this device: open straight into their app; otherwise the Welcome screen.
  const home = () => { const a = get().api; return !a ? '/' : a.role === 'technician' ? (get().techVerif === 'new' ? '/tech-register' : '/tech-home') : '/home'; };
  const [shown, setShown] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const run = (then: string) => {
    setShown(true); fade.setValue(1); scale.setValue(0.86);
    const ND = Platform.OS !== 'web';
    Animated.spring(scale, { toValue: 1, useNativeDriver: ND, speed: 8, bounciness: 8 }).start();
    setTimeout(() => {
      if (router.canDismiss()) router.dismissAll();
      router.replace(then as never);
      Animated.timing(fade, { toValue: 0, duration: 320, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(() => setShown(false));
    }, 1100);
  };
  useEffect(() => {
    run(home());
    const off = onLaunch(then => run(then ?? home()));
    // Opening the app again from its icon (after it went to the background) starts afresh.
    let wasBackground = false;
    const sub = AppState.addEventListener('change', st => {
      // Only the phone apps restart from the logo when reopened; switching browser tabs on the web keeps you signed in.
      if (Platform.OS === 'web') return;
      if (st === 'background') {
        wasBackground = true;
        // Show the logo straight away (no animation) so it is already there when the app is opened again.
        setShown(true); fade.setValue(1); scale.setValue(0.86);
      }
      if (st === 'active' && wasBackground) {
        wasBackground = false;
        if (!consumeExternal()) run(home());
        else Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShown(false));
      }
    });
    return () => { off(); sub.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        {/* Same artwork as the native launch screen, so app start looks seamless */}
        <Image source={require('../../assets/splash.png')} style={{ width: 220, height: 220 }} contentFit="contain" accessibilityLabel="RepairHub" />
      </Animated.View>
    </Animated.View>
  );
}

function Root() {
  const { ready } = useStore();
  useEffect(() => {
    // Permission is asked in context (after a request or registration), not on first launch — see askNotifications().
    // Tapping a notification opens the relevant screen.
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const route = r.notification.request.content.data?.route;
      if (typeof route === 'string') router.push(route as never);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null; // native splash stays up while saved data loads
  // On a wide browser window keep the app in a phone-width column instead of stretching edge to edge.
  const wide = Platform.OS === 'web';
  return (
    <View style={{ flex: 1, backgroundColor: wide ? '#E9EEF5' : C.paper }}>
    <View style={[{ flex: 1, backgroundColor: C.paper }, wide && { width: '100%', maxWidth: 480, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line, overflow: 'hidden' }]}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(customer)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tech)" options={{ animation: 'fade' }} />
        {['confirmed', 'review-done', 'job-done', 'withdraw-done'].map(n => <Stack.Screen key={n} name={n} options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />)}
      </Stack>
      <Toast />
      {Platform.OS === 'web' ? <AlertHost /> : null}
      <LaunchSplash />
    </View>
    </View>
  );
}

export default function Layout() {
  return <SafeAreaProvider><StoreProvider><Root /></StoreProvider></SafeAreaProvider>;
}
