// Log in (role-specific) with email + password, forgotten password, change password.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Btn, Card, Field, Input, Link, Muted, Screen, Title } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { passwordError } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { PasswordInput } from './fields';
import { enterApp } from './session';
import { emailError } from './signup';

export function Login() {
  const { s, set, get, run, busy } = useStore();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  const err = emailError(email);
  const go = async () => {
    setTried(true);
    if (err || !pw) return;
    const role = s.signupRole;
    const ok = await run(async () => {
      await backend.login({ role, email, password: pw }, set);
      await backend.refresh(get, set);
    });
    if (!ok) { setPw(''); setTried(false); return; }
    const cur = get();
    // A technician who hasn't finished registering continues where they left off.
    enterApp(role === 'technician' ? (cur.techVerif === 'new' ? '/tech-register' : '/tech-home') : '/home');
  };
  return (
      <Screen title="" footer={<><Btn title={busy ? 'Logging in…' : 'Log In'} disabled={busy} onPress={go} /><Muted style={{ textAlign: 'center', marginTop: 14 }}>Don’t have an account? <Link onPress={() => { set({ authMode: 'signup' }); router.replace('/signup'); }}>Create Account</Link></Muted></>}>
        <Title style={{ textAlign: 'center' }}>Welcome Back!</Title>
        <Muted style={{ textAlign: 'center', fontSize: 14, marginBottom: 14 }}>Log in to your {s.signupRole} account to continue.</Muted>
        <Field label="Email address" required error={tried && err}><Input icon="✉︎" value={email} invalid={tried && !!err} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" /></Field>
        <Field label="Password" required error={tried && !pw ? 'Enter your password' : null}><PasswordInput value={pw} onChange={setPw} invalid={tried && !pw} onSubmit={go} /></Field>
        <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: -4 }} hitSlop={8}><Link>Forgot password?</Link></Pressable>
      </Screen>
  );
}

/** The API has no self-service password reset yet, so this explains how to get back in. */
export function ForgotPassword() {
  return (
    <Screen title="Reset password" footer={<Btn title="Back to log in" onPress={() => router.back()} />}>
      <Card tone="soft">
        <Muted style={{ fontSize: 14, lineHeight: 21 }}>Password reset by email is coming soon. Until then, contact the RepairHub support team from the email address on your account and they’ll reset it for you.</Muted>
      </Card>
      <Muted style={{ marginTop: 8 }}>Remember it? Log in, then change it any time from Profile → Change password.</Muted>
    </Screen>
  );
}

/** Change password while signed in (current password + new password). */
export function NewPassword() {
  const { run, busy } = useStore();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [tried, setTried] = useState(false);
  const pwErr = passwordError(pw), pw2Err = !pw2 ? 'Re-enter your password' : pw2 !== pw ? 'Passwords don’t match' : null;
  const save = async () => {
    setTried(true);
    if (!cur || pwErr || pw2Err) return;
    if (await run(() => backend.changePassword(cur, pw), 'Password changed')) router.back();
  };
  return (
    <Screen title="Change password" footer={<Btn title={busy ? 'Saving…' : 'Save password'} disabled={busy} onPress={save} />}>
      <Field label="Current password" required error={tried && !cur ? 'Enter your current password' : null}><PasswordInput value={cur} onChange={setCur} invalid={tried && !cur} /></Field>
      <Field label="New password" required error={tried && pwErr}><PasswordInput value={pw} onChange={setPw} invalid={tried && !!pwErr} placeholder="At least 8 characters" newPassword /></Field>
      <Field label="Confirm new password" required error={tried && pw2Err}><PasswordInput value={pw2} onChange={setPw2} invalid={tried && !!pw2Err} placeholder="Re-enter your password" newPassword /></Field>
    </Screen>
  );
}

/** Signs out on this device and returns to the Welcome screen. */
export function useLogout() {
  const { set } = useStore();
  return () => {
    backend.logout(set);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };
}
