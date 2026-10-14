// Log in (role-specific) with email + password, forgotten password, change password.
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { Banner, Btn, Card, Field, Input, Link, Muted, Row, Screen, T, Title } from '../../shared/components/ui';
import { ApiError } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { passwordError } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { PasswordInput } from './fields';
import { biometricKind, confirmBiometric, forgetLogin, pushCode, saveLogin, savedLogin } from '../../shared/core/native';
import { enterApp } from './session';
import { emailError } from './signup';

export function Login() {
  const { s, set, get, run, busy } = useStore();
  const { verified } = useLocalSearchParams<{ verified?: string }>();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  /** Why the last attempt failed (wrong email or password, wrong account type, no connection); stays until a field is edited. */
  const [authErr, setAuthErr] = useState<string | null>(null);
  /** Face ID / fingerprint log-in: offered when this phone has it and the person turned it on after an earlier log-in. */
  const [bio, setBio] = useState<{ kind: string; email: string } | null>(null);
  const role = s.signupRole;
  React.useEffect(() => {
    let alive = true;
    (async () => { const [kind, saved] = await Promise.all([biometricKind(), savedLogin(role)]); if (alive && kind && saved) setBio({ kind, email: saved.email }); })();
    return () => { alive = false; };
  }, [role]);
  const err = emailError(email);

  /** Signs in with the given details and opens the right screen. Returns false when it failed (the message is shown on the form). */
  const signIn = async (em: string, password: string, fromBiometric = false) => {
    setAuthErr(null);
    // An account that hasn't confirmed its email/phone can't sign in: send them to the code screen.
    let unverified = false, failMsg: string | null = null, rejected = false;
    const ok = await run(async () => {
      try {
        await backend.login({ role, email: em, password }, set);
      } catch (e) {
        if (e instanceof ApiError && e.details && (e.details as { verificationRequired?: boolean }).verificationRequired) { unverified = true; return; }
        rejected = e instanceof ApiError && e.status === 401;
        failMsg = e instanceof Error ? e.message : null;
        throw e;
      }
    });
    if (unverified) { setPw(''); router.push({ pathname: '/verify-account', params: { email: em.trim().toLowerCase() } }); return false; }
    if (!ok) {
      // A saved login that the server no longer accepts (password changed elsewhere) is dropped, so it can't keep failing.
      if (fromBiometric && rejected) { await forgetLogin(role); setBio(null); failMsg = 'Your saved login is out of date. Enter your email and password.'; }
      setAuthErr(failMsg ?? 'We couldn’t log you in. Check your details and try again.'); setPw(''); setTried(false);
      return false;
    }
    // Load the person's profile before choosing the screen (a returning technician or centre must not be sent back to registration).
    if (get().api) await backend.refresh(get, set).catch(() => {});
    // First time on this phone: offer Face ID / fingerprint log-in next time.
    if (!fromBiometric) await offerBiometric(role, em.trim().toLowerCase(), password);
    const cur = get();
    // A technician or center that hasn't finished registration continues where they left off.
    enterApp(role === 'technician' ? (cur.techVerif === 'new' ? '/tech-register' : '/tech-home')
      : role === 'service_center' ? (cur.centerVerif === 'new' ? '/center-setup' : '/center-home')
      : '/home');
    return true;
  };
  const go = async () => {
    setTried(true);
    setAuthErr(null);
    if (err || !pw) return;
    await signIn(email, pw);
  };
  const goBiometric = async () => {
    if (!bio) return;
    setAuthErr(null);
    if (!(await confirmBiometric(`Log in to RepairHub with ${bio.kind}`))) { setAuthErr(`${bio.kind} didn’t match. Try again or use your password.`); return; }
    const saved = await savedLogin(role);
    if (!saved) { setBio(null); setAuthErr('Your saved login is no longer on this phone. Enter your email and password.'); return; }
    await signIn(saved.email, saved.password, true);
  };
  return (
      <Screen title="" footer={<><Btn title={busy ? 'Logging in…' : 'Log In'} disabled={busy} onPress={go} />{bio ? <Btn title={`Log in with ${bio.kind}`} variant="sec" disabled={busy} onPress={goBiometric} /> : null}<Muted style={{ textAlign: 'center', marginTop: 14 }}>Don’t have an account? <Link onPress={() => { set({ authMode: 'signup' }); router.replace('/signup'); }}>Create Account</Link></Muted></>}>
        <Title style={{ textAlign: 'center' }}>Welcome Back!</Title>
        <Muted style={{ textAlign: 'center', fontSize: 14, marginBottom: 14 }}>Log in to your {s.signupRole === 'customer' ? 'customer' : s.signupRole === 'technician' ? 'technician' : 'service center'} account to continue.</Muted>
        {verified === '1' && !authErr ? <Banner tone="ok" icon="✓">Your account is verified. Log in to continue.</Banner> : null}
        {authErr ? <Banner tone="bad" icon="!">{authErr}</Banner> : null}
        {bio ? <Banner tone="blue" icon="ℹ︎">{`Saved login for ${bio.email}. Tap “Log in with ${bio.kind}” below.`}</Banner> : null}
        <Field label="Email address" required error={tried && err}><Input icon="✉︎" value={email} invalid={(tried && !!err) || !!authErr} onChangeText={t => { setEmail(t); setAuthErr(null); }} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" importantForAutofill="yes" /></Field>
        <Field label="Password" required error={tried && !pw ? 'Enter your password' : null}><PasswordInput value={pw} onChange={t => { setPw(t); setAuthErr(null); }} invalid={(tried && !pw) || !!authErr} onSubmit={go} /></Field>
        <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginTop: -4 }} hitSlop={8}><Link>Forgot password?</Link></Pressable>
      </Screen>
  );
}

/** After a normal log-in: offer Face ID / fingerprint next time (once per phone and account; nothing is stored unless they agree). */
function offerBiometric(role: string, email: string, password: string): Promise<void> {
  return new Promise(resolve => {
    (async () => {
      const kind = await biometricKind();
      const saved = kind ? await savedLogin(role) : null;
      if (!kind || (saved && saved.email === email && saved.password === password)) return resolve();
      if (saved && saved.email === email) { await saveLogin(role, email, password); return resolve(); } // password changed: keep the saved one current
      Alert.alert(`Log in with ${kind}?`, `Next time, use ${kind} instead of typing your password. Your login stays encrypted on this phone.`, [
        { text: 'Not now', style: 'cancel', onPress: () => resolve() },
        { text: 'Turn on', onPress: async () => { await saveLogin(role, email, password); resolve(); } },
      ], { onDismiss: () => resolve() });
    })().catch(() => resolve());
  });
}

/** Password reset. The API has no email/SMS delivery yet, so it returns the one-time code here
 *  and the app presents it — copy it into the reset step (same flow when you have the code from another device). */
export function ForgotPassword() {
  const { run, busy, set } = useStore();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  /** null = not tried; false = the notification couldn't be delivered, so the code may be revealed here. */
  const [pushed, setPushed] = useState<boolean | null>(null);
  const [reveal, setReveal] = useState(false);
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
      if (d.resetToken) { setToken(d.resetToken); setReveal(false); setPushed(null); setTried(false); setStep('reset'); pushCode(d.resetToken, email.trim().toLowerCase(), 'email', 'reset').then(setPushed); }
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
      <Muted style={{ fontSize: 14, lineHeight: 21, marginBottom: 12 }}>{pushed === false ? 'Notifications are off, so your reset code isn’t shown as a notification.' : 'We sent a reset code to your email as a notification. It has been filled in below. It expires in 1 hour.'}</Muted>
      {pushed === false && !reveal ? <Row style={{ justifyContent: 'center', marginBottom: 10 }}><Link onPress={() => setReveal(true)}>Show my code</Link></Row> : null}
      {pushed === false && reveal ? <Card tone="hi" style={{ paddingVertical: 10 }}><Muted style={{ fontSize: 12 }}>Your reset code (expires in 1 hour)</Muted><T style={{ fontSize: 15, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>{token}</T></Card> : null}
      <Field label="Reset code" required error={tried && !token.trim() ? 'Enter the reset code' : null}><Input value={token} invalid={tried && !token.trim()} onChangeText={setToken} placeholder="Enter the reset code" secureTextEntry={!reveal} autoCapitalize="none" autoCorrect={false} /></Field>
      <Field label="New password" required error={tried && pwErr}><PasswordInput value={pw} onChange={setPw} invalid={tried && !!pwErr} placeholder="At least 8 characters" newPassword /></Field>
      <Field label="Confirm new password" required error={tried && pw2Err}><PasswordInput value={pw2} onChange={setPw2} invalid={tried && !!pw2Err} placeholder="Re-enter your password" newPassword /></Field>
    </Screen>
  );
}

/** Change password while signed in (current password + new password). */
export function NewPassword() {
  const { run, busy, get } = useStore();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [tried, setTried] = useState(false);
  const pwErr = passwordError(pw), pw2Err = !pw2 ? 'Re-enter your password' : pw2 !== pw ? 'Passwords don’t match' : null;
  const save = async () => {
    setTried(true);
    if (!cur || pwErr || pw2Err) return;
    if (await run(() => backend.changePassword(cur, pw), 'Password changed')) {
      const me = get().api;
      if (me && (await savedLogin(me.role))?.email === me.email) await saveLogin(me.role, me.email, pw); // keep Face ID log-in working
      router.back();
    }
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
  return async () => {
    await backend.forgetPush();
    backend.logout(set);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };
}
