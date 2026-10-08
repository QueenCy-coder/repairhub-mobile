// Technician registration and verification status.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Text, View, Pressable } from 'react-native';
import { Bold, Btn, C, Card, Chip, Chips, Field, H4, Input, MediaGrid, Muted, Opt, Row, Screen, T, Avatar, StatusPill, Banner, FadeIn, Link } from '../../shared/components/ui';
import * as backend from '../../shared/core/backend';
import { LIVE_CATEGORIES, LAGOS_AREAS } from '../../shared/core/data';
import { askNotifications, pickMedia, call } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { NameFields, joinName, nameErrors, splitName } from '../auth/fields';

export function TechRegister() {
  const { s, set, get, notify, run, busy } = useStore();
  const [idType, setIdType] = React.useState('NIN slip');
  const [ids, setIds] = React.useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [cert, setCert] = React.useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [radius, setRadius] = React.useState(10);
  const [name, setName] = React.useState(() => splitName(s.techName));
  const [tried, setTried] = React.useState(false);
  const submit = async () => {
    setTried(true);
    if (nameErrors(name)) return Alert.alert('Check your name', 'Enter your first and last name exactly as they appear on your ID. Middle name is optional.');
    if (!s.skills.length) return Alert.alert('Choose at least one repair skill');
    if (!s.areas.length) return Alert.alert('Choose at least one service area');
    const missing = [!ids.length && 'a government ID', !cert.length && 'at least one certificate'].filter(Boolean);
    if (missing.length) return Alert.alert('Documents required', `Please add ${missing.join(' and ')} so we can verify you.`);
    const full = joinName(name);
    const ok = await run(async () => {
      if (full !== s.techName) { await backend.updateMe({ fullName: full }, set, get); set({ techName: full }); }
      await backend.saveTechProfile(get, set, { skills: s.skills, areas: s.areas });
      await backend.submitVerification(get, set, [...ids, ...cert]);
    });
    if (!ok) return;
    askNotifications(); // so the technician hears about verification and new jobs
    notify('Application submitted', 'RepairHub’s team will review your documents.', '/verification', 'technician');
    router.replace('/tech-home');
  };
  return (
    <Screen title="Service profile" back={false} footer={<Btn title={busy ? 'Uploading…' : 'Submit for verification'} disabled={busy} onPress={submit} />}>
      <Muted style={{ marginBottom: 12 }}>Set up your profile so customers can find and trust you. It takes about 3 minutes.</Muted>
      <H4>1 · Personal details</H4>
      <NameFields value={name} onChange={setName} showErrors={tried} hint="Must match your government ID exactly." />
      <Field label="Phone"><Input value={`+234 ${s.techPhone}   ✓ verified`} editable={false} /></Field>
      <H4>2 · Services & skills</H4>
      <Card><Row><Bold>Electronics</Bold><Chip tone="ok" label="Live in Lagos" /></Row>
        <View style={{ marginTop: 8 }}>{LIVE_CATEGORIES.map(k => <Opt key={k} check label={k} on={s.skills.includes(k)} onPress={() => set(p => ({ skills: p.skills.includes(k) ? p.skills.filter(x => x !== k) : [...p.skills, k] }))} />)}</View>
        <Muted>Home appliances, home services and furniture open later. You can add them when they launch.</Muted>
      </Card>
      <H4>3 · Service area</H4>
      <Muted style={{ marginBottom: 8 }}>Where do you take jobs? Pick at least one area — you can change this later.</Muted>
      <Chips>{LAGOS_AREAS.slice(0, 10).map(a => <Chip key={a} label={s.areas.includes(a) ? `✓ ${a}` : a} tone={s.areas.includes(a) ? 'on' : undefined} onPress={() => set(p => ({ areas: p.areas.includes(a) ? p.areas.filter(x => x !== a) : [...p.areas, a] }))} />)}</Chips>
      {tried && !s.areas.length ? <Text style={{ color: C.bad, marginTop: 6 }}>⚠︎ Add at least one area</Text> : null}
      <Muted style={{ marginTop: 12, marginBottom: 6 }}>Travel radius for home service{s.areas[0] ? ` from ${s.areas[0]}` : ''}</Muted>
      <Chips>{[5, 10, 15].map(r => <Chip key={r} label={`${r} km`} tone={radius === r ? 'on' : undefined} onPress={() => setRadius(r)} />)}</Chips>
      <H4>4 · Documents</H4>
      <Field label="Government ID" required>
        <Chips>{['NIN slip', 'Driver’s licence', 'Voter’s card', 'Passport'].map(t => <Chip key={t} label={t} tone={idType === t ? 'on' : undefined} onPress={() => setIdType(t)} />)}</Chips>
        <MediaGrid items={ids} max={2} addLabel="Front / back" onAdd={async () => setIds([...ids, ...await pickMedia({ limit: 2 - ids.length, allowVideo: false })])} onRemove={i => setIds(ids.filter((_, j) => j !== i))} />
      </Field>
      <Field label="Certificate (at least one)" required>
        <MediaGrid items={cert} max={3} addLabel="Add" onAdd={async () => setCert([...cert, ...await pickMedia({ limit: 3 - cert.length, allowVideo: false })])} onRemove={i => setCert(cert.filter((_, j) => j !== i))} />
        <Muted style={{ marginTop: 6 }}>JPG, PNG or PDF, up to 5 MB each.</Muted>
      </Field>
    </Screen>
  );
}

/* ───────── T-02 Verification status (Figma) ───────── */

export function Verification() {
  const { s, set, get, run } = useStore();
  const v = s.techVerif;
  const docs = v === 'verified' ? 'done' : v === 'rejected' ? 'bad' : 'review';
  const rows: [string, string, 'done' | 'review' | 'bad'][] = [
    ['Personal details', 'Submitted successfully', 'done'],
    ['Services & skills', 'Submitted successfully', 'done'],
    ['Service area', 'Submitted successfully', 'done'],
    ['Documents verification', v === 'verified' ? 'Approved' : v === 'rejected' ? (s.rejectNote || 'Please upload clearer documents') : 'In review\nOur team is checking your ID and certificates.', docs],
  ];
  const pill = (st: 'done' | 'review' | 'bad') => st === 'done' ? <StatusPill tone="ok" label="Completed" /> : st === 'bad' ? <StatusPill tone="bad" label="Action needed" /> : <StatusPill tone="warn" label="In review" />;
  return (
    <Screen title="Verification status" back footer={<>
      {v === 'verified' ? <Btn title="Go to dashboard" onPress={() => router.replace('/tech-home')} /> : <Btn title="Go to profile" onPress={() => router.replace('/me')} />}
      <Pressable onPress={() => call('+2348000000000')} style={{ alignItems: 'center', marginTop: 12 }}><Link>Contact support</Link></Pressable>
    </>}>
      <FadeIn>
        <View style={{ backgroundColor: C.primarySoft, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar label={s.techName} size={64} uri={s.techPhoto} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{s.techName}</T>
            <Muted style={{ fontSize: 13 }}>Technician application</Muted>
            <Muted style={{ fontSize: 12 }}>Submitted on {new Date(s.techSubmittedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</Muted>
          </View>
          {v === 'verified' ? <StatusPill tone="ok" label="Verified" /> : v === 'rejected' ? <StatusPill tone="bad" label="Fix needed" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3E2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}><Ionicons name="time-outline" size={15} color="#F79009" /><Text style={{ color: '#B54708', fontWeight: '700', fontSize: 12 }}>In review</Text></View>
          )}
        </View>
      </FadeIn>
      {v === 'rejected' ? <Banner tone="bad" icon="!"><Bold style={{ fontSize: 14 }}>Please fix your documents</Bold><T style={{ fontSize: 13, color: C.text }}>{s.rejectNote}</T></Banner> : null}
      <H4>Application progress</H4>
      <Muted style={{ marginTop: -6, marginBottom: 10 }}>{v === 'verified' ? 'All checks passed — you can now quote on jobs.' : 'We’ll notify you once your account is verified.'}</Muted>
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden' }}>
        {rows.map(([label, sub, st], i) => (
          <FadeIn key={label} delay={i * 70}>
            <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: C.line, backgroundColor: '#fff' }}>
              <View style={{ alignItems: 'center' }}>
                {st === 'done' ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={18} color="#fff" /></View>
                  : st === 'bad' ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.badBg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="alert" size={18} color={C.bad} /></View>
                  : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="time-outline" size={22} color="#F79009" /></View>}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 15, fontWeight: '700' }}>{label}</T>
                <Muted style={{ fontSize: 13 }}>{sub}</Muted>
              </View>
              {pill(st)}
            </View>
          </FadeIn>
        ))}
      </View>
      {v === 'rejected' ? <Btn title="Upload a new ID photo & resubmit" onPress={async () => { const m = await pickMedia({ limit: 2, allowVideo: false }); if (m.length) await run(() => backend.submitVerification(get, set, m), 'Resubmitted · back in review'); }} /> : null}
      {v !== 'verified' ? (
        <FadeIn delay={300}>
          <View style={{ marginTop: 14, borderRadius: 16, padding: 16, backgroundColor: C.primarySoft, flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>i</Text></View>
            <View style={{ flex: 1, gap: 6 }}>
              <T style={{ fontSize: 15, fontWeight: '700' }}>What happens next?</T>
              {['We’ll review your information and documents.', 'You’ll get a notification once your account is verified.', 'You can still explore the app while you wait.'].map(t => (
                <Row key={t} style={{ justifyContent: 'flex-start', alignItems: 'flex-start', gap: 8 }}><Ionicons name="checkmark-circle" size={18} color={C.primary} /><T style={{ fontSize: 13, color: C.text, flex: 1 }}>{t}</T></Row>
              ))}
            </View>
          </View>
        </FadeIn>
      ) : null}
    </Screen>
  );
}

/* ───────── T-03 Home (Figma: under review / dashboard) ───────── */
