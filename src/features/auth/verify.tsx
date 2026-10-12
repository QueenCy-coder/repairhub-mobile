// Confirm a brand-new account: a 6-digit code goes to an email address or a phone number, and the
// person types it back. Only then can they log in — see the log-in screen for the unverified case.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Banner, Btn, C, Card, Link, Muted, Row, Screen, Segments, T, Title, mono } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { masked } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';

type Channel = 'email' | 'phone';

export function VerifyAccount() {
  const { run, busy, set } = useStore();
  const params = useLocalSearchParams<{ email?: string; phone?: string }>();
  const email = String(params.email ?? '').trim().toLowerCase();
  const phone = String(params.phone ?? '');
  const [channel, setChannel] = useState<Channel>('email');
  const [destination, setDestination] = useState(channel === 'email' ? email : masked(phone));
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const input = useRef<TextInput>(null);

  /** Ask the API for a code on the chosen channel. Without an email/SMS provider the code comes back here. */
  const send = async (ch: Channel) => {
    if (!email) return;
    const ok = await run(async () => {
      const d = await backend.sendVerificationCode(email, ch);
      if (d.verified) { set({ authMode: 'login' }); router.replace('/login'); return; }
      setDevCode(d.code ?? '');
      setSent(true); setWrong(false); setCode('');
      setDestination(ch === 'phone' ? masked(String(d.destination ?? phone)) : String(d.destination ?? email));
    });
    if (ok) setTimeout(() => input.current?.focus(), 150);
  };

  // A code goes out as soon as the screen opens, so a fresh sign-up already has one waiting.
  useEffect(() => { send('email'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async () => {
    if (code.length !== 6) { setWrong(true); input.current?.focus(); return; }
    const ok = await run(async () => { await backend.confirmVerification(email, code); }, 'Account verified · log in to continue');
    if (!ok) { setWrong(true); setCode(''); input.current?.focus(); return; }
    set({ authMode: 'login' });
    router.replace({ pathname: '/login', params: { verified: '1' } });
  };

  const digits = Array.from({ length: 6 });
  return (
    <Screen
      title="Verify your account"
      footer={
        <>
          <Btn title={busy ? 'Verifying…' : 'Verify & continue'} disabled={busy || code.length !== 6} onPress={verify} />
          <Muted style={{ textAlign: 'center', marginTop: 12 }}>
            Wrong details? <Link onPress={() => { set({ authMode: 'signup' }); router.replace('/signup'); }}>Start over</Link>
          </Muted>
        </>
      }
    >
      <Title style={{ textAlign: 'center', marginTop: 4 }}>Verify your account</Title>
      <Muted style={{ textAlign: 'center', fontSize: 14, marginBottom: 16 }}>
        We sent a 6-digit code to {channel === 'email' ? 'your email' : 'your phone'}. Enter it to confirm — then log in.
      </Muted>

      <Segments<Channel> items={[['email', 'Email'], ['phone', 'Phone']]} value={channel} onChange={ch => { if (ch !== channel) { setChannel(ch); setCode(''); setWrong(false); send(ch); } }} />

      <Banner tone="blue" icon="📨">
        <T style={{ fontSize: 14, fontWeight: '600' }}>{destination || 'your address on file'}</T>
        <Muted style={{ fontSize: 12 }}>{sent ? 'Code sent' : 'Sending code…'}</Muted>
      </Banner>

      <Pressable onPress={() => input.current?.focus()} style={{ position: 'relative', marginTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {digits.map((_, i) => {
            const at = i === code.length;
            return (
              <View key={i} style={{ flex: 1, height: 56, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: wrong ? C.bad : at ? C.primary : C.input, backgroundColor: i < code.length ? C.soft : C.paper }}>
                <T style={{ fontSize: 22, fontWeight: '700', fontFamily: mono }}>{code[i] ?? ''}</T>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={input}
          value={code}
          onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setWrong(false); }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          accessibilityLabel="Verification code"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
        />
      </Pressable>
      {wrong ? <Muted style={{ color: C.bad, fontSize: 13, marginTop: 8 }}>⚠︎ That code didn’t match. Check all 6 digits and try again.</Muted> : null}

      {devCode ? (
        <Card tone="hi" style={{ paddingVertical: 10, marginTop: 14 }}>
          <Muted style={{ fontSize: 12 }}>Your code (expires in 10 minutes)</Muted>
          <T style={{ fontSize: 20, fontWeight: '700', letterSpacing: 3, marginTop: 2 }}>{devCode}</T>
        </Card>
      ) : null}

      <Row style={{ marginTop: 16, justifyContent: 'center', gap: 20 }}>
        <Link onPress={() => send(channel)}>{busy ? 'Sending…' : 'Resend code'}</Link>
        <Link onPress={() => { set({ authMode: 'login' }); router.replace('/login'); }}>Log in instead</Link>
      </Row>

      <Muted style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        No email or SMS service is connected yet, so the code shows here — the same way password reset works for now.
      </Muted>
    </Screen>
  );
}
