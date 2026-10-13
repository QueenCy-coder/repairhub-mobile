// Log in (role-specific) with email + password, forgotten password, change password.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Banner, Btn, Card, Field, Input, Link, Muted, Screen, T, Title } from '../../shared/components/ui';
import { ApiError } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { passwordError } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { PasswordInput } from './fields';
import { enterApp } from './session';
import { emailError } from './signup';

export function Login() {
  const { s, set, get, run, busy } = useStore();
  const { verified } = useLocalSearchParams<{ verified?: string }>();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  const err = emailError(email);
  const go = async () => {
    setTried(true);
    if (err || !pw) return;
    const role = s.signupRole;
    // An account that hasn't confirmed its email/phone can't sign in: send them to the code screen.
    let unverified = false;
    const ok = await run(async () => {
      try {
        await backend.login({ role, email, password: pw }, set);
      } catch (e) {
        if (e instanceof ApiError && e.details && (e.details as { verificationRequired?: boolean }).verificationRequired) { unverified = true; return; }
        throw e;
      }
    });
    if (unverified) { setPw(''); router.push({ pathname: '/verify-account', params: { email: email.trim().toLowerCase() } }); return; }
    if (!ok) { setPw(''); setTried(false); return; }
    if (s.api) await backend.refresh(get, set).catch(() => {});
    const cur = get();
    // A technician or center that hasn't finished registration continues where they left off.
    enterApp(role === 'technician' ? (cur.techVerif === 'new' ? '/tech-register' : '/tech-home')
      : role === 'service_center' ? (cur.centerVerif === 'new' ? '/center-setup' : '/center-home')
      : '/home');
  };
  return (
      <Screen title="" footer={<><Btn title={busy ? 'Logging in…' : 'Log In'} disabled={busy} onPress={go} /><Muted style={{ textAlign: 'center', marginTop: 14 }}>Don’t have an account? <Link onPress={() => { set({ authMode: 'signup' }); router.replace('/signup'); }}>Create Account</Link></Muted></>}>
        <Title style={{ textAlign: 'center' }}>Welcome Back!</Title>
        <Muted style={{ textAlign: 'center', fontSize: 14, marginBottom: 14 }}>Log in to your {s.signupRole === 'customer' ? 'customer' : s.signupRole === 'technician' ? 'technician' : 'service center'} account to continue.</Muted>
        {verified === '1' ? <Banner tone="ok" icon="✓">Your account is verified. Log in to continue.</Banner> : null}
        <Field label="Email address" required error={tried && err}><Input icon="✉︎" value={email} invalid={tried && !!err} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" /></Field>
        <Field label="Password" required error={tried && !pw ? 'Enter your password' : null}><PasswordInput value={pw} onChange={setPw} invalid={tried && !pw} onSubmit={go} /></Field>
        <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: -4 }} hitSlop={8}><Link>Forgot password?</Link></Pressable>
      </Screen>
  );
}

/** Password reset. The API has no email/SMS delivery yet, so it returns the one-time code here
 *  and the app presents it — copy it into the reset step (same flow when you have the code from another device). */
export function ForgotPassword() {
  const { run, busy, set } = useStore();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [tried, setTried] = useState(false);
  const emErr = emailError(email), pwErr = passwordError(pw), pw2Err = !pw2 ? 'Re-enter your password' : pw2 !== pw ? 'Passwords don’t match' : null;
  const send = async () => {
    setTried(true);
    if (emErr) return;
    // When an email service is added the token won't come back here — the message below still makes sense.
    await run(async () => {
      const d = await backend.forgotPassword(email);
      if (d.resetToken) { setToken(d.resetToken); setStep('reset'); }
    }, 'If that email is registered, a reset code was issued');
  };
  const save = async () => {
    setTried(true);
    if (!token.trim() || pwErr || pw2Err) return;
    if (await run(() => backend.resetPassword(token.trim(), pw), 'Password reset! Log in with your new password.')) {
      set({ authMode: 'login' });
      router.replace('/login');
    }
  };
  return step === 'email' ? (
    <Screen title="Reset password" footer={<><Btn title={busy ? 'Sending…' : 'Send reset code'} disabled={busy} onPress={send} /><Btn title="Back to log in" variant="sec" onPress={() => router.back()} /></>}>
      <Muted style={{ fontSize: 14, lineHeight: 21, marginBottom: 14 }}>Enter the email on your account. We’ll give you a one-time code to set a new password (it expires after an hour).</Muted>
      <Field label="Email address" required error={tried && emErr}><Input icon="✉︎" value={email} invalid={tried && !!emErr} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" onSubmitEditing={send} /></Field>
    </Screen>
  ) : (
    <Screen title="Set a new password" footer={<><Btn title={busy ? 'Saving…' : 'Set new password'} disabled={busy} onPress={save} /><Btn title="Back to log in" variant="sec" onPress={() => router.back()} /></>}>
      <Card tone="hi" style={{ paddingVertical: 10 }}>
        <Muted style={{ fontSize: 12 }}>Your reset code (expires in 1 hour)</Muted>
        <T style={{ fontSize: 17, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>{token}</T>
      </Card>
      <Field label="Reset code" required error={tried && !token.trim() ? 'Enter the reset code' : null}><Input value={token} invalid={tried && !token.trim()} onChangeText={setToken} placeholder="Paste the code from above" autoCapitalize="none" autoCorrect={false} /></Field>
      <Field label="New password" required error={tried && pwErr}><PasswordInput value={pw} onChange={setPw} invalid={tried && !!pwErr} placeholder="At least 8 characters" newPassword /></Field>
      <Field label="Confirm new password" required error={tried && pw2Err}><PasswordInput value={pw2} onChange={setPw2} invalid={tried && !!pw2Err} placeholder="Re-enter your password" newPassword /></Field>
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
