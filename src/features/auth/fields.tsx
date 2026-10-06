// Form fields shared by sign-up, login and registration: names, phone, password.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Field, Input, Muted, C, T } from '../../shared/components/ui';

/** First, optional middle, and last name. Letters, spaces, hyphens and apostrophes only (e.g. Adé-Ọlá, O’Brien). */
export const NAME_RE = /^[\p{L}][\p{L}'’\- ]*$/u;

export const nameError = (v: string, which: string) => !v.trim() ? `Enter your ${which} name` : !NAME_RE.test(v.trim()) ? 'Letters only' : null;

export type Name = { first: string; middle: string; last: string };

export const nameErrors = (n: Name) => nameError(n.first, 'first') || nameError(n.last, 'last') || (n.middle.trim() && !NAME_RE.test(n.middle.trim()) ? 'Letters only' : null);

export function NameFields({ value, onChange, showErrors, hint }: { value: Name; onChange: (n: Name) => void; showErrors: boolean; hint?: string }) {
  const fe = showErrors && nameError(value.first, 'first'), le = showErrors && nameError(value.last, 'last');
  const me = showErrors && !!value.middle.trim() && !NAME_RE.test(value.middle.trim()) && 'Letters only';
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="First name" required error={fe}><Input value={value.first} onChangeText={t => onChange({ ...value, first: t })} invalid={!!fe} placeholder="e.g. Tunde" textContentType="givenName" autoComplete="given-name" autoCapitalize="words" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Last name" required error={le}><Input value={value.last} onChangeText={t => onChange({ ...value, last: t })} invalid={!!le} placeholder="e.g. Balogun" textContentType="familyName" autoComplete="family-name" autoCapitalize="words" /></Field></View>
      </View>
      <Field label="Middle name (optional)" error={me}><Input value={value.middle} onChangeText={t => onChange({ ...value, middle: t })} invalid={!!me} placeholder="e.g. Adewale" textContentType="middleName" autoComplete="additional-name" autoCapitalize="words" /></Field>
      {hint ? <Muted style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>{hint}</Muted> : null}
    </View>
  );
}

/** "Tunde Adewale Balogun" → first / middle / last (single-word surnames; the middle is everything between). */
export const splitName = (full: string): Name => { const w = full.trim().split(/\s+/).filter(Boolean); return { first: w[0] ?? '', middle: w.length > 2 ? w.slice(1, -1).join(' ') : '', last: w.length > 1 ? w[w.length - 1] : '' }; };

export const joinName = (n: Name) => [n.first, n.middle, n.last].map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ');

/** Password input with a show / hide eye. */
export function PasswordInput({ value, onChange, invalid, placeholder = 'Enter your password', newPassword, onSubmit }: { value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string; newPassword?: boolean; onSubmit?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Input icon="🔒" value={value} invalid={invalid} onChangeText={onChange} placeholder={placeholder} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
        textContentType={newPassword ? 'newPassword' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} style={{ paddingRight: 44 }}
        onSubmitEditing={onSubmit} returnKeyType={onSubmit ? 'go' : undefined} />
      <Pressable onPress={() => setShow(v => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.mute} />
      </Pressable>
    </View>
  );
}

/** Nigerian mobile number: 10 digits after +234 (a leading 0 is allowed and dropped). */
export const cleanPhone = (p: string) => { const d = p.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d; };

export const phoneError = (p: string) => { const d = p.replace(/\D/g, '').replace(/^234/, '').replace(/^0/, ''); return !d ? 'Enter your phone number' : d.length !== 10 || !/^[789]/.test(d) ? 'Enter a valid Nigerian mobile number, e.g. 803 412 7765' : null; };

export function PhoneInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ borderWidth: 1, borderColor: C.input, borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' }}><T style={{ fontSize: 14 }}>🇳🇬 +234</T></View>
      <View style={{ flex: 1 }}><Input value={value} invalid={invalid} onChangeText={t => onChange(t.replace(/[^\d ]/g, '').slice(0, 14))} placeholder="803 412 7765" keyboardType="phone-pad" textContentType="telephoneNumber" accessibilityLabel="Phone number" /></View>
    </View>
  );
}

/* Log in (Figma: Welcome Back!) — phone + password, or Google / Apple */
