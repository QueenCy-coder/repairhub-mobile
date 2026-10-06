import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CAT_GLYPH, CAT_IMG, devicePhoto, fmtCountdown, Media, PHOTOS } from '../core/data';

/** Design tokens taken from the Group 9 Figma file (Repair Hub hi-fi). */
export const C = {
  primary: '#3563E9', brand: '#1570EF', primarySoft: '#EEF4FF', primaryLine: '#C7D7FE',
  ink: '#101828', text: '#344054', mute: '#667085', faint: '#98A2B3',
  line: '#EAECF0', input: '#D0D5DD', soft: '#F9FAFB', paper: '#FFFFFF', navy: '#0B1A33',
  ok: '#12B76A', okBg: '#ECFDF3', okInk: '#027A48', warn: '#B54708', warnBg: '#FEF6E4', bad: '#D92D20', badBg: '#FEF3F2',
  star: '#F79009', hi: '#FFFAEB',
};
export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const shadow = Platform.select({ ios: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, default: { elevation: 1 } });

/**
 * Figma page shell: optional header (← + left-aligned title), scrollable body, optional pinned footer CTA.
 * `title === undefined` renders no header (tab roots draw their own greeting) but still respects the safe area.
 */
/* ───────── Motion ───────── */
const ND = Platform.OS !== 'web'; // native driver where available
/** Spring scale on press, shared by buttons and tappable cards. */
export function usePressScale(to = 0.97) {
  const v = React.useRef(new Animated.Value(1)).current;
  const spring = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: ND, speed: 40, bounciness: 6 }).start();
  return { style: { transform: [{ scale: v }] }, onPressIn: () => spring(to), onPressOut: () => spring(1) };
}
/** Fade + rise on mount. Use `delay` to stagger lists. */
export function FadeIn({ children, delay = 0, y = 10, style }: { children: React.ReactNode; delay?: number; y?: number; style?: ViewStyle }) {
  const a = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>{children}</Animated.View>;
}
/** Soft looping pulse (current step indicators). */
export function Pulse({ size, color }: { size: number; color: string }) {
  const a = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: ND })); l.start(); return () => l.stop(); }, [a]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }] }} />;
}

export function Screen({ children, pad = true, bg = C.paper, title, back = true, right, footer, onBack }: {
  children: React.ReactNode; pad?: boolean; bg?: string; title?: string; back?: boolean; right?: React.ReactNode; footer?: React.ReactNode; onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + (title !== undefined ? 4 : 0), backgroundColor: bg }}>
        {title !== undefined ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            {back ? <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back"><Text style={{ fontSize: 24, color: C.ink, marginTop: -3 }}>←</Text></Pressable> : null}
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: C.ink }} numberOfLines={1} accessibilityRole="header">{title}</Text>
            {right}
          </View>
        ) : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={pad ? { padding: 16, paddingBottom: 40 } : undefined} keyboardShouldPersistTaps="handled"><FadeIn y={12}>{children}</FadeIn></ScrollView>
      {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, backgroundColor: C.paper }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Base text. Line height follows the font size (×1.35) unless set explicitly, so enlarged text never overlaps. */
export const T = ({ children, style, ...p }: React.ComponentProps<typeof Text>) => {
  const f = StyleSheet.flatten(style) as TextStyle | undefined;
  const size = f?.fontSize ?? 15;
  const lh = f?.lineHeight && f.lineHeight >= size ? f.lineHeight : Math.round(size * 1.35);
  return <Text style={[{ color: C.ink, fontSize: 15 }, style, { lineHeight: lh }]} {...p}>{children}</Text>;
};
export const Muted = ({ children, style }: { children: React.ReactNode; style?: any }) => <T style={[{ color: C.mute, fontSize: 13, lineHeight: 18 }, style]}>{children}</T>;
export const Title = ({ children, style }: { children: React.ReactNode; style?: any }) => <T style={[{ fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: 4 }, style]}>{children}</T>;
export const H4 = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}><T style={{ fontSize: 16, fontWeight: '700' }}>{children}</T>{right}</View>
);
export const Bold = ({ children, style }: { children: React.ReactNode; style?: any }) => <T style={[{ fontWeight: '700' }, style]}>{children}</T>;
export const Link = ({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) => <Text onPress={onPress} style={[{ color: C.primary, fontWeight: '600', fontSize: 14 }, style]}>{children}</Text>;

export function Card({ children, tone, onPress, style }: { children: React.ReactNode; tone?: 'soft' | 'blue' | 'hi' | 'dash' | 'strong' | 'selected'; onPress?: () => void; style?: ViewStyle }) {
  const st = [s.card, tone === 'soft' && { backgroundColor: C.soft }, tone === 'blue' && { backgroundColor: C.primarySoft, borderColor: C.primarySoft },
    tone === 'selected' && { backgroundColor: C.primarySoft, borderColor: C.primary }, tone === 'hi' && { backgroundColor: C.hi, borderColor: '#FEDF89' },
    tone === 'dash' && { borderStyle: 'dashed' as const, borderColor: C.input }, tone === 'strong' && { borderColor: C.primary, borderWidth: 1.5 }, style];
  const ps = usePressScale(0.98);
  if (!onPress) return <View style={st}>{children}</View>;
  // Outer layout (width/flex/margins) belongs on the animated wrapper, visual styling on the card itself.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const { width, flex, margin, marginTop, marginBottom, marginHorizontal, marginVertical, alignSelf, ...inner } = flat;
  const outer = { width, flex, margin, marginTop, marginHorizontal, marginVertical, alignSelf, marginBottom: marginBottom ?? 12 };
  return (
    <Animated.View style={[outer, ps.style]}>
      <Pressable onPress={onPress} onPressIn={ps.onPressIn} onPressOut={ps.onPressOut} style={[...st.slice(0, -1), inner, { marginBottom: 0 }]} accessibilityRole="button">{children}</Pressable>
    </Animated.View>
  );
}

export function Btn({ title, onPress, variant = 'pri', disabled, style, small, icon }: { title: string; onPress?: () => void; variant?: 'pri' | 'sec' | 'danger' | 'ghost'; disabled?: boolean; style?: ViewStyle; small?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  const bg = variant === 'pri' ? C.primary : variant === 'danger' ? C.paper : C.paper;
  const fg = variant === 'pri' ? '#fff' : variant === 'danger' ? C.bad : variant === 'ghost' ? C.text : C.primary;
  const bd = variant === 'pri' ? C.primary : variant === 'danger' ? '#FDA29B' : variant === 'ghost' ? C.input : C.primary;
  const ps = usePressScale(0.96);
  return (
    <Animated.View style={[ps.style, style?.flex ? { flex: style.flex } : null]}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={ps.onPressIn} onPressOut={ps.onPressOut}
        style={({ pressed }) => [s.btn, small && { paddingVertical: 8, marginTop: 8 }, { backgroundColor: bg, borderColor: bd }, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.9 }, style]}>
        {icon ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={icon} size={small ? 14 : 17} color={fg} /><Text style={{ color: fg, fontWeight: '600', fontSize: small ? 13 : 15 }}>{title}</Text></View>
          : <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 13 : 15 }}>{title}</Text>}
      </Pressable>
    </Animated.View>
  );
}
export const Btns = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', gap: 10 }}>{React.Children.map(children, c => c ? <View style={{ flex: 1 }}>{c}</View> : null)}</View>;

type Tone = 'on' | 'off' | 'ok' | 'warn' | 'bad' | 'blue';
const TONES: Record<Tone, [string, string, string]> = { on: [C.primary, '#fff', C.primary], off: [C.paper, C.faint, C.input], ok: [C.okBg, C.okInk, C.okBg], warn: [C.warnBg, C.warn, C.warnBg], bad: [C.badBg, C.bad, C.badBg], blue: [C.primarySoft, C.primary, C.primarySoft] };
export function Chip({ label, tone, onPress }: { label: string; tone?: Tone; onPress?: () => void }) {
  const [bg, fg, bd] = tone ? TONES[tone] : [C.paper, C.text, C.input];
  const inner = <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>;
  const st = [s.chip, { backgroundColor: bg, borderColor: bd }, tone === 'off' && { borderStyle: 'dashed' as const }];
  return onPress ? <Pressable onPress={onPress} style={st} accessibilityRole="button">{inner}</Pressable> : <View style={st}>{inner}</View>;
}
export const Chips = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>{children}</View>;

/** Figma segmented tabs (Available (12) | Active (2) | Completed (56)) with a sliding highlight. */
export function Segments<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.findIndex(([k]) => k === value));
  const x = React.useRef(new Animated.Value(idx)).current;
  useEffect(() => { Animated.spring(x, { toValue: idx, useNativeDriver: ND, speed: 18, bounciness: 6 }).start(); }, [idx, x]);
  const seg = w / items.length;
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', marginBottom: 12, backgroundColor: '#F2F4F7', borderRadius: 10, padding: 3 }}>
      {w ? <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 3, bottom: 3, left: 3, width: seg - 2, borderRadius: 8, backgroundColor: C.primary, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg - 2] }) }] }} /> : null}
      {items.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }} style={{ flex: 1, paddingVertical: 9, alignItems: 'center' }}>
          <Text style={{ color: value === k ? '#fff' : C.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <View style={s.kv}><Muted style={{ fontSize: 14 }}>{k}</Muted>{typeof v === 'string' || typeof v === 'number' ? <T style={{ textAlign: 'right', flexShrink: 1, fontSize: 14, fontWeight: '600' }}>{v}</T> : v}</View>
);
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, style]}>{children}</View>;

export function Opt({ label, sub, on, onPress, disabled, check, right, icon }: { label: string; sub?: string; on: boolean; onPress?: () => void; disabled?: boolean; check?: boolean; right?: React.ReactNode; icon?: string }) {
  return (
    <Pressable accessibilityRole={check ? 'checkbox' : 'radio'} accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={onPress}
      style={[s.opt, on && { backgroundColor: C.primarySoft, borderColor: C.primary }, disabled && { opacity: 0.45, borderStyle: 'dashed' }]}>
      <View style={[check ? s.box : s.dot, on && (check ? { backgroundColor: C.primary, borderColor: C.primary } : { borderWidth: 6, borderColor: C.primary })]}>{check && on ? <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text> : null}</View>
      {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : null}
      <View style={{ flex: 1 }}><T style={{ fontSize: 14, fontWeight: '600' }}>{label}</T>{sub ? <Muted style={{ fontSize: 12 }}>{sub}</Muted> : null}</View>
      {right}
    </Pressable>
  );
}

/** Form field with label, required marker and an inline error message (shown in red under the control). */
export function Field({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string | false | null }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <T style={s.label}>{label}{required ? <Text style={{ color: C.bad }}> *</Text> : null}</T>
      {children}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: C.bad, fontSize: 13, marginTop: 6 }}>⚠︎ {error}</Text> : null}
    </View>
  );
}
export function Input({ icon, invalid, ...p }: TextInputProps & { icon?: string; invalid?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.inputWrap, p.multiline && { alignItems: 'flex-start' }, p.editable === false && { backgroundColor: C.soft }, invalid && { borderColor: C.bad, borderWidth: 1.5 }, focused && { borderColor: C.primary, borderWidth: 1.5 }]}>
      {icon ? <Text style={{ fontSize: 16, color: C.mute, marginRight: 8, marginTop: p.multiline ? 2 : 0 }}>{icon}</Text> : null}
      <TextInput placeholderTextColor={C.faint} {...p}
        onFocus={e => { setFocused(true); p.onFocus?.(e); }} onBlur={e => { setFocused(false); p.onBlur?.(e); }}
        // The focus ring lives on the wrapper; suppress the browser's own outline on web.
        style={[{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), p.multiline && { minHeight: 84, textAlignVertical: 'top' }, p.style]} />
    </View>
  );
}

export const Ph = ({ label, h = 80, style, icon }: { label: string; h?: number; style?: ViewStyle; icon?: string }) => (
  <View style={[s.ph, { height: h }, style]}>{icon ? <Text style={{ fontSize: 22, marginBottom: 2 }}>{icon}</Text> : null}<Muted style={{ textAlign: 'center', fontSize: 12 }}>{label}</Muted></View>
);

export function Banner({ tone, children, icon }: { tone: 'ok' | 'warn' | 'bad' | 'blue'; children: React.ReactNode; icon?: string }) {
  const [bg, fg] = TONES[tone];
  return <View style={[s.banner, { backgroundColor: bg }]}>{icon ? <Text style={{ fontSize: 16, color: fg }}>{icon}</Text> : null}<View style={{ flex: 1 }}>{typeof children === 'string' ? <T style={{ fontSize: 14, color: C.text }}>{children}</T> : children}</View></View>;
}

/** Vertical tracker (Figma "Track repair"). */
export function Timeline({ items }: { items: { label: string; sub?: string; state: 'done' | 'now' | 'todo' }[] }) {
  return <View style={{ marginVertical: 8 }}>{items.map((it, i) => (
    <View key={i} style={{ flexDirection: 'row', gap: 14, minHeight: 50 }}>
      <View style={{ alignItems: 'center' }}>
        {it.state === 'now' ? <View style={{ position: 'absolute', top: 0, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}><Pulse size={22} color={C.primary} /></View> : null}
        <View style={[s.tlDot, it.state === 'done' && { backgroundColor: C.ok, borderColor: C.ok }, it.state === 'now' && { borderColor: C.primary, backgroundColor: C.primary }]}>
          {it.state === 'done' ? <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text> : it.state === 'now' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
        </View>
        {i < items.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: it.state === 'done' ? C.ok : C.line }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 12 }}><T style={{ fontSize: 15, fontWeight: it.state === 'todo' ? '400' : '600', color: it.state === 'todo' ? C.mute : C.ink }}>{it.label}</T>{it.sub ? <Muted style={{ fontSize: 12 }}>{it.sub}</Muted> : null}</View>
    </View>
  ))}</View>;
}

/** Horizontal progress bar (Figma component "Progress bar"), any number of steps. `current` = index of the active step. */
export function Stepper({ steps, current, note }: { steps: string[]; current: number; note?: string }) {
  return (
    <View style={{ marginVertical: 10 }} accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current] ?? ''}${note ? `, ${note}` : ''}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            {i === current ? <View style={{ width: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0 }}><View style={{ position: 'absolute', left: 0 }}><Pulse size={18} color={C.primary} /></View></View> : null}
            <View style={[s.stepDot, i < current && { backgroundColor: C.primary, borderColor: C.primary }, i === current && { borderColor: C.primary, borderWidth: 5 }]}>
              {i < current ? <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text> : null}
            </View>
            {i < steps.length - 1 ? <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < current ? C.primary : C.line }} /> : null}
          </React.Fragment>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {steps.map((l, i) => (
          <Text key={l} style={{ flex: 1, fontSize: 11, textAlign: i === 0 ? 'left' : i === steps.length - 1 ? 'right' : 'center', color: i === current ? C.primary : i < current ? C.ink : C.faint, fontWeight: i === current ? '700' : '500' }}>{l}</Text>
        ))}
      </View>
      {note ? <View style={{ alignSelf: 'center', marginTop: 6, backgroundColor: C.warnBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ color: C.warn, fontSize: 12, fontWeight: '600' }}>⏸ {note}</Text></View> : null}
    </View>
  );
}

export function Countdown({ until, style }: { until: number; style?: any }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  return <Text style={[{ fontFamily: mono, color: C.ink }, style]}>{fmtCountdown(until - now)}</Text>;
}

/** Dashed purple-blue box: demo-only controls (switch roles, simulate the other party). Not product UI. */
const HIDE_DEMO = true;
export function Demo({ text, actions }: { text: string; actions: { label: string; onPress: () => void }[] }) {
  // Presentation build: demo shortcuts are hidden; the flows they stood in for run on their own.
  if (HIDE_DEMO) return null;
  return (
    <View style={s.demo}>
      <Text style={{ color: '#6941C6', fontSize: 12, fontWeight: '600' }}>▶ DEMO · {text}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {actions.map(a => <Pressable key={a.label} onPress={a.onPress} style={s.demoBtn} accessibilityRole="button"><Text style={{ color: '#6941C6', fontSize: 12, fontWeight: '700' }}>{a.label}</Text></Pressable>)}
      </View>
    </View>
  );
}

export function Empty({ title, sub, action, onPress }: { title: string; sub: string; action?: string; onPress?: () => void }) {
  return <View style={{ alignItems: 'center', paddingVertical: 48 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28 }}>🛠️</Text></View><Title style={{ marginTop: 12, textAlign: 'center', fontSize: 18 }}>{title}</Title><Muted style={{ textAlign: 'center', marginBottom: 12 }}>{sub}</Muted>{action ? <Btn title={action} variant="sec" onPress={onPress} style={{ alignSelf: 'stretch' }} /> : null}</View>;
}

/** Big green check (Booking confirmed / Repair completed / Review submitted): springs in with a soft halo. */
export function SuccessMark({ size = 72 }: { size?: number }) {
  const pop = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: ND, speed: 10, bounciness: 14 }).start(); }, [pop]);
  return (
    <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <Pulse size={size + 16} color="#3DA35D" />
      <Animated.View style={{ transform: [{ scale: pop }], opacity: pop }}>
        <View style={{ width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, backgroundColor: C.okBg, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3DA35D', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: size / 2, fontWeight: '800' }}>✓</Text></View>
        </View>
      </Animated.View>
    </View>
  );
}

export function Stars({ value, onChange, size = 36 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return <View style={{ flexDirection: 'row', justifyContent: onChange ? 'center' : 'flex-start', gap: onChange ? 6 : 1 }}>{[1, 2, 3, 4, 5].map(i => (
    <Pressable key={i} disabled={!onChange} onPress={() => onChange?.(i)} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`} hitSlop={6}><Text style={{ fontSize: size, color: i <= value ? C.star : '#E4E7EC' }}>★</Text></Pressable>
  ))}</View>;
}
export const Rating = ({ r, extra }: { r: number; extra?: string }) => <Text style={{ fontSize: 12, color: C.mute }}><Text style={{ color: C.star }}>★ </Text><Text style={{ color: C.ink, fontWeight: '600' }}>{r ? r.toFixed(1) : 'New'}</Text>{extra ? ` ${extra}` : ''}</Text>;

/** A single picked photo/video at a fixed size (review summaries, before/after). */
export const Thumb = ({ m, size = 64, h, fill }: { m: Media; size?: number; h?: number; fill?: boolean }) => (
  <View style={{ width: fill ? '100%' : size, height: h ?? size, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F2F4F7' }}>
    <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
    {m.type === 'video' ? <View style={s.vid}><Text style={{ color: '#fff', fontSize: 10 }}>▶ video</Text></View> : null}
  </View>
);

/**
 * Thumbnails for picked photos/videos plus the Figma "+" add tile.
 * Pass `onRemove` to show a visible × delete button on each thumbnail; omit it for read-only galleries.
 */
export function MediaGrid({ items, max, onAdd, onRemove, addLabel = '+', invalid, camera }: { items: Media[]; max: number; onAdd?: () => void; onRemove?: (i: number) => void; addLabel?: string; invalid?: boolean; camera?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((m, i) => (
        <View key={m.uri + i} style={s.thumb}>
          <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`${m.type === 'video' ? 'Video' : 'Photo'} ${i + 1}`} />
          {m.type === 'video' ? <View style={s.vid}><Text style={{ color: '#fff', fontSize: 11 }}>▶ video</Text></View> : null}
          {onRemove ? (
            <Pressable onPress={() => onRemove(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${m.type === 'video' ? 'video' : 'photo'} ${i + 1}`} style={s.remove}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 15 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {onAdd && items.length < max ? (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add photo or video"
          style={[s.thumb, s.addTile, camera && { backgroundColor: '#fff', borderStyle: 'dashed', borderColor: C.primaryLine, borderWidth: 1.5 }, invalid && { borderColor: C.bad, borderWidth: 1.5, backgroundColor: C.badBg }]}>
          {camera ? <><Text style={{ fontSize: 22 }}>📷</Text><Text style={{ color: C.primary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>Add photo</Text></>
            : <Text style={{ fontSize: addLabel === '+' ? 26 : 12, color: C.mute, textAlign: 'center' }}>{addLabel}</Text>}
        </Pressable>) : null}
    </View>
  );
}

/** First + last initial ("Tunde Adewale Balogun" → "TB"); skips a middle name. */
export const initials = (name: string) => { const w = name.trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
export function Avatar({ label, size = 48, verified, uri }: { label: string; size?: number; verified?: boolean; uri?: string | null }) {
  const photo = uri ? { uri } : PHOTOS[label];
  return (
    <View style={{ width: size, height: size }}>
      {photo ? <Image source={photo} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} accessibilityLabel={label} />
        : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#D1E0FF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontWeight: '700', fontSize: size / 2.7, color: C.primary }}>{initials(label)}</Text></View>}
      {verified ? <View style={{ position: 'absolute', right: -2, bottom: -2, width: size / 3, height: size / 3, borderRadius: size / 6, backgroundColor: C.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: size / 6, fontWeight: '800' }}>✓</Text></View> : null}
    </View>
  );
}

/** Rounded icon tile (Figma category/overview tiles). */
export const IconTile = ({ glyph, bg = C.primarySoft, size = 44 }: { glyph: string; bg?: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: size / 2 }}>{glyph}</Text></View>
);

/** Category tile: custom artwork when we have it (tablet, TV, fridge), emoji otherwise. */
export const CatTile = ({ cat, size = 44, bg = C.primarySoft, model }: { cat: string; size?: number; bg?: string; model?: string }) => {
  const photo = devicePhoto(cat, model);
  if (photo) return <Image source={photo} style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.soft }} contentFit="cover" transition={150} />;
  return <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    {CAT_IMG[cat] ? <Image source={CAT_IMG[cat]} style={{ width: size * 0.62, height: size * 0.62 }} contentFit="contain" /> : <Text style={{ fontSize: size / 2 }}>{CAT_GLYPH[cat] ?? '🔧'}</Text>}
  </View>;
};

/** Number that counts up/down to its new value (money, counters). */
export function AnimatedNumber({ value, format, style }: { value: number; format: (n: number) => string; style?: any }) {
  const [shown, setShown] = useState(value);
  const from = React.useRef(value);
  useEffect(() => {
    const start = from.current, delta = value - start, t0 = Date.now(), D = 700;
    if (!delta) return;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / D), e = 1 - Math.pow(1 - p, 3);
      setShown(start + delta * e);
      if (p >= 1) { clearInterval(id); from.current = value; }
    }, 16);
    return () => { clearInterval(id); from.current = value; };
  }, [value]);
  return <Text style={style}>{format(shown)}</Text>;
}

export const Bar = ({ pct }: { pct: number }) => <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.primary }} /></View>;

/** Bar chart scaled to its own maximum, so any values (percentages or naira) fit the given height. */
export function Bars({ values, highlight, height = 110, light = '#B2CCFF', labels, barMax = 28 }: { values: number[]; highlight?: number; height?: number; light?: string; labels?: string[]; barMax?: number }) {
  const max = Math.max(...values, 1);
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: '55%', maxWidth: barMax, height: v > 0 ? `${Math.max(4, (v / max) * 100)}%` : 3, backgroundColor: v <= 0 ? C.line : highlight === undefined || highlight === i ? C.primary : light, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
        </View>
      ))}
    </View>
    {labels ? <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>{labels.map((l, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.mute }}>{l}</Text>)}</View> : null}
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: C.paper, ...shadow },
  btn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center', marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 11 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 13, marginBottom: 8, backgroundColor: C.paper },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.input },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.input, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.input, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: C.paper },
  ph: { borderRadius: 10, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center', padding: 6 },
  banner: { flexDirection: 'row', gap: 10, borderRadius: 10, padding: 12, marginBottom: 12 },
  tlDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.input, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  demo: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B692F6', backgroundColor: '#F9F5FF', borderRadius: 10, padding: 10, marginVertical: 12 },
  demoBtn: { borderWidth: 1, borderColor: '#B692F6', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#fff' },
  thumb: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden' },
  addTile: { backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  remove: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(16,24,40,.72)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  vid: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,.6)', padding: 2, alignItems: 'center' },
});

/**
 * Quick-pick chips plus "Other", which lets people type their own value
 * (e.g. a date further out, or "After 5:00 PM").
 */
export function ChoiceOrType({ options, value, onChange, placeholder, hint, invalid }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string; hint?: string; invalid?: boolean }) {
  const custom = !!value && !options.includes(value);
  const [typing, setTyping] = React.useState(custom);
  const [text, setText] = React.useState(custom ? value : '');
  return (
    <View>
      <Chips>
        {options.map(o => <Chip key={o} label={o} tone={!typing && value === o ? 'on' : undefined} onPress={() => { setTyping(false); onChange(o); }} />)}
        <Chip label={typing ? '✎ Your own' : '✎ Other…'} tone={typing ? 'on' : undefined} onPress={() => { setTyping(true); onChange(text.trim()); }} />
      </Chips>
      {typing ? <View style={{ marginTop: 8 }}>
        <Input value={text} invalid={invalid} autoFocus onChangeText={t => { setText(t); onChange(t.trim()); }} placeholder={placeholder} />
        {hint ? <Muted style={{ fontSize: 12, marginTop: 4 }}>{hint}</Muted> : null}
      </View> : null}
    </View>
  );
}

/** Quick-pick numbers ("1 day", "2 days" …) plus "Other", which lets people type their own number. */
export function NumberChoice({ options, value, onChange, unit, max = 365, invalid }: { options: number[]; value: number | null; onChange: (n: number | null) => void; unit: string; max?: number; invalid?: boolean }) {
  const [typing, setTyping] = React.useState(value !== null && !options.includes(value));
  const [text, setText] = React.useState(value !== null && !options.includes(value) ? String(value) : '');
  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return (
    <View>
      <Chips>
        {options.map(o => <Chip key={o} label={plural(o)} tone={!typing && value === o ? 'on' : undefined} onPress={() => { setTyping(false); onChange(o); }} />)}
        <Chip label={typing ? '✎ Your own' : '✎ Other…'} tone={typing ? 'on' : undefined} onPress={() => { setTyping(true); onChange(text ? Number(text) : null); }} />
      </Chips>
      {typing ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <View style={{ width: 110 }}><Input value={text} invalid={invalid} autoFocus keyboardType="number-pad" placeholder="e.g. 10" accessibilityLabel={`Number of ${unit}s`}
          onChangeText={t => { const d = t.replace(/\D/g, '').replace(/^0+/, '').slice(0, 3); const n = d ? Math.min(Number(d), max) : null; setText(n ? String(n) : ''); onChange(n); }} /></View>
        <Muted>{text ? plural(Number(text)) : `${unit}s`}</Muted>
      </View> : null}
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
/** Rounded tinted tile with a line icon (dashboard stats, action rows). */
export const IconBox = ({ name, color = C.primary, bg = C.primarySoft, size = 44 }: { name: IconName; color?: string; bg?: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={size * 0.48} color={color} />
  </View>
);
/** Small icon + text tag ("Home service", "Today, 10:00 AM"). */
export const InfoTag = ({ icon, label, tone = 'plain' }: { icon: IconName; label: string; tone?: 'plain' | 'blue' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: tone === 'blue' ? 8 : 0, paddingVertical: tone === 'blue' ? 4 : 0, borderRadius: 8, backgroundColor: tone === 'blue' ? C.primarySoft : 'transparent' }}>
    <Ionicons name={icon} size={13} color={tone === 'blue' ? C.primary : C.mute} />
    <Text style={{ fontSize: 12, color: tone === 'blue' ? C.primary : C.text, fontWeight: tone === 'blue' ? '600' : '400' }} numberOfLines={1}>{label}</Text>
  </View>
);
/** Status pill with a coloured dot. */
export const StatusPill = ({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'blue' | 'bad' | 'off' }) => {
  const c = { ok: [C.okInk, C.okBg], warn: [C.warn, C.warnBg], blue: [C.primary, C.primarySoft], bad: [C.bad, C.badBg], off: [C.mute, C.soft] }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: c[1], alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c[0] }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: c[0] }}>{label}</Text>
    </View>
  );
};
/** Three-dot progress: ✓ Accepted ─ ● In progress ─ ○ Completed, with the bar filling as the job moves. */
export function MiniSteps({ steps, current }: { steps: string[]; current: number }) {
  const fill = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => { Animated.timing(fill, { toValue: current, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [current, fill]);
  return (
    <View style={{ marginVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: i < current ? C.primary : '#fff', borderWidth: 2, borderColor: i <= current ? C.primary : C.input }}>
              {i < current ? <Ionicons name="checkmark" size={14} color="#fff" /> : i === current ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /> : null}
            </View>
            {i < steps.length - 1 ? (
              <View style={{ flex: 1, height: 3, backgroundColor: C.line, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }}>
                <Animated.View style={{ height: 3, backgroundColor: C.primary, width: fill.interpolate({ inputRange: [i, i + 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {steps.map((l, i) => <Text key={l} style={{ flex: 1, fontSize: 11, fontWeight: i === current ? '700' : '500', color: i < current ? C.primary : i === current ? C.ink : C.mute, textAlign: i === 0 ? 'left' : i === steps.length - 1 ? 'right' : 'center' }}>{l}</Text>)}
      </View>
    </View>
  );
}
