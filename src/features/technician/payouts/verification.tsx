// Payout verification (KYC): BVN, live selfie, payout PIN.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { TextInput, View, Platform, Text } from 'react-native';
import { C, Demo, Bold, Btn, Chip, Chips, Muted, Thumb, Banner, Card, FadeIn, Field, Input, KV, Row, Screen, Stepper, T, Title } from '../../../shared/components/ui';
import { Media, N } from '../../../shared/core/data';
import { useStore } from '../../../shared/core/store';

export const upper = (n: string) => n.trim().toUpperCase();

/** Simulated name enquiry: the demo bank returns the technician's own name. */
export const resolveName = (techName: string) => new Promise<string>(r => setTimeout(() => r(upper(techName)), 700));

/** 4-digit PIN boxes backed by one hidden input. */
export function PinBoxes({ value, onChange, label, error, autoFocus = true }: { value: string; onChange: (v: string) => void; label: string; error?: boolean; autoFocus?: boolean }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map(i => {
          const filled = !!value[i], current = i === value.length;
          return (
            <View key={i} style={{ width: 54, height: 58, borderRadius: 12, borderWidth: current ? 2 : 1.5, borderColor: error ? C.bad : current ? C.primary : filled ? C.primaryLine : C.input, backgroundColor: filled ? C.primarySoft : '#fff', alignItems: 'center', justifyContent: 'center' }}>
              {filled ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.ink }} /> : null}
            </View>
          );
        })}
      </View>
      <TextInput value={value} onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} secureTextEntry autoFocus={autoFocus}
        accessibilityLabel={label} caretHidden style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' }} />
    </View>
  );
}

/**
 * Live selfie with liveness prompts. Uses the front camera only (no uploads): the user follows three prompts,
 * then the photo is captured automatically. A real build would send frames to a liveness/face-match provider.
 */
/** Demo-only stand-in for a live capture when no camera exists (tiny inline image, never user-uploaded). */
export const DEMO_SELFIE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#D1E0FF"/><circle cx="50" cy="40" r="18" fill="#3563E9"/><rect x="22" y="62" width="56" height="40" rx="20" fill="#3563E9"/></svg>');

export const PROMPTS = ['Look straight at the camera', 'Blink slowly', 'Turn your head slightly left'];

export function LiveSelfie({ value, onCapture, invalid }: { value: Media | null; onCapture: (m: Media | null) => void; invalid?: boolean }) {
  const [perm, requestPerm] = useCameraPermissions();
  const cam = React.useRef<CameraView>(null);
  const [ready, setReady] = React.useState(false);
  const [phase, setPhase] = React.useState<'idle' | 'checking' | 'capturing'>('idle');
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const SIZE = 220;
  // The iOS Simulator and some browsers have no usable front camera. If the camera isn't ready in a few
  // seconds (or we know this is a simulator), offer a clearly-labelled demo capture so the flow can be tested.
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setSlow(true), 3500); return () => clearTimeout(t); }, []);
  const noCamera = !Device.isDevice || slow && !ready;

  const run = async () => {
    setError(null); setPhase('checking');
    for (let i = 0; i < PROMPTS.length; i++) { setStep(i); await new Promise(r => setTimeout(r, 1500)); }
    setPhase('capturing');
    try {
      const pic = await cam.current?.takePictureAsync({ quality: 0.6 });
      if (!pic?.uri) throw new Error('no photo');
      onCapture({ uri: pic.uri, type: 'image' });
    } catch { setError('We couldn’t capture your selfie. Hold still in good light and try again.'); }
    setPhase('idle'); setStep(0);
  };

  if (value) return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden', borderWidth: 3, borderColor: C.ok }}><Thumb m={value} size={SIZE} /></View>
      <Chips><Chip tone="ok" label="✓ Live selfie captured" /><Chip tone="ok" label="✓ Matched to BVN photo" /></Chips>
      <Btn small variant="ghost" title="Retake selfie" onPress={() => onCapture(null)} />
    </View>
  );
  if (!perm) return <Muted style={{ textAlign: 'center' }}>Checking camera access…</Muted>;
  if (!perm.granted) return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: invalid ? C.bad : C.input, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft }}><Text style={{ fontSize: 48 }}>📷</Text></View>
      <Muted style={{ textAlign: 'center', marginTop: 10 }}>RepairHub needs your camera to take a live selfie. Uploaded photos aren’t accepted for identity checks.</Muted>
      {perm.canAskAgain ? <Btn title="Allow camera access" onPress={requestPerm} /> : <Btn title="Open Settings to allow camera" onPress={() => Linking.openSettings()} />}
      {Platform.OS === 'web' || !Device.isDevice ? <Demo text={Platform.OS === 'web' ? 'browser without camera access' : 'iOS Simulator has no camera'} actions={[{ label: 'Simulate live capture', onPress: () => onCapture({ uri: DEMO_SELFIE, type: 'image' }) }]} /> : null}
    </View>
  );
  const active = phase !== 'idle';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE + 16, height: SIZE + 16, borderRadius: (SIZE + 16) / 2, borderWidth: 4, borderColor: active ? C.primary : invalid ? C.bad : C.primaryLine, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden', backgroundColor: '#000' }}>
          <CameraView ref={cam} style={{ flex: 1 }} facing="front" mirror onCameraReady={() => setReady(true)} onMountError={() => setError('No camera found on this device. Use a phone with a front camera.')} />
        </View>
      </View>
      <View style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
        {phase === 'checking' ? <>
          <Bold style={{ fontSize: 16 }}>{PROMPTS[step]}</Bold>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>{PROMPTS.map((_, i) => <View key={i} style={{ width: 26, height: 5, borderRadius: 3, backgroundColor: i <= step ? C.primary : C.line }} />)}</View>
        </> : phase === 'capturing' ? <Bold>Hold still…</Bold> : <Muted style={{ textAlign: 'center' }}>Position your face inside the circle, then tap Start.</Muted>}
      </View>
      {error ? <Text style={{ color: C.bad, textAlign: 'center', marginTop: 6 }}>⚠︎ {error}</Text> : null}
      {!active ? <Btn title={ready ? 'Start live check' : error || noCamera ? 'Camera unavailable' : 'Starting camera…'} disabled={!ready} onPress={run} /> : null}
      {(error || noCamera) && !ready ? <Demo text={!Device.isDevice ? 'iOS Simulator has no front camera' : 'no camera on this device'} actions={[{ label: 'Simulate live capture', onPress: () => onCapture({ uri: DEMO_SELFIE, type: 'image' }) }]} /> : null}
    </View>
  );
}

/* ───────── Payout verification (KYC): BVN → selfie → payout PIN ───────── */

export function Kyc() {
  const { s, set, notify, toast } = useStore();
  const [step, setStep] = React.useState(0);
  const [bvn, setBvn] = React.useState('');
  const [bvnOk, setBvnOk] = React.useState<null | { name: string; dob: string }>(null);
  const [checking, setChecking] = React.useState(false);
  const [selfie, setSelfie] = React.useState<Media | null>(null);
  const [pin, setPin] = React.useState(''), [pin2, setPin2] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const back = useLocalSearchParams<{ next?: string }>().next;

  if (s.kyc === 'verified') return (
    <Screen title="Payout verification" footer={back ? <Btn title="Continue" onPress={() => router.replace(back as never)} /> : undefined}>
      <Banner tone="ok" icon="✓"><Bold style={{ fontSize: 14 }}>You’re verified for payouts</Bold><T style={{ fontSize: 13, color: C.text }}>BVN ••••••{s.bvnLast4} · selfie matched · payout PIN set</T></Banner>
      <Card><KV k="Daily withdrawal limit" v={N(500000)} /><KV k="Per withdrawal" v={N(200000)} /><KV k="Verified name" v={upper(s.techName)} /></Card>
      <Muted>Your BVN is only used to confirm your identity (CBN KYC rules). RepairHub never sees your bank balance.</Muted>
    </Screen>
  );

  const steps = ['BVN', 'Selfie', 'PIN'];
  const verifyBvn = async () => {
    if (bvn.length !== 11) { setTried(true); return; }
    setChecking(true);
    await new Promise(r => setTimeout(r, 800));
    setChecking(false); setBvnOk({ name: upper(s.techName), dob: '14 Mar 1992' }); setTried(false);
  };
  const finish = () => {
    if (pin.length !== 4 || pin !== pin2 || /^(\d)\1{3}$/.test(pin) || pin === '1234') { setTried(true); return; }
    set({ kyc: 'verified', bvnLast4: bvn.slice(-4), pin });
    notify('Payout verification complete', 'You can now withdraw your earnings.', '/earnings', 'technician');
    toast('Verified for payouts');
    router.replace((back || '/earnings') as never);
  };
  const pinErr = pin.length !== 4 ? 'Enter 4 digits' : /^(\d)\1{3}$/.test(pin) || pin === '1234' ? 'Choose a PIN that’s harder to guess' : pin !== pin2 ? 'The two PINs don’t match' : null;

  return (
    <Screen title="Payout verification" footer={
      step === 0 ? (bvnOk ? <Btn title="Continue" onPress={() => setStep(1)} /> : <Btn title={checking ? 'Checking…' : 'Verify BVN'} disabled={checking} onPress={verifyBvn} />)
        : step === 1 ? <Btn title="Continue" onPress={() => selfie ? setStep(2) : setTried(true)} />
          : <Btn title="Finish verification" onPress={finish} />}>
      <Muted>Required once before your first withdrawal (CBN KYC).</Muted>
      <Stepper steps={steps} current={step} />

      {step === 0 ? <>
        <Title style={{ fontSize: 18 }}>Confirm your BVN</Title>
        <Muted style={{ marginBottom: 12 }}>We check that the name on your BVN matches your verified ID. Dial *565*0# to get your BVN.</Muted>
        <Field label="Bank Verification Number (BVN)" required error={tried && bvn.length !== 11 ? 'BVN must be exactly 11 digits' : null}>
          <Input invalid={tried && bvn.length !== 11} value={bvn} onChangeText={t => { setBvn(t.replace(/\D/g, '').slice(0, 11)); setBvnOk(null); }} keyboardType="number-pad" placeholder="11 digits" maxLength={11} />
          <Muted style={{ marginTop: 4 }}>{bvn.length}/11</Muted>
        </Field>
        {bvnOk ? <Card tone="blue"><Row style={{ justifyContent: 'flex-start', gap: 10 }}><Text style={{ color: C.ok, fontSize: 18 }}>✓</Text><View style={{ flex: 1 }}><Bold style={{ fontSize: 14 }}>BVN matched</Bold><Muted>{bvnOk.name} · born {bvnOk.dob}</Muted><Muted>Matches your verified ID</Muted></View></Row></Card> : null}
      </> : null}

      {step === 1 ? <>
        <Title style={{ fontSize: 18 }}>Take a live selfie</Title>
        <Muted style={{ marginBottom: 12 }}>We compare it with your BVN photo. Face the camera in good light, without glasses or a cap. Uploaded photos aren’t accepted.</Muted>
        <LiveSelfie value={selfie} onCapture={m => { setSelfie(m); setTried(false); }} invalid={tried && !selfie} />
        {tried && !selfie ? <Text style={{ color: C.bad, textAlign: 'center', marginTop: 8 }}>⚠︎ Complete the live selfie to continue</Text> : null}
      </> : null}

      {step === 2 ? <>
        <Title style={{ fontSize: 18 }}>Create a payout PIN</Title>
        <Muted style={{ marginBottom: 16 }}>You’ll enter this PIN to approve every withdrawal and any change to your payout account.</Muted>
        {/* One PIN at a time: enter the new PIN first, then confirm it. */}
        <T style={{ fontWeight: '600', marginBottom: 8 }}>New PIN</T>
        <PinBoxes key="new" value={pin} onChange={v => { setPin(v); if (v.length < 4) setPin2(''); }} label="New 4-digit PIN" />
        {pin.length === 4 ? <FadeIn>
          <T style={{ fontWeight: '600', marginTop: 18, marginBottom: 8 }}>Confirm PIN</T>
          <PinBoxes key="confirm" value={pin2} onChange={setPin2} label="Confirm PIN" />
        </FadeIn> : <Muted style={{ textAlign: 'center', marginTop: 14 }}>Enter 4 digits, then confirm them.</Muted>}
        {tried && pinErr ? <Text style={{ color: C.bad, textAlign: 'center', marginTop: 10 }}>⚠︎ {pinErr}</Text> : null}
      </> : null}
    </Screen>
  );
}

/* ───────── Payout account: bank + NUBAN + name enquiry (must match verified name) ───────── */
