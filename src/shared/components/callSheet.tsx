// Call button + popup. The button shows only an icon and "Call"; the number appears in a sheet when tapped,
// with Call and Copy actions. Keeps numbers off busy screens and matches the iOS "tap to reveal" pattern.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { call } from '../core/native';
import { useStore } from '../core/store';
import { Avatar, Btn, C } from './ui';

async function copyNumber(num: string, toast: (m: string) => void) {
  const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
  if (Platform.OS === 'web' && nav?.clipboard) { await nav.clipboard.writeText(num).then(() => toast('Number copied')).catch(() => {}); return; }
  Share.share({ message: num }).catch(() => {});
}

export function CallButton({ name, phone, role, label = 'Call', small, variant = 'sec' }: {
  name: string; phone: string; role: string; label?: string; small?: boolean; variant?: 'pri' | 'sec';
}) {
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) { a.setValue(0); Animated.timing(a, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(); }
  }, [open, a]);
  return (
    <>
      <Btn small={small} variant={variant} icon="call" title={label} onPress={() => setOpen(true)} style={small ? { marginTop: 0 } : undefined} />
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(16,24,40,0.45)', justifyContent: 'flex-end', opacity: a }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <Animated.View accessibilityViewIsModal style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 16 + Math.max(insets.bottom, 12), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [240, 0] }) }] }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.input, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar label={name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{name}</Text>
                <Text style={{ fontSize: 13, color: C.mute }}>{role}</Text>
              </View>
            </View>
            <Pressable onPress={() => copyNumber(phone, toast)} accessibilityRole="button" accessibilityLabel={`Phone number ${phone}. Tap to copy`}
              style={{ marginTop: 16, backgroundColor: C.primarySoft, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: 0.5 }} selectable>{phone}</Text>
              <Text style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>Tap the number to copy it</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}><Btn title="Copy" variant="sec" onPress={() => { copyNumber(phone, toast); setOpen(false); }} /></View>
              <Pressable onPress={() => { setOpen(false); setTimeout(() => call(phone), Platform.OS === 'ios' ? 450 : 0); }} accessibilityRole="button" accessibilityLabel={`Call ${phone}`}
                style={({ pressed }) => ({ flex: 1.4, marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 })}>
                <Ionicons name="call" size={17} color="#fff" /><Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Call now</Text>
              </Pressable>
            </View>
            <Btn title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
