// Create account (RepairHub API): name, email, phone, password. The account is ready straight away.
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Btn, C, Field, Input, Link, Muted, Opt, Screen } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { passwordError } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { Name, NameFields, PasswordInput, PhoneInput, joinName, nameErrors, phoneError } from './fields';
import { enterApp } from './session';

export const emailError = (e: string) => !e.trim() ? 'Enter your email address' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? 'Enter a valid email address' : null;

export function Signup() {
  const { s, set, get, toast, run, busy } = useStore();
  const isTech = s.signupRole === 'technician';
  // A new account starts blank: the user types every field and ticks the terms themselves.
  const [name, setName] = useState<Name>({ first: '', middle: '', last: '' });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const phoneErr = phoneError(phone);
  const emailErr = emailError(email);
  const pwErr = passwordError(pw);
  const pw2Err = !pw2 ? 'Re-enter your password' : pw2 !== pw ? 'Passwords don’t match' : null;
  const next = async () => {
    setTried(true);
    if (nameErrors(name)) return toast('Check your name — first and last name are required');
    if (phoneErr || emailErr || pwErr || pw2Err) return toast('Please fix the fields marked in red');
    if (!agree) return toast('Please accept the Terms & Conditions');
    const role = s.signupRole;
    const ok = await run(async () => {
      await backend.register({ role, fullName: joinName(name), email, phone, password: pw }, set);
      await backend.refresh(get, set);
    });
    if (!ok) return;
    toast('Account created · welcome to RepairHub');
    // New customers set up their profile; new technicians register their skills and ID for verification.
    enterApp(role === 'technician' ? '/tech-register' : '/cust-setup');
  };
  return (
      <Screen title="Create your account" footer={<Btn title={busy ? 'Creating account…' : 'Create Account'} disabled={busy} onPress={next} />}>
        <Muted style={{ textAlign: 'center', fontSize: 14, marginBottom: 18 }}>Let’s get you started. Enter your details to create your {isTech ? 'technician ' : ''}account.</Muted>
        <NameFields value={name} onChange={setName} showErrors={tried} hint={isTech ? 'Use the name on your government ID — we check it during verification.' : undefined} />
        <Field label="Email address" required error={tried && emailErr}><Input icon="✉︎" value={email} invalid={tried && !!emailErr} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" /></Field>
        <Field label="Phone number" required error={tried && phoneErr}><PhoneInput value={phone} onChange={setPhone} invalid={tried && !!phoneErr} /></Field>
        <Field label="Create password" required error={tried && pwErr}><PasswordInput value={pw} onChange={setPw} invalid={tried && !!pwErr} placeholder="At least 8 characters" newPassword /></Field>
        {!(tried && pwErr) ? <Muted style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>At least 8 characters, with letters and a number.</Muted> : null}
        <Field label="Confirm password" required error={tried && pw2Err}><PasswordInput value={pw2} onChange={setPw2} invalid={tried && !!pw2Err} placeholder="Re-enter your password" newPassword /></Field>
        <Opt check on={agree} onPress={() => setAgree(!agree)} label="I agree to the Terms & Conditions and Privacy Policy" />
        {tried && !agree ? <Text style={{ color: C.bad, fontSize: 13, marginTop: -2, marginBottom: 6 }}>⚠︎ Tick the box to accept the Terms & Conditions</Text> : null}
        <Muted style={{ textAlign: 'center', marginTop: 10 }}>Already have an account? <Link onPress={() => { set({ authMode: 'login' }); router.replace('/login'); }}>Log In</Link></Muted>
      </Screen>
  );
}
