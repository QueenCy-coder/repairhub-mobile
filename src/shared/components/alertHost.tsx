// In-app dialog used on web in place of browser alert/confirm/prompt (react-native-web's Alert is a no-op).
// iOS/Android keep the native Alert. Styled to the RepairHub design system and animated.
import React, { useEffect, useRef, useState } from 'react';
import { AlertButton, Animated, Easing, Pressable, Text, View } from 'react-native';
import { C } from './ui';

type Req = { title: string; message?: string; buttons: AlertButton[] };
let push: ((r: Req) => void) | null = null;
const pending: Req[] = [];
export function showDialog(title: string, message?: string, buttons?: AlertButton[]) {
  const r = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  if (push) push(r); else pending.push(r);
}

export function AlertHost() {
  const [req, setReq] = useState<Req | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { push = r => setReq(r); if (pending.length) setReq(pending.shift()!); return () => { push = null; }; }, []);
  useEffect(() => { if (req) { a.setValue(0); Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); } }, [req, a]);
  if (!req) return null;
  const close = (b?: AlertButton) => { setReq(pending.shift() ?? null); b?.onPress?.(); };
  const cancel = req.buttons.find(b => b.style === 'cancel');
  const actions = req.buttons.filter(b => b !== cancel);
  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,24,40,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24, opacity: a }} accessibilityViewIsModal>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => close(cancel)} accessibilityLabel="Dismiss" />
      <Animated.View accessibilityRole="alert" style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 16, padding: 20, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{req.title}</Text>
        {req.message ? <Text style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 20 }}>{req.message}</Text> : null}
        <View style={{ marginTop: 16, gap: 8 }}>
          {actions.map(b => (
            <Pressable key={b.text} onPress={() => close(b)} accessibilityRole="button"
              style={({ pressed }) => ({ paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: b.style === 'destructive' ? C.badBg : C.primary, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: b.style === 'destructive' ? C.bad : '#fff', fontWeight: '600', fontSize: 15 }}>{b.text}</Text>
            </Pressable>
          ))}
          {cancel ? (
            <Pressable onPress={() => close(cancel)} accessibilityRole="button" style={({ pressed }) => ({ paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: C.input, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>{cancel.text}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
